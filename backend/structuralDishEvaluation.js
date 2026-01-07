/**
 * MenYOU Structural Dish Evaluation Logic
 * 
 * This module evaluates structural dishes to determine guidance outcomes.
 * 
 * Core rule:
 * All structural dishes return NOT AN OPTION when matched.
 * These are dishes where removing the allergen fundamentally changes the dish.
 * 
 * Outcomes:
 * - NOT AN OPTION: Always (when matched and relevant allergens are toggled)
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractStructuralDishesFromText
} = require('./structuralDishKnowledge');

/**
 * Evaluate a structural dish and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateStructuralDish(menuItemText, toggledAllergens) {
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

  // Check for structural dishes
  const matchedDishes = extractStructuralDishesFromText(menuItemText);
  if (matchedDishes.length === 0) {
    return null;
  }

  // Find the first dish where toggled allergens intersect with structural allergens
  const relevantDish = matchedDishes.find(dish => {
    const structuralAllergens = dish.structuralAllergens || [];
    return toggledArray.some(allergen => structuralAllergens.includes(allergen));
  });

  if (!relevantDish) {
    return null;
  }

  // Build allergenSummary from toggled allergens that are in structuralAllergens
  const allergenSummary = toggledArray.filter(allergen => 
    relevantDish.structuralAllergens.includes(allergen)
  );

  // Must have at least one relevant allergen
  if (allergenSummary.length === 0) {
    return null;
  }

  // Build guidance message
  const allergenList = allergenSummary.join(' and/or ');
  const guidance = `${relevantDish.whyStructural || 'This dish contains structural allergens that cannot be removed'}.`;

  // Build server questions
  const serverQuestions = relevantDish.suggestedServerQuestions || [
    `Is there a ${allergenSummary.includes('gluten') ? 'gluten-free' : ''}${allergenSummary.includes('gluten') && allergenSummary.includes('dairy') ? ' and ' : ''}${allergenSummary.includes('dairy') ? 'dairy-free' : ''} version available?`
  ];

  return {
    outcome: 'NOT AN OPTION',
    internalOutcome: 'NOT AN OPTION',
    guidance: guidance,
    reasonNotOption: relevantDish.whyStructural || 'Structural allergens cannot be removed',
    allergenSummary: allergenSummary,
    hasStructuralAllergen: true,
    structuralAllergens: allergenSummary.map(a => ({ allergen: a })),
    suggestedServerQuestions: serverQuestions.slice(0, 2)
  };
}

/**
 * Build structural dish context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Structural dish context object
 */
function buildStructuralDishContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateStructuralDish(menuItemText, toggledAllergens);
  
  if (!evaluation) {
    return null; // No match found
  }

  // Extract dish name for itemName
  const matchedDishes = extractStructuralDishesFromText(menuItemText);
  const itemName = matchedDishes.length > 0 ? matchedDishes[0].itemName : 'Structural Dish';

  return {
    detected: true,
    evaluation: evaluation,
    itemName: itemName,
    hasCaution: false,
    isNotAnOption: true,
    guidance: evaluation.guidance,
    internalOutcome: evaluation.internalOutcome,
    suggestedServerQuestions: evaluation.suggestedServerQuestions || []
  };
}

module.exports = {
  evaluateStructuralDish,
  buildStructuralDishContext
};

