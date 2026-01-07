/**
 * MenYOU Local Knowledge Aggregator
 * 
 * This module aggregates outcomes from all Local Knowledge modules
 * and provides a unified interface for menu analysis.
 * 
 * Local Knowledge runs BEFORE AI reasoning to provide deterministic,
 * safety-focused guidance about common dishes, ingredients, and preparation methods.
 */

const { buildSauceCautionContext } = require('./menuParsing');
const { buildSaladDressingContext } = require('./saladDressingEvaluation');
const { buildAsianFoodContext } = require('./asianFoodEvaluation');
const { buildPastaItalianContext } = require('./pastaItalianEvaluation');
const { buildMexicanFoodContext } = require('./mexicanFoodEvaluation');
const { buildFriedFoodContext } = require('./friedFoodEvaluation');
const { buildBurgerContext } = require('./burgerEvaluation');
const { buildSandwichContext } = require('./sandwichEvaluation');
const { buildBreakfastContext } = require('./breakfastEvaluation');
const { buildStructuralDishContext } = require('./structuralDishEvaluation');
const { buildItalianSandwichContext } = require('./italianSandwichEvaluation');
const { buildAsianNoodlesContext } = require('./asianNoodlesEvaluation');
const { buildAsianAppsContext } = require('./asianAppsEvaluation');
const { buildQuestionLayer } = require('./questionLayer');

/**
 * Build Local Knowledge context for a menu item
 * Aggregates outcomes from all knowledge modules
 * 
 * @param {string} menuText - Menu item name and description combined
 * @param {Object} toggledAllergens - { gluten: boolean, dairy: boolean }
 * @returns {Object|null} Aggregated Local Knowledge context or null
 */
function buildLocalKnowledgeContext(menuText, toggledAllergens) {
  // Return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  // Define all context builders with their category names
  const contextBuilders = {
    structural: buildStructuralDishContext,
    sauces: buildSauceCautionContext,
    salads: buildSaladDressingContext,
    asian: buildAsianFoodContext,
    pasta: buildPastaItalianContext,
    mexican: buildMexicanFoodContext,
    fried: buildFriedFoodContext,
    burger: buildBurgerContext,
    sandwich: buildSandwichContext,
    breakfast: buildBreakfastContext,
    italianSandwich: buildItalianSandwichContext,
    asianNoodles: buildAsianNoodlesContext,
    asianApps: buildAsianAppsContext
  };

  // Call each context builder and collect outcomes
  const allOutcomes = [];
  const detectedNames = new Set();
  const triggeredModules = [];

  for (const [category, builder] of Object.entries(contextBuilders)) {
    try {
      const context = builder(menuText, toggledAllergens);
      
      if (context && context.evaluation) {
        // Extract evaluation object and add category
        const outcome = {
          ...context.evaluation,
          category: category
        };
        
        // Extract item name from context (varies by module)
        const name = context.saucesDetected?.[0] || 
                     context.detectedItemName || 
                     context.itemName ||
                     category;
        
        // Add itemName to outcome for formatting
        outcome.itemName = name;
        
        // Create deduplication key: name + outcome + allergenSummary
        const outcomeType = outcome.outcome || outcome.internalOutcome || 'unknown';
        const allergenSummaryStr = Array.isArray(outcome.allergenSummary) 
          ? outcome.allergenSummary.sort().join(',') 
          : '';
        const dedupeKey = `${name}|${outcomeType}|${allergenSummaryStr}`;
        
        // Only add if not already seen
        if (!detectedNames.has(dedupeKey)) {
          detectedNames.add(dedupeKey);
          
          // Track triggered module
          if (!triggeredModules.includes(category)) {
            triggeredModules.push(category);
          }
          
          allOutcomes.push(outcome);
          
          // Track detected name for summary (only actual item names, not dedupe keys)
          if (name && name !== category && !name.includes('|')) {
            detectedNames.add(name);
          }
        }
      }
    } catch (error) {
      // Silently skip modules that error (graceful degradation)
      console.error(`Error in ${category} context builder:`, error.message);
    }
  }

  // If no outcomes, check if we should generate a generic CAUTION for proteins with dairy
  if (allOutcomes.length === 0) {
    const normalizedText = menuText.toLowerCase();
    const proteinWords = ['steak', 'salmon', 'chicken', 'beef', 'pork', 'fish', 'shrimp', 'turkey', 'lamb', 'strip'];
    const hasProtein = proteinWords.some(word => normalizedText.includes(word));
    
    // Generate generic CAUTION for proteins when dairy is toggled (butter finish risk)
    if (hasProtein && toggledAllergens.dairy && !toggledAllergens.gluten) {
      const questions = buildQuestionLayer({
        inputText: menuText,
        toggledAllergens: toggledAllergens,
        triggeredModules: [],
        outcome: 'CAUTION'
      });
      
      if (questions.askServer.length > 0) {
        allOutcomes.push({
          outcome: 'CAUTION',
          internalOutcome: 'CAUTION',
          category: 'protein',
          allergenSummary: ['dairy'],
          guidance: 'May be cooked or finished with butter or dairy',
          askServer: questions.askServer,
          orderItLikeThis: questions.orderItLikeThis,
          itemName: menuText
        });
        triggeredModules.push('protein');
      }
    }
  }

  // If still no outcomes, return null
  if (allOutcomes.length === 0) {
    return null;
  }

  // Add question layer to each outcome
  for (const outcome of allOutcomes) {
    const outcomeType = outcome.outcome || outcome.internalOutcome;
    if (outcomeType === 'CAUTION' || outcomeType === 'NOT AN OPTION') {
      // Only add questions if they don't already exist (for generic protein outcomes)
      if (!outcome.askServer) {
        const questions = buildQuestionLayer({
          inputText: menuText,
          toggledAllergens: toggledAllergens,
          triggeredModules: triggeredModules,
          outcome: outcomeType
        });
        outcome.askServer = questions.askServer;
        outcome.orderItLikeThis = questions.orderItLikeThis;
        outcome.bestReason = questions.bestReason;
      } else if (!outcome.bestReason) {
        // If questions exist but bestReason doesn't, generate it
        const questions = buildQuestionLayer({
          inputText: menuText,
          toggledAllergens: toggledAllergens,
          triggeredModules: triggeredModules,
          outcome: outcomeType
        });
        outcome.bestReason = questions.bestReason;
      }
    }
  }

  // Sort outcomes by severity: NOT AN OPTION first, then CAUTION
  allOutcomes.sort((a, b) => {
    const aSeverity = a.outcome === 'NOT AN OPTION' ? 0 : 1;
    const bSeverity = b.outcome === 'NOT AN OPTION' ? 0 : 1;
    return aSeverity - bSeverity;
  });

  // Build summary strings (1-3 short strings for AI context)
  const summary = [];
  const notAnOptionCount = allOutcomes.filter(o => o.outcome === 'NOT AN OPTION').length;
  const cautionCount = allOutcomes.filter(o => o.outcome === 'CAUTION').length;
  
  if (notAnOptionCount > 0) {
    const allergenList = Array.from(new Set(
      allOutcomes
        .filter(o => o.outcome === 'NOT AN OPTION')
        .flatMap(o => o.allergenSummary || [])
    )).join(' and/or ');
    summary.push(`This item contains ${allergenList} as a core ingredient that cannot be removed.`);
  }
  
  if (cautionCount > 0) {
    const allergenList = Array.from(new Set(
      allOutcomes
        .filter(o => o.outcome === 'CAUTION')
        .flatMap(o => o.allergenSummary || [])
    )).join(' and/or ');
    summary.push(`This item may contain ${allergenList} depending on preparation or ingredients.`);
  }
  
  // Add specific guidance if available (limit to 1 additional item)
  if (allOutcomes.length > 0 && summary.length < 3) {
    const firstOutcome = allOutcomes[0];
    if (firstOutcome.guidance && firstOutcome.guidance.length < 100) {
      summary.push(firstOutcome.guidance);
    }
  }

  // Convert detectedNames Set to array (remove dedupe keys, keep actual names)
  const detectedArray = Array.from(detectedNames).filter(name => !name.includes('|'));

  return {
    detected: detectedArray,
    outcomes: allOutcomes,
    summary: summary.slice(0, 3) // Ensure max 3 summary items
  };
}

module.exports = {
  buildLocalKnowledgeContext
};

