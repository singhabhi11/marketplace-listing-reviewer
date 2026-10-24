import { Listing } from '../../models/Listing.js';
import { Setting } from '../../models/Setting.js';
import { calculateListingSimilarity } from '../../utils/similarity.js';
import { validateAttributePairs, formatAttributesText } from '../../utils/attributeNormalizer.js';

/**
 * Deterministic Validation Service
 * Evaluates listing data against deterministic thresholds, format rules, and database duplicates.
 */
export async function runDeterministicValidation(listingData, currentListingId = null) {
  const settings = await Setting.getEffectiveSettings();
  const thresholds = settings.validationThresholds;
  const supportedCategories = settings.supportedCategories || [];

  const findings = [];

  const title = (listingData.title || '').trim();
  const description = (listingData.description || '').trim();
  const category = (listingData.category || '').trim();
  const price = listingData.price;
  const currency = (listingData.currency || 'USD').trim().toUpperCase();
  const seller = (listingData.seller || '').trim();
  const attributes = listingData.attributes;
  const tags = listingData.tags;

  // 1. Required Fields Check
  if (!title) {
    findings.push({
      field: 'title',
      issueCategory: 'REQUIRED_FIELD',
      ruleId: 'RULE_REQ_TITLE',
      severity: 'Critical',
      description: 'Listing title is missing or empty.',
      explanation: 'Every listing requires a descriptive title to inform marketplace buyers.',
      recommendedCorrection: 'Provide a clear, specific title including brand, product name, and key model identifier.',
      source: 'rule',
      confidence: 'High',
      isUnverified: false,
    });
  }

  if (!description) {
    findings.push({
      field: 'description',
      issueCategory: 'REQUIRED_FIELD',
      ruleId: 'RULE_REQ_DESC',
      severity: 'Critical',
      description: 'Listing description is missing or empty.',
      explanation: 'A complete product or service description is required for buyer transparency.',
      recommendedCorrection: 'Add a comprehensive description detailing condition, features, specifications, and scope.',
      source: 'rule',
      confidence: 'High',
      isUnverified: false,
    });
  }

  if (!category || category.toLowerCase() === 'select category') {
    findings.push({
      field: 'category',
      issueCategory: 'REQUIRED_FIELD',
      ruleId: 'RULE_REQ_CATEGORY',
      severity: 'Critical',
      description: 'Listing category is not specified or placeholder selected.',
      explanation: 'A valid category is required to ensure catalog discoverability and tax classification.',
      recommendedCorrection: 'Select a primary category from the supported category list.',
      source: 'rule',
      confidence: 'High',
      isUnverified: false,
    });
  }

  if (price === undefined || price === null || price === '') {
    findings.push({
      field: 'price',
      issueCategory: 'REQUIRED_FIELD',
      ruleId: 'RULE_REQ_PRICE',
      severity: 'Critical',
      description: 'Price is not provided.',
      explanation: 'All commercial marketplace listings require a fixed listing price.',
      recommendedCorrection: 'Specify a valid numeric price greater than zero.',
      source: 'rule',
      confidence: 'High',
      isUnverified: false,
    });
  }

  if (!seller) {
    findings.push({
      field: 'seller',
      issueCategory: 'REQUIRED_FIELD',
      ruleId: 'RULE_MISSING_SELLER',
      severity: 'Critical',
      description: 'Seller name or seller reference is missing.',
      explanation: 'Seller identity must be established for accountability and dispute resolution.',
      recommendedCorrection: 'Attach a valid seller name or business identifier to the listing.',
      source: 'rule',
      confidence: 'High',
      isUnverified: false,
    });
  }

  // 2. Price Validation (Positive numeric value, decimal places, bounds)
  if (price !== undefined && price !== null && price !== '') {
    const numPrice = Number(price);
    const decimalPlaces = (String(price).split('.')[1] || '').length;

    if (isNaN(numPrice) || !isFinite(numPrice) || numPrice <= 0) {
      findings.push({
        field: 'price',
        issueCategory: 'PRICE',
        ruleId: 'RULE_PRICE_POSITIVE',
        severity: 'Critical',
        description: `Invalid price format: ${price}. Price must be a positive number greater than 0.`,
        explanation: 'Marketplace policy prohibits zero, negative, or placeholder non-numeric pricing.',
        recommendedCorrection: 'Provide a positive numerical price representing the actual offer amount.',
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    } else if (decimalPlaces > 2) {
      findings.push({
        field: 'price',
        issueCategory: 'PRICE',
        ruleId: 'RULE_PRICE_DECIMALS',
        severity: 'Medium',
        description: `Price (${price}) has more than 2 decimal places.`,
        explanation: 'Currencies only support precision up to 2 decimal places.',
        recommendedCorrection: 'Specify price with at most 2 decimal places.',
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    } else if (numPrice > thresholds.maxPrice) {
      findings.push({
        field: 'price',
        issueCategory: 'PRICE',
        ruleId: 'RULE_PRICE_MAX_BOUND',
        severity: 'High',
        description: `Price (${numPrice} ${currency}) exceeds the platform threshold of ${thresholds.maxPrice} ${currency}.`,
        explanation: 'Unusually high prices may indicate typographical errors, placeholder pricing, or fraudulent transactions.',
        recommendedCorrection: `Verify price accuracy or obtain high-value catalog approval. Maximum threshold is ${thresholds.maxPrice}.`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'CHF', 'CNY', 'NZD'];
    if (!validCurrencies.includes(currency)) {
      findings.push({
        field: 'currency',
        issueCategory: 'PRICE',
        ruleId: 'RULE_CURRENCY_SUPPORTED',
        severity: 'Medium',
        description: `Unsupported currency code '${currency}'.`,
        explanation: `Only standard ISO currencies are supported: ${validCurrencies.join(', ')}.`,
        recommendedCorrection: 'Use a supported 3-letter currency code such as USD or EUR.',
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    }
  }

  // 3. Category Validation against Configured Supported Categories
  if (category && supportedCategories.length > 0) {
    const normalizedCategory = category.toLowerCase();
    const isSupported = supportedCategories.some((c) => c.toLowerCase() === normalizedCategory);
    if (!isSupported) {
      findings.push({
        field: 'category',
        issueCategory: 'CATEGORY',
        ruleId: 'RULE_UNSUPPORTED_CATEGORY',
        severity: 'High',
        description: `Category '${category}' is not among supported marketplace categories.`,
        explanation: `Listings must be classified under active categories: ${supportedCategories.join(', ')}.`,
        recommendedCorrection: `Reclassify the item under one of: ${supportedCategories.slice(0, 5).join(', ')}...`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    }
  }

  // 4. Title Length Validation
  if (title) {
    if (title.length < thresholds.minTitleLength) {
      findings.push({
        field: 'title',
        issueCategory: 'LENGTH',
        ruleId: 'RULE_TITLE_TOO_SHORT',
        severity: 'Medium',
        description: `Title length (${title.length} chars) is below the minimum required length of ${thresholds.minTitleLength} characters.`,
        explanation: 'Short titles lack crucial context such as product brand, model, and primary specification.',
        recommendedCorrection: `Expand title to at least ${thresholds.minTitleLength} characters with specific product keywords.`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    } else if (title.length > thresholds.maxTitleLength) {
      findings.push({
        field: 'title',
        issueCategory: 'LENGTH',
        ruleId: 'RULE_TITLE_TOO_LONG',
        severity: 'Medium',
        description: `Title length (${title.length} chars) exceeds the maximum allowed length of ${thresholds.maxTitleLength} characters.`,
        explanation: 'Excessively long titles clutter search listings, cause truncation on mobile devices, and harm readability.',
        recommendedCorrection: `Shorten the title to under ${thresholds.maxTitleLength} characters by moving secondary attributes to description.`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    }
  }

  // 5. Description Length Validation
  if (description) {
    if (description.length < thresholds.minDescLength) {
      findings.push({
        field: 'description',
        issueCategory: 'LENGTH',
        ruleId: 'RULE_DESC_TOO_SHORT',
        severity: 'Medium',
        description: `Description length (${description.length} chars) is below minimum of ${thresholds.minDescLength} characters.`,
        explanation: 'Descriptions must provide adequate technical specs, condition, and warranty details to minimize buyer returns.',
        recommendedCorrection: `Expand description to at least ${thresholds.minDescLength} characters with comprehensive item details.`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    } else if (description.length > thresholds.maxDescLength) {
      findings.push({
        field: 'description',
        issueCategory: 'LENGTH',
        ruleId: 'RULE_DESC_TOO_LONG',
        severity: 'Low',
        description: `Description length (${description.length} chars) exceeds maximum limit of ${thresholds.maxDescLength} characters.`,
        explanation: 'Descriptions exceeding platform limits risk truncation and poor indexing.',
        recommendedCorrection: `Keep description under ${thresholds.maxDescLength} characters by removing repetitive boilerplate.`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    }
  }

  // 6. Attributes Validation (Object / Array / Map structure, missing keys, empty values, duplicate keys)
  if (attributes !== undefined && attributes !== null) {
    const { findings: attrFindings } = validateAttributePairs(attributes);
    findings.push(...attrFindings);
  }

  // 7. Optional Tags Validation
  if (tags !== undefined && tags !== null) {
    if (!Array.isArray(tags)) {
      findings.push({
        field: 'tags',
        issueCategory: 'TAGS',
        ruleId: 'RULE_TAGS_TYPE',
        severity: 'Low',
        description: 'Listing tags must be provided as an array of strings.',
        explanation: 'Platform tagging requires a list of concise search keywords.',
        recommendedCorrection: 'Ensure tags are formatted as a string array, e.g. ["electronics", "gaming"].',
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    } else {
      if (tags.length > 20) {
        findings.push({
          field: 'tags',
          issueCategory: 'TAGS',
          ruleId: 'RULE_TAGS_LIMIT',
          severity: 'Low',
          description: `Too many tags provided (${tags.length}). Maximum allowed is 20 tags.`,
          explanation: 'Excessive tag stuffing is penalized by marketplace discovery algorithms.',
          recommendedCorrection: 'Remove low-relevance tags and keep to at most 20 high-value keywords.',
          source: 'rule',
          confidence: 'High',
          isUnverified: false,
        });
      }
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (typeof tag !== 'string' || !tag.trim()) {
          findings.push({
            field: 'tags',
            issueCategory: 'TAGS',
            ruleId: 'RULE_TAG_EMPTY',
            severity: 'Low',
            description: `Tag at position ${i + 1} is empty or non-string.`,
            explanation: 'All tags must be non-empty strings without illegal control characters.',
            recommendedCorrection: 'Remove empty or invalid tag entries.',
            source: 'rule',
            confidence: 'High',
            isUnverified: false,
          });
        } else if (tag.length > 50) {
          findings.push({
            field: 'tags',
            issueCategory: 'TAGS',
            ruleId: 'RULE_TAG_LENGTH',
            severity: 'Low',
            description: `Tag '${tag.slice(0, 20)}...' exceeds maximum tag length of 50 characters.`,
            explanation: 'Tags should be concise search tokens rather than full sentences.',
            recommendedCorrection: 'Shorten the tag to under 50 characters.',
            source: 'rule',
            confidence: 'High',
            isUnverified: false,
          });
        }
      }
    }
  }

  // 8. Duplicate or Near-Duplicate Listing Detection
  if (title && description) {
    try {
      const query = { status: { $ne: 'Draft' } };
      if (currentListingId) {
        query._id = { $ne: currentListingId };
      }

      // Query recent listings in the same category or seller for potential duplicates
      const candidates = await Listing.find(query)
        .select('_id title description seller category')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      for (const candidate of candidates) {
        const similarity = calculateListingSimilarity(
          title,
          description,
          candidate.title,
          candidate.description
        );

        if (similarity >= thresholds.duplicateSimilarityThreshold) {
          const matchPercent = Math.round(similarity * 100);
          findings.push({
            field: 'title',
            issueCategory: 'DUPLICATE',
            ruleId: 'RULE_DUPLICATE_LISTING',
            severity: similarity > 0.95 ? 'Critical' : 'High',
            description: `Potential duplicate of existing listing ID '${candidate._id}' ("${candidate.title}"). Similarity match: ${matchPercent}%.`,
            explanation: 'Marketplace policy prohibits duplicate or spam listings that degrade the search experience. Note: Similarity-based detection may produce false positives. Reviewer should verify whether this is an intentional variant or an unauthorized duplicate.',
            recommendedCorrection: `Consolidate into existing listing or differentiate unique product variants and serial numbers. Existing listing ID: ${candidate._id}.`,
            source: 'rule',
            confidence: similarity > 0.95 ? 'High' : 'Medium',
            isUnverified: false,
          });
          break; // Report the highest duplicate match to avoid log spam
        }
      }
    } catch (err) {
      // Don't crash validation if DB duplicate query fails (e.g. during isolated tests)
      console.warn(`[DeterministicValidator] Duplicate check skipped: ${err.message}`);
    }
  }

  return findings;
}
