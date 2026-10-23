import { PolicySection } from '../../models/PolicySection.js';

/**
 * Tokenize and normalize text into clean words.
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Retrieve active policy and brand guidance sections relevant to a listing.
 * Implements a hybrid matching strategy combining category matching and keyword relevance scoring.
 */
export async function retrieveRelevantPolicies(listing, maxResults = 8) {
  // Query all active policy sections
  const activeSections = await PolicySection.find({ active: true }).lean();

  if (!activeSections || activeSections.length === 0) {
    return [];
  }

  const listingTitleTokens = tokenize(listing.title);
  const listingDescTokens = tokenize(listing.description);
  const listingCategory = (listing.category || '').toLowerCase().trim();
  const listingTags = Array.isArray(listing.tags)
    ? listing.tags.map((t) => t.toLowerCase().trim())
    : [];

  const scoredSections = activeSections.map((sec) => {
    let score = 0;
    const secCategory = (sec.category || '').toLowerCase().trim();
    const secTitleTokens = tokenize(sec.title);
    const secContentTokens = tokenize(sec.content);

    // 1. Category Alignment Boost
    if (secCategory === 'general' || secCategory === 'all' || secCategory === 'global') {
      score += 1.5; // Baseline inclusion for universal policies (prohibited items, core brand tone)
    } else if (secCategory.includes(listingCategory) || listingCategory.includes(secCategory)) {
      score += 5.0; // Strong match for category-specific regulations
    }

    // 2. Title Keyword Matches (higher signal)
    const titleTokenSet = new Set(secTitleTokens);
    for (const t of listingTitleTokens) {
      if (titleTokenSet.has(t)) score += 2.0;
    }

    // 3. Description Keyword Matches against policy content
    const contentTokenSet = new Set(secContentTokens);
    for (const t of listingTitleTokens) {
      if (contentTokenSet.has(t)) score += 1.0;
    }
    for (const t of listingTags) {
      if (titleTokenSet.has(t)) score += 2.0;
      if (contentTokenSet.has(t)) score += 1.0;
    }
    for (const t of listingDescTokens) {
      if (titleTokenSet.has(t)) score += 0.8;
      if (contentTokenSet.has(t)) score += 0.2;
    }

    // 4. Critical Policy Bias (Always evaluate prohibited items, guarantees, and medical claims)
    const lowerSecId = sec.sectionId.toLowerCase();
    if (lowerSecId.includes('proh') || lowerSecId.includes('claim') || lowerSecId.includes('safety')) {
      score += 2.0;
    }

    return {
      sectionId: sec.sectionId,
      title: sec.title,
      category: sec.category,
      content: sec.content,
      version: sec.version,
      relevanceScore: Math.round(score * 10) / 10,
    };
  });

  // Sort descending by relevance score and take top candidates
  scoredSections.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return top results (at least min 3 if available, up to maxResults)
  return scoredSections.slice(0, maxResults);
}

/**
 * Validate that an AI-cited sectionId matches an actual active policy section.
 * If not present in verifiedPolicies, return null or false.
 */
export function verifyPolicyCitation(citedSectionId, verifiedPolicies) {
  if (!citedSectionId || typeof citedSectionId !== 'string') return null;
  const normalizedCited = citedSectionId.trim().toUpperCase();
  const matched = verifiedPolicies.find(
    (p) => p.sectionId.toUpperCase() === normalizedCited
  );
  return matched || null;
}
