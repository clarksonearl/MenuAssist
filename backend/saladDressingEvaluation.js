/**
 * MenYOU Salad & Dressing Evaluation Logic
 * 
 * This module evaluates salads and dressings to determine guidance outcomes:
 * - GENERALLY OK: Lower concern, removable modifiers
 * - CAUTION: Replaceable components, requires swap/removal guidance
 * - NOT AN OPTION: Structural allergen that cannot be removed
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractDressingsFromText,
  extractSaladsFromText,
  getDressingKnowledge,
  getSaladKnowledge
} = require('./saladDressingKnowledge');

/**
 * Evaluate a salad or dressing item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateSaladOrDressing(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Check for salads first (salads are composite items)
  // Guard: Do not trigger on generic "salad" unless specific dressing keywords present
  const normalizedText = menuItemText.toLowerCase();
  const hasSpecificDressing = 
    normalizedText.includes('caesar') ||
    normalizedText.includes('ranch') ||
    normalizedText.includes('blue cheese') ||
    normalizedText.includes('bleu cheese') ||
    normalizedText.includes('caesar dressing') ||
    normalizedText.includes('ranch dressing') ||
    normalizedText.includes('blue cheese dressing');
  
  const matchedSalads = extractSaladsFromText(menuItemText);
  
  // If text contains "salad" but no specific dressing, check if it's a known salad type
  if (normalizedText.includes('salad') && !hasSpecificDressing) {
    // If no specific salad match (like "chicken salad"), return null
    if (matchedSalads.length === 0) {
      return null;
    }
  }
  
  if (matchedSalads.length > 0) {
    return evaluateSalad(matchedSalads[0], toggledArray, menuItemText);
  }

  // Check for dressings
  const matchedDressings = extractDressingsFromText(menuItemText);
  if (matchedDressings.length > 0) {
    return evaluateDressing(matchedDressings[0], toggledArray);
  }

  // If no match in knowledge base, return null (let AI handle it)
  return null;
}

/**
 * Evaluate a salad item
 * @param {Object} salad - Salad knowledge entry
 * @param {Array<string>} toggledArray - Array of toggled allergens
 * @param {string} menuItemText - Full menu item text for context
 * @returns {Object} Evaluation result
 */
function evaluateSalad(salad, toggledArray, menuItemText) {
  let hasStructuralAllergen = false;
  let hasRemovableModifier = false;
  let hasReplaceableModifier = false;
  const structuralAllergens = [];
  const removableModifiers = [];
  const replaceableModifiers = [];
  const guidanceMessages = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = salad.allergens[allergen];
    
    if (allergenInfo && allergenInfo.present === true) {
      // Check if structural
      if (allergenInfo.isStructural === true && allergenInfo.isReplaceable === false) {
        hasStructuralAllergen = true;
        structuralAllergens.push({
          allergen: allergen,
          sources: allergenInfo.sources || [],
          requiresExplicitLabel: allergenInfo.requiresExplicitLabel || false
        });
      }
    }
  }

  // Check modifiers if salad has them
  if (salad.modifiers) {
    for (const [modifierName, modifierInfo] of Object.entries(salad.modifiers)) {
      if (modifierInfo.type === 'removable' && modifierInfo.allergen) {
        if (toggledArray.includes(modifierInfo.allergen)) {
          hasRemovableModifier = true;
          removableModifiers.push({
            name: modifierName,
            allergen: modifierInfo.allergen,
            guidance: modifierInfo.guidance
          });
        }
      } else if (modifierInfo.type === 'replaceable') {
        hasReplaceableModifier = true;
        replaceableModifiers.push({
          name: modifierName,
          guidance: modifierInfo.guidance
        });
      }
    }
  }

  // Rule 1: If structural allergen → NOT AN OPTION
  if (hasStructuralAllergen) {
    const allergenList = structuralAllergens.map(s => s.allergen).join(' and/or ');
    const message = `This item is typically made with ${allergenList} and can't be modified reliably unless explicitly listed as ${allergenList}-free.`;
    
    // Build allergenSummary from structural allergens
    const allergenSummary = structuralAllergens.map(s => s.allergen);
    
    return {
      outcome: 'NOT AN OPTION',
      internalOutcome: 'NOT AN OPTION',
      guidance: message,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: true,
      hasRemovableModifier: false,
      hasReplaceableModifier: false,
      structuralAllergens: structuralAllergens,
      requiresExplicitLabel: structuralAllergens.some(s => s.requiresExplicitLabel)
    };
  }

  // Rule 2: If replaceable modifier → CAUTION
  if (hasReplaceableModifier) {
    const guidanceParts = [];
    if (removableModifiers.length > 0) {
      guidanceParts.push(removableModifiers.map(m => m.guidance).join(', '));
    }
    if (replaceableModifiers.length > 0) {
      guidanceParts.push(replaceableModifiers.map(m => m.guidance).join(', '));
    }
    
    // Build allergenSummary from toggled allergens that are present
    const allergenSummary = [];
    for (const allergen of toggledArray) {
      const allergenInfo = salad.allergens[allergen];
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
      guidance: guidanceParts.join('. ') || 'Swap/remove components as needed',
      allergenSummary: allergenSummary,
      hasStructuralAllergen: false,
      hasRemovableModifier: hasRemovableModifier,
      hasReplaceableModifier: true,
      removableModifiers: removableModifiers,
      replaceableModifiers: replaceableModifiers
    };
  }

  // Rule 3: If removable modifier → GENERALLY OK
  if (hasRemovableModifier) {
    const guidanceParts = removableModifiers.map(m => m.guidance);
    
    return {
      outcome: 'GENERALLY OK',
      internalOutcome: 'GENERALLY OK',
      guidance: guidanceParts.join('. ') + '. Quick confirmation question recommended.',
      hasStructuralAllergen: false,
      hasRemovableModifier: true,
      hasReplaceableModifier: false,
      removableModifiers: removableModifiers
    };
  }

  // Default: return null (suppress GENERALLY OK)
  return null;
}

/**
 * Evaluate a dressing item
 * @param {Object} dressing - Dressing knowledge entry
 * @param {Array<string>} toggledArray - Array of toggled allergens
 * @returns {Object} Evaluation result
 */
function evaluateDressing(dressing, toggledArray) {
  let hasStructuralAllergen = false;
  const structuralAllergens = [];
  const replaceableAllergens = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = dressing.allergens[allergen];
    
    if (allergenInfo && allergenInfo.present === true) {
      // Check if structural
      if (allergenInfo.isStructural === true && allergenInfo.isReplaceable === false) {
        hasStructuralAllergen = true;
        structuralAllergens.push({
          allergen: allergen,
          sources: allergenInfo.sources || [],
          requiresExplicitLabel: allergenInfo.requiresExplicitLabel || false
        });
      } else if (allergenInfo.isReplaceable === true) {
        replaceableAllergens.push({
          allergen: allergen,
          sources: allergenInfo.sources || [],
          guidance: dressing.suggestedServerQuestions || []
        });
      }
    }
  }

  // Rule 1: If structural allergen → NOT AN OPTION
  if (hasStructuralAllergen) {
    const allergenList = structuralAllergens.map(s => s.allergen).join(' and/or ');
    const message = `This dressing is typically made with ${allergenList} and can't be modified reliably unless explicitly listed as ${allergenList}-free.`;
    
    // Build allergenSummary from structural allergens
    const allergenSummary = structuralAllergens.map(s => s.allergen);
    
    return {
      outcome: 'NOT AN OPTION',
      internalOutcome: 'NOT AN OPTION',
      guidance: message,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: true,
      structuralAllergens: structuralAllergens,
      requiresExplicitLabel: structuralAllergens.some(s => s.requiresExplicitLabel)
    };
  }

  // Rule 2: If replaceable → CAUTION
  if (replaceableAllergens.length > 0) {
    const allergenList = replaceableAllergens.map(r => r.allergen).join(' and/or ');
    const questions = replaceableAllergens[0].guidance || [];
    
    // Build allergenSummary from replaceable allergens
    const allergenSummary = replaceableAllergens.map(r => r.allergen);
    
    return {
      outcome: 'CAUTION',
      internalOutcome: 'CAUTION',
      guidance: `Swap this dressing. ${allergenList} may be present depending on recipe.`,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: false,
      suggestedServerQuestions: questions,
      replaceableAllergens: replaceableAllergens
    };
  }

  // Default: return null (suppress GENERALLY OK)
  return null;
}

/**
 * Build salad/dressing caution context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Salad/dressing context object
 */
function buildSaladDressingContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateSaladOrDressing(menuItemText, toggledAllergens);
  
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
    internalOutcome: evaluation.internalOutcome
  };
}

module.exports = {
  evaluateSaladOrDressing,
  evaluateSalad,
  evaluateDressing,
  buildSaladDressingContext
};

