/**
 * MenYOU Burger Evaluation Logic
 * 
 * This module evaluates burgers to determine guidance outcomes.
 * 
 * Core rule: Burgers are CAUTION by default because bread and cheese are common,
 * but both are replaceable or removable. Burger patties themselves are GENERALLY OK.
 * 
 * Outcomes:
 * - CAUTION: Default for burgers (bun and cheese are common but removable/replaceable)
 * - GENERALLY OK: Only if no allergens are toggled or patty-only is specified
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractBurgersFromText,
  getBurgerKnowledge
} = require('./burgerKnowledge');

const { normalizeName } = require('./sauceKnowledge');

/**
 * Evaluate a burger item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateBurger(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for burgers
  const matchedBurgers = extractBurgersFromText(menuItemText);
  if (matchedBurgers.length === 0) {
    return null;
  }

  const burger = matchedBurgers[0];

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Check if patty-only is mentioned (no bun, no cheese)
  const normalizedText = normalizeName(menuItemText);
  const isPattyOnly = normalizedText.includes('patty') && 
                      !normalizedText.includes('bun') && 
                      !normalizedText.includes('bread');

  if (isPattyOnly) {
    return {
      outcome: 'GENERALLY OK',
      internalOutcome: 'GENERALLY OK',
      guidance: 'Burger patty itself is typically safe. Confirm with server.',
      hasReplaceableComponent: false,
      hasRemovableComponent: false
    };
  }

  // Default: CAUTION (bun and cheese are common but removable/replaceable)
  // Note: Burgers should always be CAUTION when allergens are toggled
  const relevantModifiers = [];
  const guidanceParts = [];
  const serverQuestions = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = burger.allergens[allergen];
    
    if (allergenInfo && allergenInfo.present === true) {
      // Check modifiers for this allergen
      if (burger.modifiers) {
        for (const [modifierName, modifierInfo] of Object.entries(burger.modifiers)) {
          if (modifierInfo.allergen === allergen) {
            relevantModifiers.push({
              name: modifierName,
              allergen: allergen,
              type: modifierInfo.type,
              guidance: modifierInfo.guidance,
              alternatives: modifierInfo.alternatives || []
            });
          }
        }
      }
    }
  }

  // Build guidance based on modifiers
  for (const modifier of relevantModifiers) {
    if (modifier.type === 'replaceable') {
      guidanceParts.push(modifier.guidance);
    } else if (modifier.type === 'removable') {
      guidanceParts.push(modifier.guidance);
    }
  }

  // Collect server questions
  if (burger.suggestedServerQuestions) {
    serverQuestions.push(...burger.suggestedServerQuestions);
  }

  // Build final guidance message
  let guidance = 'Most burgers include a bun (gluten) and cheese (dairy) by default. ';
  if (guidanceParts.length > 0) {
    guidance += guidanceParts.join('. ') + '.';
  } else {
    guidance += 'These components can usually be removed or replaced.';
  }

  // Build allergenSummary from toggled allergens that are present
  const allergenSummary = [];
  for (const allergen of toggledArray) {
    const allergenInfo = burger.allergens[allergen];
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
    hasReplaceableComponent: relevantModifiers.some(m => m.type === 'replaceable'),
    hasRemovableComponent: relevantModifiers.some(m => m.type === 'removable'),
    modifiers: relevantModifiers,
    suggestedServerQuestions: serverQuestions.slice(0, 4)
  };
}

/**
 * Build burger context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Burger context object
 */
function buildBurgerContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateBurger(menuItemText, toggledAllergens);
  
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
  evaluateBurger,
  buildBurgerContext
};

