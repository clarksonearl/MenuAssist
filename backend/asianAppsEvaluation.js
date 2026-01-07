/**
 * MenYOU Asian Apps Evaluation Logic
 * 
 * This module evaluates Asian appetizers to determine guidance outcomes.
 * 
 * Core rule:
 * - Wrapper/batter apps (dumplings, egg rolls, tempura) = structural gluten (NOT AN OPTION)
 * - Sauce-glazed apps (teriyaki, hoisin, etc.) = CAUTION (gluten in sauces)
 * - Dairy apps (crab rangoon, cream cheese wontons) = structural dairy (NOT AN OPTION)
 * 
 * Outcomes:
 * - NOT AN OPTION: Wrapper/batter apps when gluten is toggled; dairy apps when dairy is toggled
 * - CAUTION: Sauce-glazed apps when gluten is toggled; fresh spring rolls when gluten is toggled
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractAsianAppsFromText,
  getAsianAppsKnowledge
} = require('./asianAppsKnowledge');

const { normalizeName } = require('./sauceKnowledge');
const { hasHardDairyTerms } = require('./dairyHardStopHelper');

/**
 * Evaluate an Asian app and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateAsianApps(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for Asian apps
  const matchedApps = extractAsianAppsFromText(menuItemText);
  if (matchedApps.length === 0) {
    return null;
  }

  const app = matchedApps[0];

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Determine app type
  const isWrapperBatter = app.itemName.includes('Wrapper/Batter');
  const isSauceGlazed = app.itemName.includes('Sauce-Glazed');
  const isDairyApp = app.itemName.includes('Dairy Apps');
  const isFreshSpringRoll = app.itemName.includes('Fresh Spring Roll');

  // Build allergenSummary and determine outcome
  const allergenSummary = [];
  let outcome = null;
  let guidance = '';
  const serverQuestions = [];

  // Check gluten
  if (toggledArray.includes('gluten')) {
    const glutenInfo = app.allergens.gluten;
    if (glutenInfo && glutenInfo.present === true) {
      allergenSummary.push('gluten');
      
      if (isWrapperBatter) {
        // Wrapper/batter apps = NOT AN OPTION (structural)
        outcome = 'NOT AN OPTION';
        guidance = app.reasonForCaution || 'Wrappers and batters contain gluten as a core ingredient that cannot be removed.';
      } else if (isSauceGlazed || isFreshSpringRoll) {
        // Sauce-glazed apps and fresh spring rolls = CAUTION
        outcome = 'CAUTION';
        guidance = app.reasonForCaution || 'This item may contain gluten from sauces or cross-contact.';
        if (app.suggestedServerQuestions) {
          serverQuestions.push(...app.suggestedServerQuestions);
        }
      } else if (isDairyApp) {
        // Dairy apps also have gluten wrapper = NOT AN OPTION
        outcome = 'NOT AN OPTION';
        guidance = app.reasonForCaution || 'This item contains gluten in the wrapper as a core ingredient that cannot be removed.';
      }
    }
  }

  // Check dairy
  if (toggledArray.includes('dairy')) {
    const dairyInfo = app.allergens.dairy;
    if (dairyInfo && dairyInfo.present === true) {
      // For dairy apps, always return NOT AN OPTION when dairy is toggled
      if (isDairyApp) {
        allergenSummary.push('dairy');
        outcome = 'NOT AN OPTION';
        guidance = app.reasonForCaution || 'This item contains dairy as a core ingredient that cannot be removed.';
      } else {
        // For non-dairy apps, check hard dairy terms
        const normalizedText = normalizeName(menuItemText);
        if (hasHardDairyTerms(normalizedText)) {
          allergenSummary.push('dairy');
          if (!outcome || outcome === 'CAUTION') {
            outcome = 'NOT AN OPTION';
            guidance = app.reasonForCaution || 'This item contains dairy as a core ingredient that cannot be removed.';
          }
        }
      }
    }
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
 * Build Asian apps context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Asian apps context object
 */
function buildAsianAppsContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateAsianApps(menuItemText, toggledAllergens);
  
  if (!evaluation) {
    return null; // No match found
  }

  // Suppress GENERALLY OK: only return CAUTION or NOT AN OPTION
  if (evaluation.outcome !== 'CAUTION' && evaluation.outcome !== 'NOT AN OPTION') {
    return null; // Don't include GENERALLY OK
  }

  // Extract item name for context
  const matchedApps = extractAsianAppsFromText(menuItemText);
  const itemName = matchedApps.length > 0 ? matchedApps[0].itemName : 'Asian App';

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
  evaluateAsianApps,
  buildAsianAppsContext
};

