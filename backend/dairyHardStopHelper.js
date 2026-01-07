/**
 * MenYOU Dairy Hard Stop Helper
 * 
 * This module provides a shared helper to determine if dairy should be
 * treated as NOT AN OPTION (hard stop) vs CAUTION based on hard dairy terms.
 * 
 * Used by breakfast, sauces, and other modules that need to upgrade
 * dairy CAUTION to NOT AN OPTION for structural dairy items.
 */

const { normalizeName } = require('./sauceKnowledge');

/**
 * Hard dairy terms that indicate structural dairy (NOT AN OPTION)
 * These are dairy ingredients that are core to the dish and cannot be removed
 */
const HARD_DAIRY_TERMS = [
  'cheese',
  'cheddar',
  'mozzarella',
  'parmesan',
  'cream',
  'milk',
  'hollandaise'
];

/**
 * Check if normalized text contains any hard dairy terms
 * @param {string} normalizedText - Normalized menu item text
 * @returns {boolean} True if any hard dairy term is present
 */
function hasHardDairyTerms(normalizedText) {
  if (!normalizedText || typeof normalizedText !== 'string') {
    return false;
  }
  
  return HARD_DAIRY_TERMS.some(term => normalizedText.includes(term));
}

/**
 * Determine dairy outcome based on hard dairy terms
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with dairy as boolean property
 * @returns {string|null} 'NOT AN OPTION' if hard dairy terms present, 'CAUTION' if dairy toggled, null otherwise
 */
function getDairyOutcome(menuItemText, toggledAllergens) {
  if (!toggledAllergens || !toggledAllergens.dairy) {
    return null;
  }
  
  const normalizedText = normalizeName(menuItemText);
  
  if (hasHardDairyTerms(normalizedText)) {
    return 'NOT AN OPTION';
  }
  
  return 'CAUTION';
}

module.exports = {
  HARD_DAIRY_TERMS,
  hasHardDairyTerms,
  getDairyOutcome
};

