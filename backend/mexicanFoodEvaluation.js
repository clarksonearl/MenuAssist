/**
 * MenYOU Mexican Food Evaluation Logic
 * 
 * This module evaluates Mexican food items to determine guidance outcomes.
 * 
 * Core rule:
 * Corn tortillas keep items usable; flour tortillas are a hard no for gluten.
 * Rice and beans are usually safe but recipe-dependent.
 * 
 * Outcomes:
 * - NOT AN OPTION: Flour tortillas when gluten is toggled (structural)
 * - CAUTION: Beans, sauces, tacos, burritos (hidden risks or replaceable components)
 * - GENERALLY OK: Corn tortillas, salsa, rice (with verification)
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractMexicanFoodsFromText,
  getMexicanFoodKnowledge
} = require('./mexicanFoodKnowledge');

const { normalizeName } = require('./sauceKnowledge');

/**
 * Evaluate a Mexican food item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateMexicanFood(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for Mexican food items
  const matchedMexicanFoods = extractMexicanFoodsFromText(menuItemText);
  if (matchedMexicanFoods.length === 0) {
    return null;
  }

  const mexicanFood = matchedMexicanFoods[0];

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Check for structural allergens
  let hasStructuralAllergen = false;
  const structuralAllergens = [];
  const hiddenRisks = [];
  const crossContactRisks = [];
  const replaceableModifiers = [];
  const removableModifiers = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = mexicanFood.allergens[allergen];
    
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
      if (mexicanFood.hiddenRisks && mexicanFood.hiddenRisks[allergen]) {
        const riskInfo = mexicanFood.hiddenRisks[allergen];
        hiddenRisks.push({
          allergen: allergen,
          risk: riskInfo.risk,
          source: riskInfo.source,
          canBeAvoided: riskInfo.canBeAvoided
        });
      }
    }
    
    // Check for cross-contact risks
    if (mexicanFood.crossContactRisk && mexicanFood.crossContactRisk[allergen]) {
      const riskInfo = mexicanFood.crossContactRisk[allergen];
      crossContactRisks.push({
        allergen: allergen,
        risk: riskInfo.risk,
        source: riskInfo.source,
        canBeMitigated: riskInfo.canBeMitigated
      });
    }
  }

  // Check modifiers
  if (mexicanFood.modifiers) {
    for (const [modifierName, modifierInfo] of Object.entries(mexicanFood.modifiers)) {
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
        } else if (modifierInfo.type === 'caution') {
          // Add to hidden risks
          hiddenRisks.push({
            allergen: modifierInfo.allergen,
            risk: 'possible',
            source: modifierInfo.guidance,
            canBeAvoided: true
          });
        }
      }
    }
  }

  // Rule 1: If structural allergen → NOT AN OPTION
  if (hasStructuralAllergen) {
    const allergenList = structuralAllergens.map(s => s.allergen).join(' and/or ');
    const requiresLabel = structuralAllergens.some(s => s.requiresExplicitLabel);
    
    let message = `This item contains ${allergenList} as a core ingredient`;
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

  // Rule 2: If hidden risks, cross-contact risks, or replaceable/removable modifiers → CAUTION
  if (hiddenRisks.length > 0 || crossContactRisks.length > 0 || 
      replaceableModifiers.length > 0 || removableModifiers.length > 0) {
    const guidanceParts = [];
    const serverQuestions = [];

    // Add hidden risk guidance
    if (hiddenRisks.length > 0) {
      for (const risk of hiddenRisks) {
        guidanceParts.push(mexicanFood.reasonForCaution || `May contain ${risk.allergen} from ${risk.source}`);
      }
    }

    // Add cross-contact risk guidance
    if (crossContactRisks.length > 0) {
      for (const risk of crossContactRisks) {
        guidanceParts.push(`Possible cross-contact with ${risk.allergen} from ${risk.source}`);
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
    if (mexicanFood.suggestedServerQuestions) {
      serverQuestions.push(...mexicanFood.suggestedServerQuestions);
    }

    // Build final guidance
    let guidance = mexicanFood.reasonForCaution || 'Mexican food items often have recipe-dependent ingredients.';
    if (guidanceParts.length > 0) {
      guidance += ' ' + guidanceParts.join('. ') + '.';
    }

    // Build allergenSummary from toggled allergens that are present
    const allergenSummary = [];
    for (const allergen of toggledArray) {
      const allergenInfo = mexicanFood.allergens[allergen];
      if (allergenInfo && allergenInfo.present === true && allergenInfo.likelihood !== 'unlikely') {
        allergenSummary.push(allergen);
      }
      // Also check hidden risks
      if (mexicanFood.hiddenRisks && mexicanFood.hiddenRisks[allergen]) {
        const hiddenRisk = mexicanFood.hiddenRisks[allergen];
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
    
    return {
      outcome: 'CAUTION',
      internalOutcome: 'CAUTION',
      guidance: guidance,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: false,
      hasHiddenRisk: hiddenRisks.length > 0,
      hasCrossContactRisk: crossContactRisks.length > 0,
      hiddenRisks: hiddenRisks,
      crossContactRisks: crossContactRisks,
      replaceableModifiers: replaceableModifiers,
      removableModifiers: removableModifiers,
      suggestedServerQuestions: serverQuestions.slice(0, 4)
    };
  }

  // Default: return null (suppress GENERALLY OK)
  return null;
}

/**
 * Build Mexican food context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Mexican food context object
 */
function buildMexicanFoodContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateMexicanFood(menuItemText, toggledAllergens);
  
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
    hasCrossContactRisk: evaluation.hasCrossContactRisk || false,
    suggestedServerQuestions: evaluation.suggestedServerQuestions || []
  };
}

module.exports = {
  evaluateMexicanFood,
  buildMexicanFoodContext
};

