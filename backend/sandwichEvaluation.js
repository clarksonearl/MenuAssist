/**
 * MenYOU Sandwich Evaluation Logic
 * 
 * This module evaluates sandwiches and bread-based items to determine guidance outcomes.
 * 
 * Core rule:
 * Bread is a structural gluten source, but many sandwiches can be modified
 * by removing or replacing bread.
 * 
 * Outcomes:
 * - CAUTION: Default for sandwiches (bread can usually be removed/replaced)
 * - NOT AN OPTION: If bread is structural and cannot be removed, and no gluten-free option
 * - GENERALLY OK: Only if no allergens are toggled
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractSandwichesFromText,
  getSandwichKnowledge
} = require('./sandwichKnowledge');

const { normalizeName } = require('./sauceKnowledge');

/**
 * Evaluate a sandwich item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateSandwich(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for sandwiches
  const matchedSandwiches = extractSandwichesFromText(menuItemText);
  if (matchedSandwiches.length === 0) {
    return null;
  }

  const sandwich = matchedSandwiches[0];

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Check for structural allergens that cannot be removed
  let hasStructuralAllergen = false;
  const structuralAllergens = [];
  const replaceableModifiers = [];
  const removableModifiers = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = sandwich.allergens[allergen];
    
    if (allergenInfo && allergenInfo.present === true) {
      // Check modifiers for this allergen
      if (sandwich.modifiers) {
        for (const [modifierName, modifierInfo] of Object.entries(sandwich.modifiers)) {
          if (modifierInfo.allergen === allergen) {
            if (modifierInfo.type === 'structural' && modifierInfo.canBeRemoved === false) {
              hasStructuralAllergen = true;
              structuralAllergens.push({
                name: modifierName,
                allergen: allergen,
                requiresExplicitLabel: allergenInfo.requiresExplicitLabel || false
              });
            } else if (modifierInfo.type === 'replaceable') {
              replaceableModifiers.push({
                name: modifierName,
                allergen: allergen,
                guidance: modifierInfo.guidance,
                alternatives: modifierInfo.alternatives || [],
                canBeRemoved: modifierInfo.canBeRemoved !== false
              });
            } else if (modifierInfo.type === 'removable') {
              removableModifiers.push({
                name: modifierName,
                allergen: allergen,
                guidance: modifierInfo.guidance
              });
            }
          }
        }
      }
    }
  }

  // Rule 1: If structural allergen that cannot be removed → NOT AN OPTION
  if (hasStructuralAllergen) {
    const allergenList = structuralAllergens.map(s => s.allergen).join(' and/or ');
    const requiresLabel = structuralAllergens.some(s => s.requiresExplicitLabel);
    
    let message = `This item is typically made with ${allergenList} and can't be modified reliably`;
    if (requiresLabel) {
      message += ` unless explicitly listed as ${allergenList}-free`;
    } else {
      message += ` unless gluten-free bread is available`;
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
      requiresExplicitLabel: requiresLabel
    };
  }

  // Rule 2: Default to CAUTION (bread/cheese can usually be removed/replaced)
  const guidanceParts = [];
  const serverQuestions = [];

  // Build guidance for replaceable components
  for (const modifier of replaceableModifiers) {
    if (modifier.allergen === 'gluten') {
      guidanceParts.push('Ask about gluten-free bread or no bread option');
    }
  }

  // Build guidance for removable components
  for (const modifier of removableModifiers) {
    guidanceParts.push(modifier.guidance);
  }

  // Collect server questions
  if (sandwich.suggestedServerQuestions) {
    serverQuestions.push(...sandwich.suggestedServerQuestions);
  }

  // Build final guidance message
  let guidance = sandwich.reasonForCaution || 'Bread and cheese are common but can usually be removed or replaced.';
  if (guidanceParts.length > 0) {
    guidance += ' ' + guidanceParts.join('. ') + '.';
  }

  // Build allergenSummary from toggled allergens that are present
  const allergenSummary = [];
  for (const allergen of toggledArray) {
    const allergenInfo = sandwich.allergens[allergen];
    if (allergenInfo && allergenInfo.present === true && allergenInfo.likelihood !== 'unlikely') {
      allergenSummary.push(allergen);
    }
  }
  
  // Must have allergenSummary to return
  if (allergenSummary.length === 0) {
    return null;
  }
  
  return {
    outcome: 'CAUTION',
    internalOutcome: 'CAUTION',
    guidance: guidance,
    allergenSummary: allergenSummary,
    hasStructuralAllergen: false,
    hasReplaceableComponent: replaceableModifiers.length > 0,
    hasRemovableComponent: removableModifiers.length > 0,
    replaceableModifiers: replaceableModifiers,
    removableModifiers: removableModifiers,
    suggestedServerQuestions: serverQuestions.slice(0, 4)
  };
}

/**
 * Build sandwich context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Sandwich context object
 */
function buildSandwichContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateSandwich(menuItemText, toggledAllergens);
  
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
    suggestedServerQuestions: evaluation.suggestedServerQuestions || []
  };
}

module.exports = {
  evaluateSandwich,
  buildSandwichContext
};

