import { Listing } from '../models/Listing.js';
import { Review } from '../models/Review.js';
import { runDeterministicValidation } from './validation/deterministicValidator.js';
import { retrieveRelevantPolicies } from './policy/policyRetriever.js';
import { executeAiReview } from './ai/aiProvider.js';
import { logAuditEvent } from './audit/auditLogger.js';

/**
 * Orchestrates full 12-step quality review workflow for a listing.
 */
export async function orchestrateListingReview(listingId, user) {
  const startTime = Date.now();

  // Step 1: Receive the listing and validate its structure
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new Error(`Listing with ID '${listingId}' not found.`);
  }

  // Preserve initial snapshot of listing at review time
  const originalSnapshot = {
    title: listing.title,
    description: listing.description,
    category: listing.category,
    price: listing.price,
    currency: listing.currency,
    attributes: listing.attributes instanceof Map ? Object.fromEntries(listing.attributes) : listing.attributes,
    seller: listing.seller,
    tags: [...(listing.tags || [])],
    status: listing.status,
  };

  // Step 2: Run deterministic validation and preserve its results
  const deterministicFindings = await runDeterministicValidation(listing, listing._id);

  // Step 3: Retrieve relevant marketplace policy and brand-writing guidance
  const relevantPolicies = await retrieveRelevantPolicies(listing);

  // Snapshot the policies used for this review
  const policyVersionSnapshot = relevantPolicies.map((p) => ({
    sectionId: p.sectionId,
    title: p.title,
    category: p.category,
    version: p.version,
  }));

  // Step 4 to 8: Send listing and relevant policy excerpts to configured LLM (or fallback)
  const aiResult = await executeAiReview(listing, relevantPolicies);

  // Step 9: Merge deterministic and AI findings
  const mergedFindings = [
    ...deterministicFindings,
    ...aiResult.findings,
  ];

  // Enrich findings with standard issueTitle, affectedField, originalExcerpt, confidenceScore
  const enrichedFindings = mergedFindings.map((f) => ({
    ...f,
    affectedField: f.affectedField || f.field,
    issueTitle: f.issueTitle || `${(f.issueCategory || 'Policy Issue').replace(/_/g, ' ')} on ${f.field}`,
    originalExcerpt: f.originalExcerpt || (listing[f.field] ? String(listing[f.field]).slice(0, 160) : null),
    confidenceScore:
      f.confidenceScore !== undefined
        ? f.confidenceScore
        : f.confidence === 'High'
        ? 0.95
        : f.confidence === 'Medium'
        ? 0.8
        : 0.65,
  }));

  // Combine suggested revisions
  const finalSuggestedRevisions = { ...(aiResult.suggestedRevisions || {}) };

  // Calculate overall proposed status
  const hasCritical = enrichedFindings.some((f) => f.severity === 'Critical');
  const hasHighOrMedium = enrichedFindings.some((f) => f.severity === 'High' || f.severity === 'Medium');

  let proposedStatus = 'Approved';
  if (hasCritical) {
    proposedStatus = 'Changes Requested';
  } else if (hasHighOrMedium || enrichedFindings.length > 0) {
    proposedStatus = 'Changes Requested';
  }

  const turnaroundSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  // Step 11: Save review result and create immutable Review record
  const review = await Review.create({
    listingId: listing._id,
    originalSnapshot,
    findings: enrichedFindings,
    suggestedRevisions: finalSuggestedRevisions,
    overallStatus: proposedStatus,
    providerMetadata: aiResult.providerMetadata,
    policyVersionSnapshot,
    createdBy: user._id,
    startedAt: new Date(startTime),
    completedAt: new Date(),
    turnaroundSeconds,
  });

  // Update listing review pointer and status
  const previousStatus = listing.status;
  listing.latestReviewId = review._id;
  listing.status = proposedStatus;
  await listing.save();

  // Log Audit Event
  await logAuditEvent({
    listingId: listing._id,
    reviewId: review._id,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'REVIEW_GENERATED',
    before: { status: previousStatus },
    after: { status: proposedStatus, reviewId: review._id, findingsCount: enrichedFindings.length },
    metadata: {
      provider: aiResult.providerMetadata?.provider,
      fallbackUsed: aiResult.providerMetadata?.fallbackUsed,
      policyCount: policyVersionSnapshot.length,
      criticalFindings: enrichedFindings.filter((f) => f.severity === 'Critical').length,
      turnaroundSeconds,
    },
  });

  return review;
}
