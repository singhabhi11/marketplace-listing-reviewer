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
  // AI Provider validates structured JSON output and verifies policy citations against retrieved policies
  const aiResult = await executeAiReview(listing, relevantPolicies);

  // Step 9: Merge deterministic and AI findings without silently deleting disagreements
  const mergedFindings = [
    ...deterministicFindings,
    ...aiResult.findings,
  ];

  // Combine suggested revisions
  const finalSuggestedRevisions = { ...(aiResult.suggestedRevisions || {}) };

  // Calculate overall proposed status
  const hasCritical = mergedFindings.some((f) => f.severity === 'Critical');
  const hasHighOrMedium = mergedFindings.some((f) => f.severity === 'High' || f.severity === 'Medium');

  let proposedStatus = 'Approved';
  if (hasCritical) {
    proposedStatus = 'Changes Suggested';
  } else if (hasHighOrMedium || mergedFindings.length > 0) {
    proposedStatus = 'Changes Suggested';
  }

  // Step 11: Save review result and create immutable Review record
  const review = await Review.create({
    listingId: listing._id,
    originalSnapshot,
    findings: mergedFindings,
    suggestedRevisions: finalSuggestedRevisions,
    overallStatus: proposedStatus,
    providerMetadata: aiResult.providerMetadata,
    policyVersionSnapshot,
    createdBy: user._id,
  });

  // Update listing review pointer and status to 'Changes Suggested' or 'Pending Review'
  // Note: NEVER automatically apply revised wording to the listing fields!
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
    after: { status: proposedStatus, reviewId: review._id, findingsCount: mergedFindings.length },
    metadata: {
      provider: aiResult.providerMetadata?.provider,
      fallbackUsed: aiResult.providerMetadata?.fallbackUsed,
      policyCount: policyVersionSnapshot.length,
      criticalFindings: mergedFindings.filter((f) => f.severity === 'Critical').length,
    },
  });

  return review;
}
