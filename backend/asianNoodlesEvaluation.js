/**
 * MenYOU Asian Noodles Evaluation Logic
 * 
 * This module evaluates Asian noodle dishes to determine guidance outcomes.
 * 
 * Core rule:
 * - Wheat noodles (lo mein, chow mein, udon, ramen) = structural gluten (NOT AN OPTION)
 * - Rice/glass noodles (pad thai, pho, vermicelli) = CAUTION (sauces/cross-contact)
 * 
 * Outcomes:
 * - NOT AN OPTION: Wheat noodle dishes when gluten is toggled
 * - CAUTION: Rice/glass noodle dishes when gluten is toggled (sauces/cross-contact)
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractAsianNoodlesFromText,
  getAsianNoodlesKnowledge
} = require('./asianNoodlesKnowledge');

const { normalizeName } = require('./sauceKnowledge');
const { hasHardDairyTerms } = require('./dairyHardStopHelper');

/**
 * Evaluate an Asian noodle dish and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateAsianNoodles(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for Asian noodle dishes
  const matchedNoodles = extractAsianNoodlesFromText(menuItemText);
  if (matchedNoodles.length === 0) {
    return null;
  }

  const noodleDish = matchedNoodles[0];

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Determine if this is a wheat noodle dish or rice/glass noodle dish
  const isWheatNoodle = noodleDish.itemName.includes('Wheat Noodles');
  const isRiceGlassNoodle = noodleDish.itemName.includes('Rice/Glass Noodles');

  // Build allergenSummary and determine outcome
  const allergenSummary = [];
  let outcome = null;
  let guidance = '';
  const serverQuestions = [];

  // Check gluten
  if (toggledArray.includes('gluten')) {
    const glutenInfo = noodleDish.allergens.gluten;
    if (glutenInfo && glutenInfo.present === true) {
      allergenSummary.push('gluten');
      
      if (isWheatNoodle) {
        // Wheat noodles = NOT AN OPTION (structural)
        outcome = 'NOT AN OPTION';
        guidance = noodleDish.reasonForCaution || 'Wheat noodles contain gluten as a core ingredient that cannot be removed.';
      } else if (isRiceGlassNoodle) {
        // Rice/glass noodles = CAUTION (sauces/cross-contact)
        outcome = 'CAUTION';
        guidance = noodleDish.reasonForCaution || 'Rice/glass noodles may contain gluten from sauces or cross-contact.';
        if (noodleDish.suggestedServerQuestions) {
          serverQuestions.push(...noodleDish.suggestedServerQuestions);
        }
      }
    }
  }

  // Check dairy
  if (toggledArray.includes('dairy')) {
    const normalizedText = normalizeName(menuItemText);
    
    // Only flag if explicit dairy tokens appear
    if (hasHardDairyTerms(normalizedText)) {
      allergenSummary.push('dairy');
      if (!outcome || outcome === 'CAUTION') {
        outcome = 'NOT AN OPTION';
        guidance = 'This dish contains dairy as a core ingredient that cannot be removed.';
      }
    }
    // Otherwise do not fire for dairy
  }

  // Must have allergenSummary to return
  if (allergenSummary.length === 0) {
    return null;
  }

  if (!outcome) {
    return null;
  }

  return {
    outcome: outcome,
    internalOutcome: outcome,
    guidance: guidance,
    allergenSummary: allergenSummary,
    hasStructuralAllergen: outcome === 'NOT AN OPTION',
    suggestedServerQuestions: serverQuestions.slice(0, 4)
  };
}

/**
 * Build Asian noodles context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Asian noodles context object
 */
function buildAsianNoodlesContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateAsianNoodles(menuItemText, toggledAllergens);
  
  if (!evaluation) {
    return null; // No match found
  }

  // Suppress GENERALLY OK: only return CAUTION or NOT AN OPTION
  if (evaluation.outcome !== 'CAUTION' && evaluation.outcome !== 'NOT AN OPTION') {
    return null; // Don't include GENERALLY OK
  }

  // Extract item name for context
  const matchedNoodles = extractAsianNoodlesFromText(menuItemText);
  const itemName = matchedNoodles.length > 0 ? matchedNoodles[0].itemName : 'Asian Noodle Dish';

  return {
    detected: true,
    evaluation: evaluation,
    itemName: itemName,
    hasCaution: evaluation.outcome === 'CAUTION',
    isNotAnOption: evaluation.outcome === 'NOT AN OPTION',
    guidance: evaluation.guidance,
    internalOutcome: evaluation.internalOutcome,
    suggestedServerQuestions: evaluation.suggestedServerQuestions || []
  };
}

module.exports = {
  evaluateAsianNoodles,
  buildAsianNoodlesContext
};

