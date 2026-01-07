/**
 * MenYOU Knowledge Matching Utility
 * 
 * Shared matching logic for all Local Knowledge modules.
 * Reduces false positives and over-warning by using strict token-based matching.
 */

/**
 * Normalize text for matching (lowercase, remove punctuation, collapse spaces)
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse multiple spaces to single space
}

/**
 * Tokenize a string into an array of words
 * @param {string} str - String to tokenize
 * @returns {Array<string>} Array of tokens
 */
function tokenize(str) {
  const normalized = normalizeText(str);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(token => token.length > 0);
}

/**
 * Check if all required tokens are present in text tokens
 * @param {Array<string>} textTokens - Tokens from the text to search
 * @param {Array<string>} requiredTokens - Tokens that must all be present
 * @returns {boolean} True if all required tokens are present
 */
function hasAllTokens(textTokens, requiredTokens) {
  if (!textTokens || textTokens.length === 0) return false;
  if (!requiredTokens || requiredTokens.length === 0) return false;
  
  const textTokenSet = new Set(textTokens);
  return requiredTokens.every(token => textTokenSet.has(token));
}

/**
 * Strong single keywords that can match alone (high confidence)
 * These are specific enough to avoid false positives
 */
const STRONG_SINGLE_KEYWORDS = new Set([
  'alfredo', 'tempura', 'caesar', 'ranch', 'hollandaise', 'carbonara',
  'marinara', 'teriyaki', 'worcestershire', 'buffalo', 'panini',
  'lasagna', 'ravioli', 'risotto', 'mole', 'enchilada', 'tamari',
  'gyoza', 'pad thai', 'lo mein', 'chow mein'
]);

/**
 * Stop tokens that must NOT trigger any knowledge match alone
 * These are too generic and cause false positives
 */
const STOP_TOKENS = new Set([
  'chicken', 'beef', 'pork', 'fish', 'shrimp', 'rice', 'salad', 'sauce',
  'tortilla', 'bowl', 'dish', 'plate', 'taco', 'tacos', 'creamy'
]);

/**
 * Vague single tokens that should NOT match alone
 * These are too generic and cause false positives
 */
const VAGUE_TOKENS = new Set([
  'sauce', 'glaze', 'rice', 'chicken', 'beef', 'pork', 'fish', 'salad',
  'sandwich', 'burger', 'pasta', 'noodles', 'bread', 'cheese', 'butter',
  'cream', 'milk', 'dressing', 'fries', 'wings', 'fried', 'grilled',
  'baked', 'steamed', 'roasted', 'soup', 'stew', 'curry', 'stir',
  'wrap', 'tortilla', 'taco', 'burrito', 'bowl', 'plate', 'dish'
]);

/**
 * Tokens that should NEVER match as single-token patterns
 * These are blacklisted even if they might be considered "strong" keywords
 */
const NEVER_SINGLETON = new Set(['creamy', 'cream']);

/**
 * Match a knowledge entry against text
 * @param {Object} entry - Knowledge entry with itemName, aliases, matchPatterns
 * @param {string} text - Text to match against
 * @param {Object} options - Matching options { minConfidence, requireQualifiers }
 * @returns {Object} Match result with matched, confidence, matchedBy, evidence
 */
function matchEntry(entry, text, options = {}) {
  if (!entry || !text) {
    return { matched: false, confidence: 0, matchedBy: null, evidence: [] };
  }

  const textTokens = tokenize(text);
  if (textTokens.length === 0) {
    return { matched: false, confidence: 0, matchedBy: null, evidence: [] };
  }

  const textNormalized = normalizeText(text);
  const entryNameNormalized = normalizeText(entry.itemName || entry.sauceName || '');
  const evidence = [];

  const minConfidence = options.minConfidence || 0;

  // 1. Exact name match (normalized) => confidence 3
  if (entryNameNormalized && textNormalized.includes(entryNameNormalized)) {
    // Check if it's a complete word match, not just substring
    const nameTokens = tokenize(entry.itemName);
    if (hasAllTokens(textTokens, nameTokens)) {
      const confidence = 3;
      if (confidence >= minConfidence) {
        evidence.push(`exact name: "${entry.itemName}"`);
        return {
          matched: true,
          confidence: confidence,
          matchedBy: 'name',
          evidence: evidence
        };
      }
    }
  }

  // 2. Alias exact match => confidence 3
  // Aliases must match by requiring ALL tokens (AND matching)
  if (entry.aliases && Array.isArray(entry.aliases)) {
    for (const alias of entry.aliases) {
      const aliasTokens = tokenize(alias);
      if (aliasTokens.length === 0) continue;
      
      // Require ALL alias tokens to be present (AND matching)
      if (hasAllTokens(textTokens, aliasTokens)) {
        const confidence = 3;
        if (confidence >= minConfidence) {
          evidence.push(`alias: "${alias}"`);
          return {
            matched: true,
            confidence: confidence,
            matchedBy: 'alias',
            evidence: evidence
          };
        }
      }
    }
  }

  // 3. Pattern match
  if (entry.matchPatterns && Array.isArray(entry.matchPatterns)) {
    let bestMatch = null;
    let bestConfidence = 0;
    let bestEvidence = [];

    for (const pattern of entry.matchPatterns) {
      // Pattern can be string or array of tokens
      let requiredTokens;
      if (typeof pattern === 'string') {
        requiredTokens = tokenize(pattern);
      } else if (Array.isArray(pattern)) {
        requiredTokens = pattern.map(t => normalizeText(t)).filter(t => t.length > 0);
      } else {
        continue;
      }

      if (requiredTokens.length === 0) continue;

      // Reject single vague tokens
      if (requiredTokens.length === 1) {
        const singleToken = requiredTokens[0];
        // Never allow these tokens as singletons
        if (NEVER_SINGLETON.has(singleToken)) {
          continue; // Skip never-singleton tokens
        }
        if (VAGUE_TOKENS.has(singleToken)) {
          continue; // Skip vague single tokens
        }
        // Allow strong single keywords
        if (!STRONG_SINGLE_KEYWORDS.has(singleToken)) {
          continue; // Skip non-strong single tokens
        }
      }

      // Stop-word filter for patterns: if pattern only contains stop tokens, reject
      const nonStopPatternTokens = requiredTokens.filter(t => !STOP_TOKENS.has(t));
      if (nonStopPatternTokens.length === 0 && requiredTokens.length > 0) {
        // All pattern tokens are stop tokens - reject
        continue;
      }

      // Special handling for "tortilla" - only match with qualifiers in pattern
      if (requiredTokens.includes('tortilla') && requiredTokens.length === 1) {
        // "tortilla" alone in pattern - reject
        continue;
      }

      // Require at least 2 tokens for concept patterns unless it's a strong keyword
      if (requiredTokens.length === 1 && !STRONG_SINGLE_KEYWORDS.has(requiredTokens[0])) {
        continue;
      }

      // Check if all required tokens are present
      if (hasAllTokens(textTokens, requiredTokens)) {
        const confidence = requiredTokens.length; // Confidence = number of tokens matched
        
        if (confidence >= minConfidence && confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = pattern;
          bestEvidence = [`pattern: ${Array.isArray(pattern) ? pattern.join(' ') : pattern}`];
        }
      }
    }

    if (bestMatch) {
      return {
        matched: true,
        confidence: bestConfidence,
        matchedBy: 'pattern',
        evidence: bestEvidence
      };
    }
  }

  return { matched: false, confidence: 0, matchedBy: null, evidence: [] };
}

/**
 * Check if text has required qualifiers for plain items
 * @param {string} text - Text to check
 * @param {Array<string>} qualifiers - Required qualifier tokens
 * @returns {boolean} True if at least one qualifier is present
 */
function hasQualifier(text, qualifiers) {
  const textTokens = tokenize(text);
  const qualifierSet = new Set(qualifiers.map(q => normalizeText(q)));
  return textTokens.some(token => qualifierSet.has(token));
}

module.exports = {
  normalizeText,
  tokenize,
  hasAllTokens,
  matchEntry,
  hasQualifier,
  STRONG_SINGLE_KEYWORDS,
  VAGUE_TOKENS,
  STOP_TOKENS
};

