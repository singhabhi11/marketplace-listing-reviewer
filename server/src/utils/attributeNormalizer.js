/**
 * Utility for normalizing, formatting, and validating product attributes.
 * Supports legacy formats (Map, Object, Array of Strings) and standard structured array:
 * [ { key: 'Dimensions', value: '65 x 65 x 110 cm' } ]
 */

export function normalizeAttributes(rawAttributes) {
  if (!rawAttributes) return [];

  const list = [];

  // 1. Array format
  if (Array.isArray(rawAttributes)) {
    for (const item of rawAttributes) {
      if (!item) continue;

      if (typeof item === 'object' && item !== null) {
        let k = item.key !== undefined && item.key !== null ? String(item.key).trim() : '';
        let v = item.value !== undefined && item.value !== null ? String(item.value).trim() : '';

        // If key itself contains colon and value is empty (e.g. "Dimensions: 65 x 65 x 110 cm" in key box)
        if (k.includes(':') && !v) {
          const colonIdx = k.indexOf(':');
          v = k.slice(colonIdx + 1).trim();
          k = k.slice(0, colonIdx).trim();
        }

        if (k || v) {
          list.push({ key: k, value: v });
        }
      } else if (typeof item === 'string') {
        const str = item.trim();
        if (str.includes(':')) {
          const colonIdx = str.indexOf(':');
          list.push({
            key: str.slice(0, colonIdx).trim(),
            value: str.slice(colonIdx + 1).trim(),
          });
        } else if (str) {
          list.push({ key: str, value: '' });
        }
      }
    }
  }
  // 2. Map or Plain Object
  else if (typeof rawAttributes === 'object' && rawAttributes !== null) {
    const entries =
      rawAttributes instanceof Map
        ? Array.from(rawAttributes.entries())
        : Object.entries(rawAttributes);

    for (const [rawKey, rawVal] of entries) {
      let k = rawKey !== undefined && rawKey !== null ? String(rawKey).trim() : '';
      let v = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

      // Auto-split if key has colon and val is empty
      if (k.includes(':') && !v) {
        const colonIdx = k.indexOf(':');
        v = k.slice(colonIdx + 1).trim();
        k = k.slice(0, colonIdx).trim();
      }

      if (k || v) {
        list.push({ key: k, value: v });
      }
    }
  }

  return list;
}

/**
 * Returns human-readable text representation of attributes.
 * Never outputs "[object Map]" or "[object Object]".
 */
export function formatAttributesText(attributes) {
  const normalized = normalizeAttributes(attributes);
  if (!normalized.length) return 'None';
  return normalized.map((item) => `${item.key}: ${item.value}`).join(', ');
}

/**
 * Validates attribute pairs and returns structured findings.
 */
export function validateAttributePairs(rawAttributes) {
  const findings = [];
  const normalized = normalizeAttributes(rawAttributes);

  const seenKeys = new Map(); // lowerKey -> originalKey

  for (const item of normalized) {
    const { key, value } = item;

    // Has value but no key
    if (!key && value) {
      findings.push({
        field: 'attributes',
        issueCategory: 'ATTRIBUTES',
        ruleId: 'RULE_ATTRS_MISSING_KEY',
        severity: 'Medium',
        description: `Attribute with value '${value}' is missing a key name.`,
        explanation: 'Every specification must declare a clear attribute title such as Brand, Material, or Dimensions.',
        recommendedCorrection: 'Provide an attribute key (e.g. "Color") or remove this attribute value.',
        originalExcerpt: `: ${value}`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
      continue;
    }

    // Has key but no value
    if (key && !value) {
      findings.push({
        field: 'attributes',
        issueCategory: 'ATTRIBUTES',
        ruleId: 'RULE_ATTRS_EMPTY_VAL',
        severity: 'Low',
        description: `Attribute '${key}' has an empty or null value.`,
        explanation: 'Incomplete attribute pairs cause display errors in product specification widgets.',
        recommendedCorrection: `Fill in a valid value for '${key}' or remove this attribute row.`,
        originalExcerpt: `${key}: (empty)`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
      continue;
    }

    // Check duplicate keys (ignoring case & surrounding spaces)
    const lowerKey = key.toLowerCase();
    if (seenKeys.has(lowerKey)) {
      findings.push({
        field: 'attributes',
        issueCategory: 'ATTRIBUTES',
        ruleId: 'RULE_ATTRS_DUPLICATE_KEY',
        severity: 'Low',
        description: `Duplicate attribute key '${key}' detected (already defined as '${seenKeys.get(lowerKey)}').`,
        explanation: 'Attribute keys must be unique per listing to prevent conflicting product specifications.',
        recommendedCorrection: `Merge '${key}' into the existing attribute or choose a distinct key name.`,
        originalExcerpt: `${key}: ${value}`,
        source: 'rule',
        confidence: 'High',
        isUnverified: false,
      });
    } else {
      seenKeys.set(lowerKey, key);
    }
  }

  return { findings, normalized };
}
