/**
 * Deterministic Heuristic Fallback Reviewer
 * Runs when the AI provider is unavailable, unconfigured, or encounters an API error.
 * Uses pattern matching and policy cross-referencing without fabricating AI hallucination.
 */
export function runHeuristicFallbackReview(listing, relevantPolicies) {
  const findings = [];
  const suggestedRevisions = {};

  const title = (listing.title || '').trim();
  const description = (listing.description || '').trim();
  const textCorpus = `${title} ${description}`.toLowerCase();

  // Find relevant policies for citation mapping
  const findPolicy = (keyword) =>
    relevantPolicies.find(
      (p) =>
        p.sectionId.toLowerCase().includes(keyword.toLowerCase()) ||
        p.title.toLowerCase().includes(keyword.toLowerCase()) ||
        p.category.toLowerCase().includes(keyword.toLowerCase())
    ) || null;

  const prohibitedPolicy = findPolicy('proh') || findPolicy('safety');
  const claimPolicy = findPolicy('claim') || findPolicy('warrant');
  const brandTonePolicy = findPolicy('brand') || findPolicy('tone') || findPolicy('style');

  // 1. Prohibited / Restricted Goods Patterns
  const prohibitedPatterns = [
    { regex: /\b(replica|knockoff|fake|counterfeit|unauthorized copy)\b/i, name: 'Counterfeit / Replica Good', severity: 'Critical' },
    { regex: /\b(prescription only|controlled substance|unregulated pharmaceutical|cannabis extract)\b/i, name: 'Restricted Medical Product', severity: 'Critical' },
    { regex: /\b(assault weapon|firearm part|explosive|ghost gun)\b/i, name: 'Restricted Weapon / Hazardous Material', severity: 'Critical' },
  ];

  for (const pat of prohibitedPatterns) {
    if (pat.regex.test(title) || pat.regex.test(description)) {
      const match = textCorpus.match(pat.regex);
      findings.push({
        field: pat.regex.test(title) ? 'title' : 'description',
        issueCategory: 'POLICY_VIOLATION',
        description: `Potential prohibited item indicator detected: term '${match ? match[0] : pat.name}' identified.`,
        severity: pat.severity,
        policySectionId: prohibitedPolicy ? prohibitedPolicy.sectionId : null,
        policyTitle: prohibitedPolicy ? prohibitedPolicy.title : null,
        policyExcerpt: prohibitedPolicy ? prohibitedPolicy.content.slice(0, 150) + '...' : null,
        explanation: `Marketplace policies prohibit listings containing keywords associated with ${pat.name}. Immediate compliance review required.`,
        suggestedRevision: 'Remove prohibited item references or cancel this unauthorized listing.',
        confidence: 'High',
        isUnverified: !prohibitedPolicy,
      });
    }
  }

  // 2. Unsubstantiated Health / Financial Claims
  const misleadingClaimPatterns = [
    { regex: /\b(100%\s*(cure|heal|prevent)|miracle\s*(cure|treatment)|cures\s*(cancer|diabetes|covid))\b/i, name: 'Unsubstantiated Medical Claim', severity: 'Critical' },
    { regex: /\b(guaranteed\s*(wealth|income|profit|millions)|get\s*rich\s*quick|100%\s*risk[- ]free\s*return)\b/i, name: 'Misleading Financial Guarantee', severity: 'High' },
    { regex: /\b(f\.?d\.?a\.?\s*approved|clinically\s*proven\s*to\s*reverse)\b/i, name: 'Unverified Regulatory Certification', severity: 'High' },
  ];

  for (const pat of misleadingClaimPatterns) {
    if (pat.regex.test(title) || pat.regex.test(description)) {
      const match = (title + ' ' + description).match(pat.regex);
      findings.push({
        field: pat.regex.test(title) ? 'title' : 'description',
        issueCategory: 'MISLEADING_CLAIM',
        description: `Unsubstantiated absolute claim identified: '${match ? match[0] : pat.name}'.`,
        severity: pat.severity,
        policySectionId: claimPolicy ? claimPolicy.sectionId : null,
        policyTitle: claimPolicy ? claimPolicy.title : null,
        policyExcerpt: claimPolicy ? claimPolicy.content.slice(0, 150) + '...' : null,
        explanation: 'Sellers may not make absolute medical, health, or financial guarantee claims without verified certification on file.',
        suggestedRevision: 'Remove absolute guarantee words like "100% cure" or "guaranteed wealth" and describe measurable product features accurately.',
        confidence: 'High',
        isUnverified: !claimPolicy,
      });
    }
  }

  // 3. Brand Tone: All-caps screaming in Title
  const uppercaseLetters = (title.match(/[A-Z]/g) || []).length;
  const totalLetters = (title.match(/[a-zA-Z]/g) || []).length;
  if (totalLetters > 10 && uppercaseLetters / totalLetters > 0.65) {
    findings.push({
      field: 'title',
      issueCategory: 'BRAND_TONE',
      description: 'Title contains excessive capitalization (shouting/all-caps).',
      severity: 'Medium',
      policySectionId: brandTonePolicy ? brandTonePolicy.sectionId : null,
      policyTitle: brandTonePolicy ? brandTonePolicy.title : null,
      policyExcerpt: brandTonePolicy ? brandTonePolicy.content.slice(0, 150) + '...' : null,
      explanation: 'Brand guidelines require standard title casing (e.g. "Apple iPhone 15 Pro - 256GB") rather than ALL CAPS, which degrades platform trust.',
      suggestedRevision: toTitleCase(title),
      confidence: 'High',
      isUnverified: !brandTonePolicy,
    });
    suggestedRevisions.title = toTitleCase(title);
  }

  // 4. Excessive Punctuation / Hype words in Title or Description
  if (/(!{2,}|\?{2,}|\${2,}|###|🔥🔥🔥|⚡⚡⚡)/.test(title)) {
    findings.push({
      field: 'title',
      issueCategory: 'BRAND_TONE',
      description: 'Title contains excessive punctuation, symbols, or promotional hype emojis.',
      severity: 'Low',
      policySectionId: brandTonePolicy ? brandTonePolicy.sectionId : null,
      policyTitle: brandTonePolicy ? brandTonePolicy.title : null,
      policyExcerpt: brandTonePolicy ? brandTonePolicy.content.slice(0, 150) + '...' : null,
      explanation: 'Marketplace style guide strictly prohibits clickbait symbols, repeated exclamation marks, and emoji clutter in product titles.',
      suggestedRevision: cleanHypePunctuation(title),
      confidence: 'High',
      isUnverified: !brandTonePolicy,
    });
    if (!suggestedRevisions.title) {
      suggestedRevisions.title = cleanHypePunctuation(title);
    }
  }

  // 5. Unverifiable Assumptions
  if (/\b(best in the world|#1 on earth|unbeatable lowest price guaranteed forever)\b/i.test(textCorpus)) {
    findings.push({
      field: 'description',
      issueCategory: 'UNVERIFIABLE_ASSUMPTION',
      description: 'Listing uses unverifiable superlative marketing claims without external benchmark citations.',
      severity: 'Medium',
      policySectionId: claimPolicy ? claimPolicy.sectionId : null,
      policyTitle: claimPolicy ? claimPolicy.title : null,
      policyExcerpt: claimPolicy ? claimPolicy.content.slice(0, 150) + '...' : null,
      explanation: 'Claims asserting universal supremacy or permanent lowest prices are inherently unverifiable by consumers.',
      suggestedRevision: 'State specific manufacturer features, lab ratings, or award names with the conferring organization and year.',
      confidence: 'Medium',
      isUnverified: !claimPolicy,
    });
  }

  // Clean description if revisions were suggested
  if (findings.some((f) => f.field === 'description' && f.issueCategory === 'MISLEADING_CLAIM')) {
    let cleanDesc = description;
    cleanDesc = cleanDesc.replace(/\b100%\s*(cure|heal|prevent)\b/gi, 'support wellness');
    cleanDesc = cleanDesc.replace(/\bmiracle\s*(cure|treatment)\b/gi, 'formulated care');
    cleanDesc = cleanDesc.replace(/\bguaranteed\s*(wealth|millions)\b/gi, 'educational guidance');
    suggestedRevisions.description = cleanDesc;
  }

  return {
    findings,
    suggestedRevisions,
    summary: `Heuristic fallback rule engine completed analysis with ${findings.length} findings. (AI provider unavailable; deterministic pattern-matching was used).`,
  };
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function cleanHypePunctuation(str) {
  return str
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}
