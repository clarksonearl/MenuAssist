/**
 * MenYOU Italian Sandwich Evaluation Logic
 * 
 * This module evaluates Italian fast-casual sandwiches to determine guidance outcomes.
 * 
 * Core rule:
 * Italian sandwiches often have structural gluten (bread) and/or dairy (cheese),
 * with varying degrees of modifiability depending on the specific item.
 * 
 * Outcomes:
 * - NOT AN OPTION: When gluten and/or dairy are structural and not realistically removable
 * - CAUTION: When allergens are commonly present but plausibly modifiable
 * 
 * This logic applies BEFORE AI reasoning.
 */

const {
  extractItalianSandwichesFromText,
  getItalianSandwichKnowledge
} = require('./italianSandwichKnowledge');

const { normalizeName } = require('./sauceKnowledge');

/**
 * Evaluate an Italian sandwich item and determine guidance outcome
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Evaluation result with outcome and guidance
 */
function evaluateItalianSandwich(menuItemText, toggledAllergens) {
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

  // Check for Italian sandwiches
  const matchedSandwiches = extractItalianSandwichesFromText(menuItemText);
  if (matchedSandwiches.length === 0) {
    return null;
  }

  const sandwich = matchedSandwiches[0];

  // Find allergens that intersect with toggled allergens
  const structuralAllergens = sandwich.structuralAllergens || [];
  let relevantAllergens = toggledArray.filter(allergen => 
    structuralAllergens.includes(allergen)
  );

  // For Italian sandwiches, dairy is commonly present even if not structural
  // Include dairy in relevantAllergens if toggled and gluten is structural (common pattern)
  // OR if dairy is toggled and this is a dairy-common sandwich (like Caprese)
  if (toggledArray.includes('dairy') && !relevantAllergens.includes('dairy')) {
    // Check if this sandwich commonly has dairy (most Italian sandwiches do)
    const commonlyHasDairy = ['Meatball', 'Italian Sub', 'Caprese', 
                              'Sausage', 'Italian Beef', 'Bruschetta', 
                              'Panini'].some(name => 
      sandwich.itemName.includes(name)
    );
    if (commonlyHasDairy) {
      relevantAllergens.push('dairy');
    }
  }

  // Must have at least one relevant allergen
  if (relevantAllergens.length === 0) {
    return null;
  }

  // Determine outcome based on structural allergens
  // Items with BOTH gluten AND dairy structural → NOT AN OPTION
  // Items with only gluten structural (dairy optional/removable) → CAUTION
  // Items with only dairy structural (uncommon for Italian sandwiches) → CAUTION
  
  const hasBothStructural = structuralAllergens.length === 2 && 
                           structuralAllergens.includes('gluten') && 
                           structuralAllergens.includes('dairy');
  
  const allToggledAreStructural = toggledArray.every(allergen => 
    structuralAllergens.includes(allergen)
  );

  // Build allergenSummary from toggled allergens
  // Include structural allergens, and also dairy if commonly present in Italian sandwiches
  const allergenSummary = [];
  
  // Always include structural allergens if toggled
  for (const allergen of toggledArray) {
    if (structuralAllergens.includes(allergen)) {
      allergenSummary.push(allergen);
    }
  }
  
  // For Italian sandwiches, dairy is commonly present even if not structural
  // Include it in allergenSummary if toggled and gluten is structural (common pattern)
  if (toggledArray.includes('dairy') && 
      !allergenSummary.includes('dairy') && 
      structuralAllergens.includes('gluten')) {
    // Check if this sandwich commonly has dairy (most Italian sandwiches do)
    // Include Caprese, Panini, Meatball, Italian Sub, Sausage & Peppers, Italian Beef, Bruschetta
    const commonlyHasDairy = ['Meatball', 'Italian Sub', 'Caprese', 
                              'Sausage', 'Italian Beef', 'Bruschetta', 
                              'Panini'].some(name => 
      sandwich.itemName.includes(name)
    );
    if (commonlyHasDairy) {
      allergenSummary.push('dairy');
    }
  }

  // Must have at least one allergen in summary
  if (allergenSummary.length === 0) {
    return null;
  }

  // Determine outcome
  let outcome;
  let guidance;
  
  if (hasBothStructural && allToggledAreStructural) {
    // Both gluten and dairy are structural (e.g., chicken parm, eggplant parm, garlic bread sandwich)
    outcome = 'NOT AN OPTION';
    const allergenList = allergenSummary.join(' and ');
    guidance = `${sandwich.whyStructural || `This item contains ${allergenList} as core structural components that cannot be removed`}.`;
  } else {
    // Single structural allergen (gluten) or dairy is optional/removable
    // Default to CAUTION for modifiable items
    outcome = 'CAUTION';
    const allergenList = allergenSummary.join(' and/or ');
    guidance = `${sandwich.whyStructural || `This item typically contains ${allergenList}, but may be modifiable`}.`;
  }

  // Build server questions
  const serverQuestions = sandwich.suggestedServerQuestions || [
    `Can I get this without ${allergenSummary.join(' or ')}?`
  ];

  return {
    outcome: outcome,
    internalOutcome: outcome,
    guidance: guidance,
    allergenSummary: allergenSummary,
    hasStructuralAllergen: allToggledAreStructural,
    structuralAllergens: relevantAllergens.map(a => ({ allergen: a })),
    suggestedServerQuestions: serverQuestions.slice(0, 3)
  };
}

/**
 * Build Italian sandwich context for a menu item
 * @param {string} menuItemText - Menu item name and description combined
 * @param {Object} toggledAllergens - Object with gluten and/or dairy as boolean properties
 * @returns {Object} Italian sandwich context object
 */
function buildItalianSandwichContext(menuItemText, toggledAllergens) {
  // Global toggle gating: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateItalianSandwich(menuItemText, toggledAllergens);
  
  if (!evaluation) {
    return null; // No match found
  }

  // Suppress GENERALLY OK: only return CAUTION or NOT AN OPTION
  if (evaluation.outcome !== 'CAUTION' && evaluation.outcome !== 'NOT AN OPTION') {
    return null; // Don't include GENERALLY OK
  }

  // Extract item name for context
  const matchedSandwiches = extractItalianSandwichesFromText(menuItemText);
  const itemName = matchedSandwiches.length > 0 ? matchedSandwiches[0].itemName : 'Italian Sandwich';

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
  evaluateItalianSandwich,
  buildItalianSandwichContext
};

