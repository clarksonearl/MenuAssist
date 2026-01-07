/**
 * MenYOU Pasta & Italian Food Evaluation Logic
 * 
 * This module evaluates pasta and Italian food items to determine guidance outcomes.
 * 
 * Core rule:
 * Standard pasta is never modifiable for gluten.
 * Sauce choice determines dairy risk.
 * 
 * Outcomes:
 * - NOT AN OPTION: Wheat-based pasta when gluten is toggled, cream-based sauces when dairy is toggled
 * - CAUTION: Marinara sauce, pizza, risotto (hidden risks or replaceable components)
 * - GENERALLY OK: Gluten-free pasta, marinara sauce (with verification)
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractPastaItalianFromText,
  getPastaItalianKnowledge
} = require('./pastaItalianKnowledge');

const { normalizeName } = require('./sauceKnowledge');

/**
 * Check if menu text contains structural dairy terms
 * @param {string} menuItemText - Menu item text
 * @returns {boolean} True if structural dairy terms are found
 */
function hasStructuralDairyTerms(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return false;
  }

  const normalized = normalizeName(menuItemText);

  // Pasta anchor tokens (required for "creamy"/"cream" to be structural)
  const pastaAnchors = ['pasta', 'spaghetti', 'fettuccine', 'penne', 'rigatoni', 'ziti', 'linguine', 'ravioli', 'tortellini', 'gnocchi', 'lasagna'];
  const hasPastaAnchor = pastaAnchors.some(anchor => normalized.includes(anchor));
  
  // Named sauce keywords (required for "creamy"/"cream" to be structural)
  const namedSauceKeywords = ['alfredo', 'vodka', 'rosa', 'carbonara', 'marinara', 'parmigiana', 'parmesan', 'gorgonzola', 'pesto'];
  const hasNamedSauceKeyword = namedSauceKeywords.some(keyword => normalized.includes(keyword));

  // Strong structural dairy keywords (specific terms that don't need pasta anchor)
  const dairyStructuralTerms = [
    'alfredo',
    'carbonara',
    'vodka sauce',
    'vodka cream',
    'mac and cheese',
    'macaroni and cheese',
    'mac n cheese',
    'mac & cheese',
    'lasagna',
    'lasagne',
    'stuffed shells',
    'manicotti',
    'cheese ravioli',
    'ravioli with cheese',
    'cheese-filled ravioli',
    'parmesan crusted',
    'parmesan-crusted'
  ];

  // Check for structural dairy terms
  for (const term of dairyStructuralTerms) {
    const normalizedTerm = normalizeName(term);
    if (normalized.includes(normalizedTerm)) {
      return true;
    }
  }

  // For "creamy" or "cream", require pasta anchor OR named sauce keyword
  const hasCreamy = normalized.includes('creamy');
  const hasCream = normalized.includes('cream');
  if (hasCreamy || hasCream) {
    // Only return true if pasta anchor or named sauce keyword is present
    if (hasPastaAnchor || hasNamedSauceKeyword) {
      return true;
    }
    // Otherwise, "creamy"/"cream" alone is not structural
    return false;
  }

  // Check for multi-cheese patterns (3 cheese, 4 cheese, 5 cheese, etc.)
  const multiCheesePattern = /(\d+|three|four|five|six|seven|eight|nine|ten)\s+cheese/i;
  if (multiCheesePattern.test(menuItemText)) {
    return true;
  }

  return false;
}

/**
 * Evaluate a pasta/Italian food item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluatePastaItalian(menuItemText, toggledAllergens) {
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

  // HARD GATE: Check pasta extraction first (applies HARD GATE for creamy/cream)
  // This must run BEFORE hasStructuralDairyTerms to prevent false positives
  const matchedPastaItalian = extractPastaItalianFromText(menuItemText);
  if (!matchedPastaItalian || matchedPastaItalian.length === 0) {
    return null; // HARD GATE blocked or no matches
  }

  // Check for structural dairy terms (after HARD GATE passes)
  // This ensures dishes like "Chicken Alfredo" and "5 Cheese Ziti" are caught
  if (toggledAllergens.dairy === true && hasStructuralDairyTerms(menuItemText)) {
    return {
      outcome: 'NOT AN OPTION',
      internalOutcome: 'NOT AN OPTION',
      guidance: 'This item contains dairy as a core ingredient that cannot be removed.',
      allergenSummary: ['dairy'],
      hasStructuralAllergen: true,
      structuralAllergens: [{ allergen: 'dairy', sources: ['cream', 'cheese'], requiresExplicitLabel: true }],
      requiresExplicitLabel: true,
      hasHiddenRisk: false,
      suggestedServerQuestions: [
        'Is there a dairy-free version available?',
        'Can this be made without dairy?'
      ]
    };
  }

  const pastaItalian = matchedPastaItalian[0];

  // Check for structural allergens
  let hasStructuralAllergen = false;
  const structuralAllergens = [];
  const hiddenRisks = [];
  const crossContactRisks = [];
  const replaceableModifiers = [];
  const removableModifiers = [];

  // Check each toggled allergen
  for (const allergen of toggledArray) {
    const allergenInfo = pastaItalian.allergens[allergen];
    
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
      if (pastaItalian.hiddenRisks && pastaItalian.hiddenRisks[allergen]) {
        const riskInfo = pastaItalian.hiddenRisks[allergen];
        hiddenRisks.push({
          allergen: allergen,
          risk: riskInfo.risk,
          source: riskInfo.source,
          canBeAvoided: riskInfo.canBeAvoided
        });
      }
    }
    
    // Check for cross-contact risks
    if (pastaItalian.crossContactRisk && pastaItalian.crossContactRisk[allergen]) {
      const riskInfo = pastaItalian.crossContactRisk[allergen];
      crossContactRisks.push({
        allergen: allergen,
        risk: riskInfo.risk,
        source: riskInfo.source,
        canBeMitigated: riskInfo.canBeMitigated
      });
    }
  }

  // Check modifiers
  if (pastaItalian.modifiers) {
    for (const [modifierName, modifierInfo] of Object.entries(pastaItalian.modifiers)) {
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
        guidanceParts.push(pastaItalian.reasonForCaution || `May contain ${risk.allergen} from ${risk.source}`);
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
    if (pastaItalian.suggestedServerQuestions) {
      serverQuestions.push(...pastaItalian.suggestedServerQuestions);
    }

    // Build final guidance
    let guidance = pastaItalian.reasonForCaution || 'Italian food items often have recipe-dependent ingredients.';
    if (guidanceParts.length > 0) {
      guidance += ' ' + guidanceParts.join('. ') + '.';
    }

    // Build allergenSummary from toggled allergens that are present
    const allergenSummary = [];
    for (const allergen of toggledArray) {
      const allergenInfo = pastaItalian.allergens[allergen];
      if (allergenInfo && allergenInfo.present === true && allergenInfo.likelihood !== 'unlikely') {
        allergenSummary.push(allergen);
      }
      // Also check hidden risks
      if (pastaItalian.hiddenRisks && pastaItalian.hiddenRisks[allergen]) {
        const hiddenRisk = pastaItalian.hiddenRisks[allergen];
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
 * Build pasta/Italian food context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Pasta/Italian food context object
 */
function buildPastaItalianContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluatePastaItalian(menuItemText, toggledAllergens);
  
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
  evaluatePastaItalian,
  buildPastaItalianContext
};

