/**
 * MenYOU Breakfast Evaluation Logic
 * 
 * This module evaluates breakfast items to determine guidance outcomes.
 * 
 * Core rule:
 * Eggs themselves are generally ok, but breakfast prep often introduces
 * hidden gluten and dairy.
 * 
 * Outcomes:
 * - NOT AN OPTION: Pancakes, waffles, French toast (structural gluten/dairy)
 * - CAUTION: Scrambled eggs, omelets, breakfast sandwiches (hidden risks or replaceable components)
 * - GENERALLY OK: Only if no allergens are toggled
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractBreakfastItemsFromText,
  getBreakfastKnowledge
} = require('./breakfastKnowledge');

const { normalizeName } = require('./sauceKnowledge');
const { getDairyOutcome } = require('./dairyHardStopHelper');

/**
 * Evaluate a breakfast item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateBreakfastItem(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for breakfast items
  const matchedBreakfastItems = extractBreakfastItemsFromText(menuItemText);
  if (matchedBreakfastItems.length === 0) {
    return null;
  }

  const breakfastItem = matchedBreakfastItems[0];

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Check for structural allergens
  let hasStructuralAllergen = false;
  const structuralAllergens = [];
  const hiddenRisks = [];
  const replaceableModifiers = [];
  const removableModifiers = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = breakfastItem.allergens[allergen];
    
    if (allergenInfo && allergenInfo.present === true) {
      // Check if structural
      if (allergenInfo.isStructural === true) {
        hasStructuralAllergen = true;
        structuralAllergens.push({
          allergen: allergen,
          sources: allergenInfo.sources || [],
          requiresExplicitLabel: allergenInfo.requiresExplicitLabel || false
        });
      }
      
      // Check for hidden risks
      if (breakfastItem.hiddenRisks && breakfastItem.hiddenRisks[allergen]) {
        const riskInfo = breakfastItem.hiddenRisks[allergen];
        hiddenRisks.push({
          allergen: allergen,
          risk: riskInfo.risk,
          source: riskInfo.source,
          canBeAvoided: riskInfo.canBeAvoided
        });
      }
    }
  }

  // Check modifiers
  if (breakfastItem.modifiers) {
    for (const [modifierName, modifierInfo] of Object.entries(breakfastItem.modifiers)) {
      if (modifierInfo.allergen && toggledArray.includes(modifierInfo.allergen)) {
        if (modifierInfo.type === 'replaceable') {
          replaceableModifiers.push({
            name: modifierName,
            allergen: modifierInfo.allergen,
            guidance: modifierInfo.guidance,
            alternatives: modifierInfo.alternatives || []
          });
        } else if (modifierInfo.type === 'removable') {
          removableModifiers.push({
            name: modifierName,
            allergen: modifierInfo.allergen,
            guidance: modifierInfo.guidance
          });
        }
      }
    }
  }

  // Rule 1: If structural allergen → NOT AN OPTION
  if (hasStructuralAllergen) {
    const allergenList = structuralAllergens.map(s => s.allergen).join(' and/or ');
    const requiresLabel = structuralAllergens.some(s => s.requiresExplicitLabel);
    
    let message = `This item contains ${allergenList} as core ingredients`;
    if (requiresLabel) {
      message += ` and can't be modified reliably unless explicitly listed as ${allergenList}-free`;
    } else {
      message += ` that cannot be removed`;
    }
    message += '.';
    
    // Build allergenSummary from structural allergens
    const allergenSummary = structuralAllergens.map(s => s.allergen);
    
    return {
      outcome: 'NOT AN OPTION',
      internalOutcome: 'NOT AN OPTION',
      guidance: message,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: true,
      structuralAllergens: structuralAllergens,
      requiresExplicitLabel: requiresLabel,
      hasHiddenRisk: false
    };
  }

  // Rule 2: If hidden risks or replaceable/removable modifiers → CAUTION (or NOT AN OPTION for hard dairy)
  if (hiddenRisks.length > 0 || replaceableModifiers.length > 0 || removableModifiers.length > 0) {
    const guidanceParts = [];
    const serverQuestions = [];

    // Add hidden risk guidance
    if (hiddenRisks.length > 0) {
      for (const risk of hiddenRisks) {
        guidanceParts.push(breakfastItem.reasonForCaution || `May contain ${risk.allergen} from ${risk.source}`);
      }
    }

    // Add modifier guidance
    if (replaceableModifiers.length > 0) {
      for (const modifier of replaceableModifiers) {
        guidanceParts.push(modifier.guidance);
      }
    }

    if (removableModifiers.length > 0) {
      for (const modifier of removableModifiers) {
        guidanceParts.push(modifier.guidance);
      }
    }

    // Collect server questions
    if (breakfastItem.suggestedServerQuestions) {
      serverQuestions.push(...breakfastItem.suggestedServerQuestions);
    }

    // Build final guidance
    let guidance = breakfastItem.reasonForCaution || 'Breakfast items often have hidden ingredients.';
    if (guidanceParts.length > 0) {
      guidance += ' ' + guidanceParts.join('. ') + '.';
    }

    // Build allergenSummary from toggled allergens that are present
    const allergenSummary = [];
    for (const allergen of toggledArray) {
      const allergenInfo = breakfastItem.allergens[allergen];
      if (allergenInfo && allergenInfo.present === true && allergenInfo.likelihood !== 'unlikely') {
        allergenSummary.push(allergen);
      }
      // Also check hidden risks
      if (breakfastItem.hiddenRisks && breakfastItem.hiddenRisks[allergen]) {
        const hiddenRisk = breakfastItem.hiddenRisks[allergen];
        if (hiddenRisk.present === true && hiddenRisk.likelihood !== 'unlikely') {
          if (!allergenSummary.includes(allergen)) {
            allergenSummary.push(allergen);
          }
        }
      }
    }
    
    // Must have allergenSummary to return
    if (allergenSummary.length === 0) {
      return null;
    }
    
    // Check for hard dairy upgrade: if dairy is in allergenSummary and hard dairy terms present
    const dairyOutcome = getDairyOutcome(menuItemText, toggledAllergens);
    if (dairyOutcome === 'NOT AN OPTION' && allergenSummary.includes('dairy')) {
      // Upgrade to NOT AN OPTION for structural dairy
      return {
        outcome: 'NOT AN OPTION',
        internalOutcome: 'NOT AN OPTION',
        guidance: guidance,
        allergenSummary: allergenSummary,
        hasStructuralAllergen: true,
        hasHiddenRisk: false,
        structuralAllergens: [{ allergen: 'dairy', sources: ['hard dairy terms'], requiresExplicitLabel: true }],
        requiresExplicitLabel: true,
        suggestedServerQuestions: serverQuestions.slice(0, 4)
      };
    }
    
    return {
      outcome: 'CAUTION',
      internalOutcome: 'CAUTION',
      guidance: guidance,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: false,
      hasHiddenRisk: hiddenRisks.length > 0,
      hiddenRisks: hiddenRisks,
      replaceableModifiers: replaceableModifiers,
      removableModifiers: removableModifiers,
      suggestedServerQuestions: serverQuestions.slice(0, 4)
    };
  }

  // Default: return null (suppress GENERALLY OK)
  return null;
}

/**
 * Build breakfast context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Breakfast context object
 */
function buildBreakfastContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateBreakfastItem(menuItemText, toggledAllergens);
  
  if (!evaluation) {
    return null; // No match found
  }

  // Suppress GENERALLY OK: only return CAUTION or NOT AN OPTION
  if (evaluation.outcome !== 'CAUTION' && evaluation.outcome !== 'NOT AN OPTION') {
    return null; // Don't include GENERALLY OK
  }

  return {
    detected: true,
    evaluation: evaluation,
    hasCaution: evaluation.outcome === 'CAUTION',
    isNotAnOption: evaluation.outcome === 'NOT AN OPTION',
    guidance: evaluation.guidance,
    internalOutcome: evaluation.internalOutcome,
    hasHiddenRisk: evaluation.hasHiddenRisk || false,
    suggestedServerQuestions: evaluation.suggestedServerQuestions || []
  };
}

module.exports = {
  evaluateBreakfastItem,
  buildBreakfastContext
};

