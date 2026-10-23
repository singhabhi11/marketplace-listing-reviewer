/**
 * Compute token-based Jaccard similarity between two strings.
 * Returns a score between 0.0 and 1.0.
 */
export function calculateJaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const tokenize = (text) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((token) => token.length > 2)
    );

  const setA = tokenize(str1);
  const setB = tokenize(str2);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Normalized Levenshtein distance similarity.
 * Returns a score between 0.0 and 1.0.
 */
export function calculateLevenshteinSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();

  const m = a.length;
  const n = b.length;
  if (m === 0) return n === 0 ? 1.0 : 0.0;
  if (n === 0) return 0.0;

  // Space-optimized matrix
  const prevRow = Array.from({ length: n + 1 }, (_, i) => i);
  const currRow = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,      // insertion
        prevRow[j] + 1,          // deletion
        prevRow[j - 1] + cost    // substitution
      );
    }
    for (let j = 0; j <= n; j++) {
      prevRow[j] = currRow[j];
    }
  }

  const distance = prevRow[n];
  const maxLength = Math.max(m, n);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Combined hybrid similarity score (combines word tokens and character sequence).
 */
export function calculateListingSimilarity(title1, desc1, title2, desc2) {
  const titleLev = calculateLevenshteinSimilarity(title1 || '', title2 || '');
  const titleJaccard = calculateJaccardSimilarity(title1 || '', title2 || '');
  const titleScore = Math.max(titleLev, titleJaccard);

  const descScore = calculateJaccardSimilarity(desc1 || '', desc2 || '');

  // Weighted title is 70%, description is 30%
  return titleScore * 0.7 + descScore * 0.3;
}
