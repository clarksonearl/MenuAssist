/**
 * MenYOU Fried Food Evaluation Logic
 * 
 * This module evaluates fried foods to determine guidance outcomes.
 * 
 * Core rule:
 * Frying introduces cross-contact risk.
 * Breaded items are structural gluten; plain items depend on fryer use.
 * 
 * Outcomes:
 * - NOT AN OPTION: Breaded items when gluten is toggled (breading is structural)
 * - CAUTION: Plain fried items due to shared fryer cross-contact risk
 * - GENERALLY OK: Only if no allergens are toggled
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractFriedFoodsFromText,
  getFriedFoodKnowledge,
  isBreadedItem
} = require('./friedFoodKnowledge');

const { normalizeName } = require('./sauceKnowledge');

/**
 * Evaluate a fried food item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateFriedFood(menuItemText, toggledAllergens) {
  // Convert toggledAllergens object to array format
  const toggledArray = [];
  if (toggledAllergens && typeof toggledAllergens === 'object') {
    if (toggledAllergens.gluten === true) toggledArray.push('gluten');
    if (toggledAllergens.dairy === true) toggledArray.push('dairy');
  }

  // Check for negative qualifiers first
  const normalizedText = normalizeName(menuItemText);
  const hasNakedQualifier = normalizedText.includes('naked');
  
  // Check for explicit fried evidence
  const explicitFriedTerms = ['fried', 'deep fried', 'breaded', 'battered', 'crispy', 'tempura', 'panko', 'fries', 'onion rings', 'fried chicken', 'mozzarella sticks'];
  const hasExplicitFriedEvidence = explicitFriedTerms.some(term => {
    const termNormalized = normalizeName(term);
    return normalizedText.includes(termNormalized);
  });
  
  // If "naked" is present and no explicit fried evidence, do not trigger fryer CAUTION
  if (hasNakedQualifier && !hasExplicitFriedEvidence) {
    return null;
  }
  
  // Check for fried foods
  const matchedFriedFoods = extractFriedFoodsFromText(menuItemText);
  const isBreaded = isBreadedItem(menuItemText);
  
  // If no match and not breaded, return null (let AI handle it)
  if (matchedFriedFoods.length === 0 && !isBreaded) {
    return null;
  }

  // If no toggled allergens, return null
  if (toggledArray.length === 0) {
    return null;
  }

  // Check if item is breaded (structural gluten)
  if (isBreaded) {
    // Check if gluten is toggled
    if (toggledArray.includes('gluten')) {
      return {
        outcome: 'NOT AN OPTION',
        internalOutcome: 'NOT AN OPTION',
        guidance: 'This item is breaded and contains gluten. Breading cannot be removed after cooking.',
        allergenSummary: ['gluten'],
        hasStructuralAllergen: true,
        structuralAllergen: 'gluten',
        hasCrossContactRisk: false
      };
    }
  }

  // Check matched fried foods
  if (matchedFriedFoods.length > 0) {
    const friedFood = matchedFriedFoods[0];
    
    // Check for structural allergens
    let hasStructuralAllergen = false;
    const structuralAllergens = [];
    
    for (const allergen of toggledArray) {
      const allergenInfo = friedFood.allergens[allergen];
      
      if (allergenInfo && 
          allergenInfo.present === true && 
          allergenInfo.isStructural === true) {
        hasStructuralAllergen = true;
        structuralAllergens.push({
          allergen: allergen,
          sources: allergenInfo.sources || [],
          requiresExplicitLabel: allergenInfo.requiresExplicitLabel || false
        });
      }
    }

    // Rule 1: If structural allergen → NOT AN OPTION
    if (hasStructuralAllergen) {
      const allergenList = structuralAllergens.map(s => s.allergen).join(' and/or ');
      const requiresLabel = structuralAllergens.some(s => s.requiresExplicitLabel);
      
      let message = `This item contains ${allergenList} that cannot be removed`;
      if (requiresLabel) {
        message += ` unless explicitly listed as ${allergenList}-free`;
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
        hasCrossContactRisk: false
      };
    }

    // Rule 2: Check cross-contact risk for plain fried items
    // But respect "naked" qualifier - if "naked" is present and no explicit fried evidence, skip
    if (friedFood.crossContactRisk && !(hasNakedQualifier && !hasExplicitFriedEvidence)) {
      const crossContactRisks = [];
      const relevantRisks = [];
      
      for (const allergen of toggledArray) {
        const riskInfo = friedFood.crossContactRisk[allergen];
        if (riskInfo) {
          relevantRisks.push({
            allergen: allergen,
            risk: riskInfo.risk,
            source: riskInfo.source,
            canBeMitigated: riskInfo.canBeMitigated
          });
        }
      }

      if (relevantRisks.length > 0) {
        // Build guidance for cross-contact
        const allergenList = relevantRisks.map(r => r.allergen).join(' and/or ');
        let guidance = friedFood.reasonForCaution || `Fryers are often shared, creating cross-contact risk for ${allergenList}.`;
        
        // Add server questions
        const serverQuestions = friedFood.suggestedServerQuestions || [
          'Are these fried in a shared fryer?',
          'Do you have a dedicated fryer?'
        ];

        // Build allergenSummary from relevant risks
        const allergenSummary = relevantRisks.map(r => r.allergen);
        
        return {
          outcome: 'CAUTION',
          internalOutcome: 'CAUTION',
          guidance: guidance,
          allergenSummary: allergenSummary,
          hasStructuralAllergen: false,
          hasCrossContactRisk: true,
          crossContactRisks: relevantRisks,
          suggestedServerQuestions: serverQuestions.slice(0, 4)
        };
      }
    }
  }

  // Default: If breaded but no structural allergen match, or plain fried
  // Check if we detected breading terms but no specific match
  if (isBreaded && toggledArray.includes('gluten')) {
    return {
      outcome: 'NOT AN OPTION',
      internalOutcome: 'NOT AN OPTION',
      guidance: 'This item appears to be breaded and contains gluten. Breading cannot be removed after cooking.',
      allergenSummary: ['gluten'],
      hasStructuralAllergen: true,
      structuralAllergen: 'gluten',
      hasCrossContactRisk: false
    };
  }

  // If plain fried item but no specific match
  // Only trigger CAUTION when explicit fried evidence exists
  // Note: normalizedText and explicitFriedTerms already computed above
  // Reuse hasExplicitFriedEvidence (same logic as hasExplicitFriedTerm)
  
  // Do NOT trigger for "wings" alone - require explicit fried term
  // Also respect "naked" qualifier (already checked above, but double-check here)
  if (hasExplicitFriedEvidence && !isBreaded && !hasNakedQualifier) {
    // Build allergenSummary from toggled allergens
    const allergenSummary = [...toggledArray];
    
    const allergenList = toggledArray.join(' and/or ');
    return {
      outcome: 'CAUTION',
      internalOutcome: 'CAUTION',
      guidance: `This item is fried and may have cross-contact risk for ${allergenList} from shared fryers.`,
      allergenSummary: allergenSummary,
      hasStructuralAllergen: false,
      hasCrossContactRisk: true,
      suggestedServerQuestions: [
        'Are these fried in a shared fryer?',
        'Do you have a dedicated fryer?'
      ]
    };
  }

  // Fallback: return null (suppress GENERALLY OK)
  return null;
}

/**
 * Build fried food context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Fried food context object
 */
function buildFriedFoodContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateFriedFood(menuItemText, toggledAllergens);
  
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
    hasCrossContactRisk: evaluation.hasCrossContactRisk || false,
    suggestedServerQuestions: evaluation.suggestedServerQuestions || []
  };
}

module.exports = {
  evaluateFriedFood,
  buildFriedFoodContext
};

