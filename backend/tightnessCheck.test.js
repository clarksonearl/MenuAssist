/**
 * MenYOU Tightness Check Test Harness
 * 
 * Validates that Local Knowledge matching is NOT over-triggering.
 * Ensures only relevant CAUTION/NOT_AN_OPTION outcomes are returned.
 * 
 * NOTE: Some knowledge modules may not be fully refactored yet.
 * This test will help identify which modules need updates.
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
const { buildLocalKnowledgeContext } = require('./localKnowledgeAggregator');

/**
 * Check if any outcome in the array has the specified allergen in its allergenSummary
 * @param {Array} outcomes - Array of outcome objects (flattened)
 * @param {string} allergen - Allergen to check for ('gluten' or 'dairy')
 * @returns {boolean} True if any outcome has the allergen in its allergenSummary
 */
function hasAllergen(outcomes, allergen) {
  if (!Array.isArray(outcomes)) return false;
  return outcomes.some(o => {
    // Outcomes are already flattened evaluation objects, so check o.allergenSummary directly
    const allergenSummary = o.allergenSummary;
    return Array.isArray(allergenSummary) && allergenSummary.includes(allergen);
  });
}

/**
 * Run all knowledge checks on a menu item
 * @param {string} menuItemText - Menu item text
 * @param {Object} toggledAllergens - { gluten: boolean, dairy: boolean }
 * @returns {Object} Combined results from all knowledge modules
 */
function checkMenuItem(menuItemText, toggledAllergens) {
  const results = {};
  
  // Safely call each context builder (some modules may not be fully refactored)
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

  for (const [key, builder] of Object.entries(contextBuilders)) {
    try {
      results[key] = builder(menuItemText, toggledAllergens);
    } catch (error) {
      console.error(`Error in ${key} context builder:`, error.message);
      results[key] = null;
    }
  }

  // Filter out null results
  const nonNullResults = {};
  for (const [key, value] of Object.entries(results)) {
    if (value !== null) {
      nonNullResults[key] = value;
    }
  }

  return {
    hasOutcomes: Object.keys(nonNullResults).length > 0,
    outcomes: nonNullResults,
    allResults: results
  };
}

/**
 * Global assertion: Validate all non-null outcomes
 * @param {Object} result - Result from checkMenuItem
 * @returns {Object} { passed: boolean, errors: string[] }
 */
function validateGlobalAssertions(result) {
  const errors = [];

  // Check all non-null outcomes
  for (const [moduleName, outcome] of Object.entries(result.outcomes)) {
    // Assertion 1: All non-null outcomes must be CAUTION or NOT AN OPTION
    const outcomeType = outcome.evaluation?.outcome || outcome.internalOutcome;
    if (outcomeType !== 'CAUTION' && outcomeType !== 'NOT AN OPTION') {
      errors.push(`${moduleName}: Outcome must be CAUTION or NOT AN OPTION, got ${outcomeType}`);
    }

    // Assertion 2: Check for allergenSummary (if it exists in structure)
    // Note: Some modules may not have allergenSummary yet, so we check if it exists
    if (outcome.evaluation?.allergenSummary !== undefined) {
      const allergenSummary = outcome.evaluation.allergenSummary;
      if (!Array.isArray(allergenSummary) || allergenSummary.length === 0) {
        errors.push(`${moduleName}: allergenSummary must be a non-empty array`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors: errors
  };
}

/**
 * Check if a specific module is present in outcomes
 * @param {Object} outcomes - Outcomes object from checkMenuItem
 * @param {string} moduleName - Module name to check for
 * @returns {boolean} True if module is present
 */
function hasModule(outcomes, moduleName) {
  return outcomes && outcomes[moduleName] !== null && outcomes[moduleName] !== undefined;
}

/**
 * Assert test case
 */
function assertTestCase(testCase) {
  const result = checkMenuItem(testCase.input, testCase.toggledAllergens);
  
  // Run global assertions
  const globalValidation = validateGlobalAssertions(result);
  if (!globalValidation.passed) {
    console.log(`  ❌ GLOBAL ASSERTION FAILED:`);
    globalValidation.errors.forEach(err => console.log(`    - ${err}`));
    return false;
  }

  const passed = testCase.shouldTrigger 
    ? result.hasOutcomes 
    : !result.hasOutcomes;

  // Additional checks for should-trigger cases
  if (testCase.shouldTrigger && result.hasOutcomes) {
    // Check expected module
    if (testCase.expectedModule) {
      if (!result.outcomes[testCase.expectedModule]) {
        console.log(`  ⚠️  Warning: Expected ${testCase.expectedModule} module but not found`);
      }
    }

    // Flatten all outcomes across modules into a single array
    // Module contexts have shape: { detected: true, evaluation: { outcome, allergenSummary, ... }, ... }
    // Extract evaluation objects from each module context
    const allOutcomes = Object.values(result.outcomes)
      .filter(Boolean) // Remove null/undefined
      .map(ctx => ctx.evaluation) // Extract evaluation object from each context
      .filter(Boolean); // Remove any null/undefined evaluations

    // Build expected allergens array from toggled allergens
    const expectedAllergens = [];
    if (testCase.toggledAllergens.gluten) expectedAllergens.push('gluten');
    if (testCase.toggledAllergens.dairy) expectedAllergens.push('dairy');

    // Validate allergenSummary using the helper function
    // Check that allergenSummary includes expected allergens (informational warnings only)
    if (expectedAllergens.includes('gluten') && !hasAllergen(allOutcomes, 'gluten')) {
      console.warn(`  ⚠️  Warning: Expected gluten allergenSummary but not found`);
    }
    if (expectedAllergens.includes('dairy') && !hasAllergen(allOutcomes, 'dairy')) {
      console.warn(`  ⚠️  Warning: Expected dairy allergenSummary but not found`);
    }

    // Check that allergenSummary does NOT include untoggled allergens (this is an error)
    if (!testCase.toggledAllergens.gluten && hasAllergen(allOutcomes, 'gluten')) {
      console.log(`  ❌ ERROR: allergenSummary includes gluten but gluten not toggled`);
      return false;
    }
    if (!testCase.toggledAllergens.dairy && hasAllergen(allOutcomes, 'dairy')) {
      console.log(`  ❌ ERROR: allergenSummary includes dairy but dairy not toggled`);
      return false;
    }

    // Validate allergenSummary structure (this is an error if invalid)
    for (const [moduleName, outcome] of Object.entries(result.outcomes)) {
      if (outcome.evaluation?.allergenSummary !== undefined) {
        const allergenSummary = outcome.evaluation.allergenSummary;
        if (!Array.isArray(allergenSummary) || allergenSummary.length === 0) {
          console.log(`  ❌ ERROR: ${moduleName} has empty or invalid allergenSummary`);
          return false;
        }
      }
    }

    // Check expected outcome type
    if (testCase.expectedOutcome) {
      const hasExpectedOutcome = Object.values(result.outcomes).some(r => {
        const outcome = r.evaluation?.outcome || r.internalOutcome;
        return outcome === testCase.expectedOutcome;
      });
      if (!hasExpectedOutcome) {
        console.log(`  ⚠️  Warning: Expected ${testCase.expectedOutcome} but not found`);
      }
    }

    // Check for bread mention if required (still using text matching for this)
    if (testCase.mustMentionBread) {
      const allGuidance = Object.values(result.outcomes)
        .map(r => r.guidance || r.evaluation?.guidance || '')
        .join(' ')
        .toLowerCase();
      const mentionsBread = allGuidance.includes('bread') || allGuidance.includes('bun') || 
                           allGuidance.includes('pita') || allGuidance.includes('roll');
      if (!mentionsBread) {
        console.log(`  ⚠️  Warning: Expected bread mention but not found`);
      }
    }
  }

  // Handle conditional tests (like chicken wings with sauce on side)
  if (testCase.allowFryerCaution && !testCase.shouldTrigger) {
    // Allow fryer CAUTION if "fried" appears in input
    if (testCase.input.toLowerCase().includes('fried')) {
      const hasFryerCaution = Object.values(result.outcomes).some(r => {
        const outcome = r.evaluation?.outcome || r.internalOutcome;
        return outcome === 'CAUTION' && (r.evaluation?.hasCrossContactRisk || r.hasCrossContactRisk);
      });
      if (hasFryerCaution) {
        // This is acceptable - fryer cross-contact CAUTION
        return true;
      }
    }
  }

  return passed;
}

// ================================================
// TEST CASES — SHOULD TRIGGER
// ================================================

const shouldTriggerTests = [
  {
    name: 'BBQ wings (gluten toggled)',
    input: 'BBQ wings',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION'
  },
  {
    name: 'Buffalo wings (dairy toggled)',
    input: 'Buffalo wings',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'CAUTION'
  },
  {
    name: 'Caesar salad (gluten toggled)',
    input: 'Caesar salad',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION'
  },
  {
    name: 'Caesar salad (dairy toggled)',
    input: 'Caesar salad',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION'
  },
  {
    name: 'Tempura shrimp (gluten toggled)',
    input: 'Tempura shrimp',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION'
  },
  {
    name: 'Chicken alfredo (dairy toggled)',
    input: 'Chicken alfredo',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'pasta'
  },
  {
    name: '5 cheese ziti (dairy toggled)',
    input: '5 cheese ziti',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'pasta'
  },
  {
    name: 'Flour tortilla tacos (gluten toggled)',
    input: 'Flour tortilla tacos',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION'
  },
  {
    name: 'Shrimp scampi (dairy toggled)',
    input: 'Shrimp scampi',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Spinach and artichoke dip (dairy toggled)',
    input: 'Spinach and artichoke dip',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Five cheese ziti (dairy toggled)',
    input: 'Five cheese ziti',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Five cheese ziti (gluten toggled)',
    input: 'Five cheese ziti',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Chicken parmesan (gluten toggled)',
    input: 'Chicken parmesan',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Chicken parm (gluten toggled)',
    input: 'Chicken parm',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  }
];

// ================================================
// TEST CASES — SHOULD NOT TRIGGER
// ================================================

const shouldNotTriggerTests = [
  {
    name: 'Chicken (generic)',
    input: 'Chicken',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Rice bowl (generic)',
    input: 'Rice bowl',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Sauce (vague token)',
    input: 'Sauce',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Salad (vague token)',
    input: 'Salad',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Pasta (wheat-based, gluten toggled)',
    input: 'Pasta',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true, // Pasta should trigger for gluten (wheat-based)
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION'
  },
  {
    name: 'Grilled chicken (no allergens toggled)',
    input: 'Grilled chicken',
    toggledAllergens: { gluten: false, dairy: false },
    shouldTrigger: false
  },
  {
    name: 'Tortilla (ambiguous)',
    input: 'Tortilla',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Needs "corn" or "flour" context
  },
  {
    name: 'Steak (modifiable)',
    input: 'Steak',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false // Modifiable via "no butter" - not structural
  },
  {
    name: 'Tacos (generic)',
    input: 'Tacos',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Should be handled by mexican module, not structural
  },
  {
    name: 'Chicken salad (generic)',
    input: 'Chicken salad',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false // Generic tokens only; do not match salads unless caesar/ranch/blue cheese etc
  },
  {
    name: 'Rice (generic)',
    input: 'Rice',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false
  },
  {
    name: 'Sauce (vague token)',
    input: 'Sauce',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Tortilla chips (not tortillas)',
    input: 'Tortilla chips',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Do not treat tortilla chips as tortillas; unless explicit flour/corn tortilla wording exists
  },
  {
    name: 'Add parmesan (not structural)',
    input: 'Add parmesan',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false // Generic "add parmesan" should not trigger structural dish
  },
  {
    name: 'Creamy (generic)',
    input: 'Creamy',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false // Generic "creamy" without pasta/sauce keywords should not trigger
  },
  {
    name: 'Tacos (generic, gluten toggled)',
    input: 'Tacos',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Generic "tacos" without qualifiers should not trigger (modifiable)
  },
  {
    name: 'Flour tortilla tacos (gluten toggled)',
    input: 'Flour tortilla tacos',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'mexican'
  },
  {
    name: 'Crispy tacos (gluten toggled)',
    input: 'Crispy tacos',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'mexican'
  },
  {
    name: 'Creamy vodka pasta (dairy toggled)',
    input: 'Creamy vodka pasta',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'pasta'
  },
  {
    name: 'Creamy chicken (dairy toggled)',
    input: 'Creamy chicken',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: false // "Creamy chicken" without pasta keyword should not trigger
  },
  {
    name: 'Creamy (generic, gluten and dairy toggled)',
    input: 'Creamy',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false // Generic "Creamy" without pasta/sauce keywords should not trigger
  },
  {
    name: 'Pizza bowl (gluten and dairy toggled)',
    input: 'Pizza bowl',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false // Pizza bowl is crustless/modifiable - should NOT match structural pizza
  },
  {
    name: 'Crustless pizza (gluten toggled)',
    input: 'Crustless pizza',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Crustless pizza is modifiable - should NOT match structural pizza
  },
  {
    name: 'Garlic knots (gluten toggled)',
    input: 'Garlic knots',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Plain garlic knots without cheese should NOT match cheesy family
  },
  {
    name: 'Marinara sauce (gluten toggled)',
    input: 'Marinara sauce',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Marinara sauce should not match pizza
  },
  {
    name: 'Flatbread (gluten toggled)',
    input: 'Flatbread',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // Generic "flatbread" alone should not match
  },
  {
    name: 'Pepperoni (gluten toggled)',
    input: 'Pepperoni',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: false // "Pepperoni" alone should not match pizza
  },
];

// ================================================
// EDGE CASES — SHOULD NOT TRIGGER PASTA
// ================================================
// These tests ensure "cream/creamy" phrases do NOT route into the PASTA module
// unless pasta/sauce context exists. Other modules (salads, sauces, etc.) may
// correctly match these items, but pasta must never appear.

const shouldNotTriggerPastaTests = [
  {
    name: 'Ice cream (dairy toggled)',
    input: 'Ice cream',
    toggledAllergens: { gluten: false, dairy: true },
    // Outcomes may be null or desserts later, but MUST NOT include pasta
  },
  {
    name: 'Creamy ranch (dairy toggled)',
    input: 'Creamy ranch',
    toggledAllergens: { gluten: false, dairy: true },
    // May match salads/sauces, but MUST NOT include pasta
  },
  {
    name: 'Cream sauce salmon (dairy toggled)',
    input: 'Cream sauce salmon',
    toggledAllergens: { gluten: false, dairy: true },
    // May match sauces later, but MUST NOT include pasta
  },
  {
    name: 'Creamy coleslaw (dairy toggled)',
    input: 'Creamy coleslaw',
    toggledAllergens: { gluten: false, dairy: true },
    // Must NOT include pasta
  },
  {
    name: 'Cream sauce (dairy toggled)',
    input: 'Cream sauce',
    toggledAllergens: { gluten: false, dairy: true },
    // Pasta must be absent (null outcome is fine)
  },
  {
    name: 'Ranch (dairy toggled)',
    input: 'Ranch',
    toggledAllergens: { gluten: false, dairy: true },
    // Must NOT include pasta, but SHOULD include salads module with NOT AN OPTION
    expectSaladsModule: true,
    expectSaladsOutcome: 'NOT AN OPTION',
    expectSaladsAllergen: 'dairy'
  }
];

/**
 * Assert that pasta module does NOT trigger for a test case
 * @param {Object} testCase - Test case object
 * @returns {boolean} True if pasta module is not present and any additional expectations are met
 */
function assertNoPastaTestCase(testCase) {
  const result = checkMenuItem(testCase.input, testCase.toggledAllergens);
  
  // Run global assertions
  const globalValidation = validateGlobalAssertions(result);
  if (!globalValidation.passed) {
    console.log(`  ❌ GLOBAL ASSERTION FAILED:`);
    globalValidation.errors.forEach(err => console.log(`    - ${err}`));
    return false;
  }

  // Check that pasta module is NOT present
  const pastaPresent = hasModule(result.outcomes, 'pasta');
  if (pastaPresent) {
    return false; // Pasta must not be present
  }

  // If test case expects a specific module (e.g., salads), verify it
  if (testCase.expectSaladsModule) {
    const saladsPresent = hasModule(result.outcomes, 'salads');
    if (!saladsPresent) {
      console.log(`  ⚠️  Warning: Expected salads module but not found`);
      return false;
    }

    const saladsOutcome = result.outcomes.salads?.evaluation?.outcome || result.outcomes.salads?.internalOutcome;
    if (testCase.expectSaladsOutcome && saladsOutcome !== testCase.expectSaladsOutcome) {
      console.log(`  ⚠️  Warning: Expected salads outcome "${testCase.expectSaladsOutcome}", got "${saladsOutcome}"`);
      return false;
    }

    const saladsAllergenSummary = result.outcomes.salads?.evaluation?.allergenSummary || [];
    if (testCase.expectSaladsAllergen && !saladsAllergenSummary.includes(testCase.expectSaladsAllergen)) {
      console.log(`  ⚠️  Warning: Expected salads allergenSummary to include "${testCase.expectSaladsAllergen}", got ${JSON.stringify(saladsAllergenSummary)}`);
      return false;
    }
  }

  return true; // Pasta absent and any additional expectations met
}

// ================================================
// EDGE CASES — SHOULD TRIGGER
// ================================================

const edgeCaseShouldTriggerTests = [
  {
    name: 'Cream sauce fettuccine (dairy toggled)',
    input: 'Cream sauce fettuccine',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'pasta'
  },
  {
    name: 'Spaghetti in cream sauce (dairy toggled)',
    input: 'Spaghetti in cream sauce',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'pasta'
  },
  {
    name: 'Pepperoni pizza (gluten toggled)',
    input: 'Pepperoni pizza',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Cheese pizza (dairy toggled)',
    input: 'Cheese pizza',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Stuffed crust pizza (gluten toggled)',
    input: 'Stuffed crust pizza',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Calzone (gluten toggled)',
    input: 'Calzone',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Stromboli (dairy toggled)',
    input: 'Stromboli',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Cheesy bread (gluten toggled)',
    input: 'Cheesy bread',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Garlic knots with cheese (dairy toggled)',
    input: 'Garlic knots with cheese',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'structural'
  },
  {
    name: 'Fried rice (gluten toggled)',
    input: 'Fried rice',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'asian'
  },
  {
    name: 'Lo mein (gluten toggled)',
    input: 'Lo mein',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'asian'
  },
  {
    name: 'Gyro on pita (gluten toggled)',
    input: 'Gyro on pita',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION', // or NOT AN OPTION depending on sandwich/bread rules
    mustMentionBread: true
  }
];

// ================================================
// ITALIAN SANDWICHES — SHOULD TRIGGER
// ================================================

const italianSandwichShouldTriggerTests = [
  {
    name: 'Meatball sub (gluten toggled)',
    input: 'Meatball sub',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'italianSandwich'
  },
  {
    name: 'Chicken parm sub (gluten toggled)',
    input: 'Chicken parm sub',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'italianSandwich'
  },
  {
    name: 'Eggplant parmesan sandwich (dairy toggled)',
    input: 'Eggplant parmesan sandwich',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'italianSandwich'
  },
  {
    name: 'Italian sub (gluten toggled)',
    input: 'Italian sub',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'italianSandwich'
  },
  {
    name: 'Caprese sandwich (dairy toggled)',
    input: 'Caprese sandwich',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'CAUTION',
    expectedModule: 'italianSandwich'
  },
  {
    name: 'Sausage and peppers sub (gluten toggled)',
    input: 'Sausage and peppers sub',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'italianSandwich'
  },
  {
    name: 'Panini with pesto and mozzarella (dairy toggled)',
    input: 'Panini with pesto and mozzarella',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'CAUTION',
    expectedModule: 'italianSandwich'
  }
];

// ================================================
// ITALIAN SANDWICHES — SHOULD NOT TRIGGER
// ================================================

const italianSandwichShouldNotTriggerTests = [
  {
    name: 'Sandwich (generic)',
    input: 'Sandwich',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Sub (generic)',
    input: 'Sub',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Panini (generic)',
    input: 'Panini',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Wrap (generic)',
    input: 'Wrap',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Chicken salad sandwich (generic)',
    input: 'Chicken salad sandwich',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Tacos (generic)',
    input: 'Tacos',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Sushi roll (generic)',
    input: 'Sushi roll',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Soup (generic)',
    input: 'Soup',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Pesto (single token)',
    input: 'Pesto',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Mozzarella (single token)',
    input: 'Mozzarella',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  }
];

// ================================================
// EDGE CASES — SHOULD NOT TRIGGER (or conditional)
// ================================================

const edgeCaseConditionalTests = [
  {
    name: 'Chicken wings (naked), sauce on the side',
    input: 'Chicken wings (naked), sauce on the side',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false, // CAUTION only if a specific sauce is named; since none is named, expect null or fryer CAUTION only if "fried" appears
    allowFryerCaution: true // Allow fryer CAUTION if "fried" appears
  }
];

// ================================================
// BREAKFAST / BRUNCH — SHOULD TRIGGER
// ================================================

const breakfastShouldTriggerTests = [
  {
    name: 'Pancakes (gluten toggled)',
    input: 'Pancakes',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Buttermilk pancakes (dairy toggled)',
    input: 'Buttermilk pancakes',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Waffles (gluten toggled)',
    input: 'Waffles',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'French toast (gluten toggled)',
    input: 'French toast',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'French toast (dairy toggled)',
    input: 'French toast',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Omelet (gluten toggled) — fluffy batter risk',
    input: 'Omelet',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Denver omelet (gluten toggled) — fluffy batter risk',
    input: 'Denver omelet',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Scrambled eggs (fluffy) (gluten toggled) — batter risk',
    input: 'Scrambled eggs (fluffy)',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Cheese omelet (dairy toggled)',
    input: 'Cheese omelet',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Biscuits and gravy (gluten toggled)',
    input: 'Biscuits and gravy',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Biscuits and gravy (dairy toggled)',
    input: 'Biscuits and gravy',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Toast with butter (dairy toggled)',
    input: 'Toast with butter',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Gluten-free toast (dairy toggled) — butter risk still',
    input: 'Gluten-free toast',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Eggs Benedict (dairy toggled) — hollandaise',
    input: 'Eggs Benedict',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Hollandaise sauce (dairy toggled)',
    input: 'Hollandaise',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'sauces'
  },
  {
    name: 'Breakfast sandwich (gluten toggled)',
    input: 'Breakfast sandwich',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Breakfast burrito (gluten toggled)',
    input: 'Breakfast burrito',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Breakfast burrito with cheese (dairy toggled)',
    input: 'Breakfast burrito with cheese',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Hash browns (gluten toggled) — shared fryer risk',
    input: 'Hash browns',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Home fries (gluten toggled) — shared fryer/griddle risk',
    input: 'Home fries',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Breakfast sausage (gluten toggled) — binder risk',
    input: 'Breakfast sausage',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'CAUTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Cinnamon roll (gluten toggled)',
    input: 'Cinnamon roll',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Cinnamon roll (dairy toggled)',
    input: 'Cinnamon roll',
    toggledAllergens: { gluten: false, dairy: true },
    shouldTrigger: true,
    expectsGluten: false,
    expectsDairy: true,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  },
  {
    name: 'Chicken and waffles (gluten toggled)',
    input: 'Chicken and waffles',
    toggledAllergens: { gluten: true, dairy: false },
    shouldTrigger: true,
    expectsGluten: true,
    expectsDairy: false,
    expectedOutcome: 'NOT AN OPTION',
    expectedModule: 'breakfast'
  }
];

// ================================================
// BREAKFAST / BRUNCH — SHOULD NOT TRIGGER
// ================================================

const breakfastShouldNotTriggerTests = [
  {
    name: 'Eggs (generic)',
    input: 'Eggs',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Bacon (generic)',
    input: 'Bacon',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Fruit cup (generic)',
    input: 'Fruit cup',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Oatmeal (generic)',
    input: 'Oatmeal',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Avocado (generic)',
    input: 'Avocado',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Coffee (generic)',
    input: 'Coffee',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Breakfast (single token)',
    input: 'Breakfast',
    toggledAllergens: { gluten: true, dairy: true },
    shouldTrigger: false
  },
  {
    name: 'Omelet (no allergens toggled)',
    input: 'Omelet',
    toggledAllergens: { gluten: false, dairy: false },
    shouldTrigger: false
  }
];

// ================================================
// RUN TESTS
// ================================================

console.log('='.repeat(60));
console.log('MenYOU Tightness Check Test Harness');
console.log('='.repeat(60));
console.log();

let passedCount = 0;
let failedCount = 0;

console.log('SHOULD TRIGGER TESTS:');
console.log('-'.repeat(60));
for (const test of shouldTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('SHOULD NOT TRIGGER TESTS:');
console.log('-'.repeat(60));
for (const test of shouldNotTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    // Check if this test actually expects outcomes (shouldTrigger: true)
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('EDGE CASES — SHOULD TRIGGER:');
console.log('-'.repeat(60));
for (const test of edgeCaseShouldTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('EDGE CASES — SHOULD NOT TRIGGER PASTA:');
console.log('-'.repeat(60));
for (const test of shouldNotTriggerPastaTests) {
  const passed = assertNoPastaTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const moduleNames = Object.keys(result.outcomes);
    const hasPasta = hasModule(result.outcomes, 'pasta');
    const label = hasPasta ? ' (PASTA PRESENT - FAIL)' : ' (pasta absent - CORRECT)';
    console.log(`  Outcomes: ${moduleNames.join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      const highlight = (test.expectSaladsModule && key === 'salads') ? ' ⭐' : '';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})${highlight}`);
    }
  } else {
    console.log(`  Outcomes: none (null) - pasta absent - CORRECT`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('ITALIAN SANDWICHES — SHOULD TRIGGER:');
console.log('-'.repeat(60));
for (const test of italianSandwichShouldTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('ITALIAN SANDWICHES — SHOULD NOT TRIGGER:');
console.log('-'.repeat(60));
for (const test of italianSandwichShouldNotTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('ITALIAN SANDWICHES — SHOULD TRIGGER:');
console.log('-'.repeat(60));
for (const test of italianSandwichShouldTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('ITALIAN SANDWICHES — SHOULD NOT TRIGGER:');
console.log('-'.repeat(60));
for (const test of italianSandwichShouldNotTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('BREAKFAST / BRUNCH — SHOULD TRIGGER:');
console.log('-'.repeat(60));
for (const test of breakfastShouldTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('BREAKFAST / BRUNCH — SHOULD NOT TRIGGER:');
console.log('-'.repeat(60));
for (const test of breakfastShouldNotTriggerTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('ASIAN (NOODLES + APPS) — SHOULD TRIGGER:');
console.log('-'.repeat(60));
(function() {
  const test = { name: 'Lo mein (gluten toggled)', input: 'Lo mein', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Chow mein (gluten toggled)', input: 'Chow mein', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Udon noodle bowl (gluten toggled)', input: 'Udon noodle bowl', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Ramen (gluten toggled)', input: 'Ramen', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Pad thai (gluten toggled)', input: 'Pad thai', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'CAUTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Pho (gluten toggled)', input: 'Pho', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'CAUTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Pork dumplings (gluten toggled)', input: 'Pork dumplings', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Gyoza (gluten toggled)', input: 'Gyoza', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Wontons (gluten toggled)', input: 'Wontons', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Egg rolls (gluten toggled)', input: 'Egg rolls', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Tempura shrimp (gluten toggled)', input: 'Tempura shrimp', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Crab rangoon (dairy toggled)', input: 'Crab rangoon', toggledAllergens: { gluten: false, dairy: true }, shouldTrigger: true, expectsGluten: false, expectsDairy: true, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Cream cheese wontons (dairy toggled)', input: 'Cream cheese wontons', toggledAllergens: { gluten: false, dairy: true }, shouldTrigger: true, expectsGluten: false, expectsDairy: true, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Chow mein (gluten toggled)', input: 'Chow mein', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Udon noodle bowl (gluten toggled)', input: 'Udon noodle bowl', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Ramen (gluten toggled)', input: 'Ramen', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Pad thai (gluten toggled)', input: 'Pad thai', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'CAUTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Pho (gluten toggled)', input: 'Pho', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'CAUTION', expectedModule: 'asianNoodles' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Pork dumplings (gluten toggled)', input: 'Pork dumplings', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Gyoza (gluten toggled)', input: 'Gyoza', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Wontons (gluten toggled)', input: 'Wontons', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Egg rolls (gluten toggled)', input: 'Egg rolls', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Tempura shrimp (gluten toggled)', input: 'Tempura shrimp', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();

console.log();
console.log('ASIAN (NOODLES + APPS) — SHOULD NOT TRIGGER:');
console.log('-'.repeat(60));
(function() {
  const test = { name: 'Noodles (vague token)', input: 'Noodles', toggledAllergens: { gluten: true, dairy: true }, shouldTrigger: false };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Wontons (dairy toggled, should not trigger)', input: 'Wontons', toggledAllergens: { gluten: false, dairy: true }, shouldTrigger: false };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Cheese wontons (dairy toggled)', input: 'Cheese wontons', toggledAllergens: { gluten: false, dairy: true }, shouldTrigger: true, expectsGluten: false, expectsDairy: true, expectedOutcome: 'NOT AN OPTION', expectedModule: 'asianApps' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Soy (single token)', input: 'Soy', toggledAllergens: { gluten: true, dairy: true }, shouldTrigger: false };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Soy sauce (gluten toggled)', input: 'Soy sauce', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true, expectsGluten: true, expectsDairy: false, expectedOutcome: 'CAUTION', expectedModule: 'sauces' };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Sushi roll (generic)', input: 'Sushi roll', toggledAllergens: { gluten: true, dairy: true }, shouldTrigger: false };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Rice bowl (generic)', input: 'Rice bowl', toggledAllergens: { gluten: true, dairy: true }, shouldTrigger: false };
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    const isExpected = test.shouldTrigger === true;
    const label = isExpected ? '' : ' (UNEXPECTED)';
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}${label}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null) - CORRECT`);
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();

console.log();
console.log('EDGE CASES — CONDITIONAL:');
console.log('-'.repeat(60));
for (const test of edgeCaseConditionalTests) {
  const passed = assertTestCase(test);
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Toggled: gluten=${test.toggledAllergens.gluten}, dairy=${test.toggledAllergens.dairy}`);
  
  const result = checkMenuItem(test.input, test.toggledAllergens);
  if (result.hasOutcomes) {
    console.log(`  Outcomes: ${Object.keys(result.outcomes).join(', ')}`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = value.evaluation?.outcome || value.internalOutcome || 'unknown';
      const allergenSummary = value.evaluation?.allergenSummary || 'N/A';
      console.log(`    - ${key}: ${outcome} (allergenSummary: ${JSON.stringify(allergenSummary)})`);
    }
  } else {
    console.log(`  Outcomes: none (null)`);
  }
  console.log();
  
  if (passed) passedCount++;
  else failedCount++;
}

console.log();
console.log('QUESTION LAYER TESTS:');
console.log('-'.repeat(60));
(function() {
  const test = { name: 'Glazed salmon (dairy toggled)', input: 'Glazed salmon', toggledAllergens: { gluten: false, dairy: true }, shouldTrigger: true };
  const result = buildLocalKnowledgeContext(test.input, test.toggledAllergens);
  const passed = result && result.outcomes && result.outcomes.length > 0 &&
    result.outcomes.some(outcome => {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      const bestReason = outcome.bestReason || '';
      return Array.isArray(askServer) && 
        askServer.length >= 2 &&
        Array.isArray(orderItLikeThis) &&
        orderItLikeThis.length >= 2 &&
        askServer.some(q => q.includes('sauce') || q.includes('glaze') || q.includes('dressing')) &&
        bestReason.includes('Sauce') || bestReason.includes('glaze');
    });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (result && result.outcomes) {
    for (const outcome of result.outcomes) {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      const bestReason = outcome.bestReason || '';
      console.log(`  ${outcome.category}: askServer=${askServer.length}, orderItLikeThis=${orderItLikeThis.length}, bestReason="${bestReason}"`);
    }
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'KC Strip (dairy toggled)', input: 'KC Strip', toggledAllergens: { gluten: false, dairy: true }, shouldTrigger: true };
  const result = buildLocalKnowledgeContext(test.input, test.toggledAllergens);
  const passed = result && result.outcomes && result.outcomes.length > 0 &&
    result.outcomes.some(outcome => {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      const bestReason = outcome.bestReason || '';
      return Array.isArray(askServer) && 
        askServer.length >= 2 &&
        Array.isArray(orderItLikeThis) &&
        orderItLikeThis.length >= 2 &&
        askServer.some(q => q.includes('butter') || q.includes('dairy')) &&
        (bestReason.includes('finished with butter') || bestReason.includes('butter'));
    });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (result && result.outcomes) {
    for (const outcome of result.outcomes) {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      const bestReason = outcome.bestReason || '';
      console.log(`  ${outcome.category}: askServer=${askServer.length}, orderItLikeThis=${orderItLikeThis.length}, bestReason="${bestReason}"`);
    }
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Hash browns (gluten toggled)', input: 'Hash browns', toggledAllergens: { gluten: true, dairy: false }, shouldTrigger: true };
  const result = buildLocalKnowledgeContext(test.input, test.toggledAllergens);
  const passed = result && result.outcomes && result.outcomes.length > 0 &&
    result.outcomes.some(outcome => {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      return Array.isArray(askServer) && 
        askServer.length >= 2 &&
        Array.isArray(orderItLikeThis) &&
        orderItLikeThis.length >= 2 &&
        askServer.some(q => q.includes('fryer') || q.includes('shared'));
    });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (result && result.outcomes) {
    for (const outcome of result.outcomes) {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      const bestReason = outcome.bestReason || '';
      console.log(`  ${outcome.category}: askServer=${askServer.length}, orderItLikeThis=${orderItLikeThis.length}, bestReason="${bestReason}"`);
    }
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();
(function() {
  const test = { name: 'Burger (gluten+dairy toggled)', input: 'Burger', toggledAllergens: { gluten: true, dairy: true }, shouldTrigger: true };
  const result = buildLocalKnowledgeContext(test.input, test.toggledAllergens);
  const passed = result && result.outcomes && result.outcomes.length > 0 &&
    result.outcomes.some(outcome => {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      return Array.isArray(askServer) && 
        askServer.length >= 2 &&
        Array.isArray(orderItLikeThis) &&
        orderItLikeThis.length >= 2 &&
        askServer.some(q => q.includes('bun') || q.includes('wrap') || q.includes('GF'));
    });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (result && result.outcomes) {
    for (const outcome of result.outcomes) {
      const askServer = outcome.askServer || [];
      const orderItLikeThis = outcome.orderItLikeThis || [];
      const bestReason = outcome.bestReason || '';
      console.log(`  ${outcome.category}: askServer=${askServer.length}, orderItLikeThis=${orderItLikeThis.length}, bestReason="${bestReason}"`);
    }
  }
  console.log();
  if (passed) passedCount++; else failedCount++;
})();

console.log('='.repeat(60));
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('='.repeat(60));

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All tests passed! ✓');
  process.exit(0);
}

