/**
 * MenYOU Menu Parsing Module
 * 
 * This module provides sauce-aware menu parsing functionality.
 * It detects sauces in menu items and evaluates them against Local Knowledge.
 * 
 * This is a deterministic logic layer that runs BEFORE AI reasoning.
 */

const { 
  sauceKnowledge, 
  normalizeName, 
  getSauceKnowledge,
  shouldTriggerCaution 
} = require('./sauceKnowledge');

const { matchEntry } = require('./knowledgeMatch');
const { getDairyOutcome } = require('./dairyHardStopHelper');

/**
 * Extract sauces mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched sauce objects (deduplicated by sauceName)
 */
function extractSaucesFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const normalizedText = normalizeName(menuItemText);
  const textTokens = normalizedText.split(/\s+/).filter(t => t.length > 0);
  
  // HARD GATE: Reject single token "soy" (too vague)
  if (textTokens.length === 1 && textTokens[0] === 'soy') {
    return [];
  }

  const matchedSauces = [];
  const seenSauceNames = new Set();

  // Check each sauce in knowledge base using shared matching utility
  // Require confidence >= 3 (exact/alias only) for sauces
  for (const sauce of sauceKnowledge) {
    const match = matchEntry(sauce, menuItemText, { minConfidence: 3 });
    if (match.matched && !seenSauceNames.has(sauce.sauceName)) {
      matchedSauces.push(sauce);
      seenSauceNames.add(sauce.sauceName);
    }
  }

  return matchedSauces;
}

/**
 * Build sauce caution context for a menu item
 * Only includes sauces that trigger CAUTION for toggled allergens
 * Returns null if no CAUTION/NOT_AN_OPTION outcomes
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object|null} Sauce caution context object or null
 */
function buildSauceCautionContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens.gluten === true) toggledArray.push('gluten');
  if (toggledAllergens.dairy === true) toggledArray.push('dairy');

  // Extract all sauces from text
  const matchedSauces = extractSaucesFromText(menuItemText);
  
  if (matchedSauces.length === 0) {
    return null; // No matches, return null
  }

  // Filter to only sauces that trigger CAUTION for toggled allergens
  const sauceCautions = [];
  const saucesDetected = [];

  for (const sauce of matchedSauces) {
    saucesDetected.push(sauce.sauceName);

    // Check if this sauce should trigger CAUTION
    if (shouldTriggerCaution(sauce.sauceName, toggledArray)) {
      // Build filtered reasonForCaution based on toggled allergens
      const relevantReasons = [];
      
      for (const allergen of toggledArray) {
        const allergenInfo = sauce.allergens[allergen];
        if (allergenInfo && 
            allergenInfo.present === true && 
            allergenInfo.likelihood !== 'unlikely') {
          // Build reason text for this allergen
          const sources = allergenInfo.sources || [];
          if (sources.length > 0) {
            relevantReasons.push(`${allergen} (${sources.join(', ')})`);
          } else {
            relevantReasons.push(allergen);
          }
        }
      }

      // Use filtered reason or fall back to general reasonForCaution
      let reasonForCaution = sauce.reasonForCaution;
      if (relevantReasons.length > 0 && relevantReasons.length < toggledArray.length) {
        // If only some allergens are relevant, be more specific
        reasonForCaution = `May contain ${relevantReasons.join(' or ')}`;
      }

      // Limit suggestedServerQuestions to 2-4 items
      const questions = (sauce.suggestedServerQuestions || []).slice(0, 4);

      sauceCautions.push({
        sauceName: sauce.sauceName,
        reasonForCaution: reasonForCaution,
        suggestedServerQuestions: questions
      });
    }
  }

  // Only return context if there are CAUTION outcomes
  if (sauceCautions.length === 0) {
    return null; // No CAUTION outcomes, return null
  }

  // Build allergenSummary from toggled allergens that are present in sauces that trigger CAUTION
  // Only include allergens from sauces in sauceCautions (not all matchedSauces)
  const allergenSummary = [];
  for (const allergen of toggledArray) {
    // Check if any sauce in sauceCautions has this allergen present
    const hasAllergen = sauceCautions.some(sauceCaution => {
      // Find the sauce entry for this caution
      const sauce = matchedSauces.find(s => s.sauceName === sauceCaution.sauceName);
      if (!sauce) return false;
      const allergenInfo = sauce.allergens[allergen];
      return allergenInfo && 
             allergenInfo.present === true && 
             allergenInfo.likelihood !== 'unlikely';
    });
    if (hasAllergen) {
      allergenSummary.push(allergen);
    }
  }

  // Must have allergenSummary to return
  if (allergenSummary.length === 0) {
    return null;
  }

  // Check for hard dairy upgrade: if dairy is in allergenSummary and hard dairy terms present
  const dairyOutcome = getDairyOutcome(menuItemText, toggledAllergens);
  const outcome = (dairyOutcome === 'NOT AN OPTION' && allergenSummary.includes('dairy')) 
    ? 'NOT AN OPTION' 
    : 'CAUTION';

  return {
    detected: true,
    evaluation: {
      outcome: outcome,
      internalOutcome: outcome,
      guidance: sauceCautions.map(sc => sc.reasonForCaution).join(' '),
      allergenSummary: allergenSummary,
      suggestedServerQuestions: sauceCautions.flatMap(sc => sc.suggestedServerQuestions).slice(0, 4)
    },
    saucesDetected: saucesDetected,
    sauceCautions: sauceCautions,
    hasCaution: outcome === 'CAUTION',
    isNotAnOption: outcome === 'NOT AN OPTION'
  };
}

module.exports = {
  extractSaucesFromText,
  buildSauceCautionContext
};

