/**
 * MenYOU Local Knowledge: Sauces
 * 
 * This module contains canonical guidance information for common sauces
 * that may contain gluten or dairy. Sauces act as risk modifiers for dishes.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Guidance levels:
 * - CAUTION: Frequently contains hidden ingredients, varies by restaurant
 * 
 * Usage:
 * - Query by sauce name
 * - Filter by toggled allergens (gluten, dairy)
 * - Reference during menu parsing
 * - Elevate dishes to CAUTION when sauce is detected
 */

const { matchEntry } = require('./knowledgeMatch');

const sauceKnowledge = [
  {
    sauceName: 'BBQ Sauce',
    guidanceLevel: 'CAUTION',
    aliases: ['bbq', 'barbecue', 'barbeque', 'bar-b-q'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['soy sauce', 'Worcestershire', 'malt vinegar'],
        notes: 'Recipe varies widely by brand and restaurant'
      },
      dairy: {
        present: true,
        likelihood: 'rare',
        sources: ['butter', 'cream'],
        notes: 'Occasionally included in house-made recipes'
      }
    },
    reasonForCaution: 'Recipe varies widely by brand and restaurant',
    commonHiddenIngredients: ['soy sauce', 'Worcestershire sauce', 'malt vinegar', 'butter'],
    suggestedServerQuestions: [
      'Does your BBQ sauce contain soy sauce or Worcestershire?',
      'Is the BBQ sauce gluten-free, or do you know the brand?'
    ],
    notes: 'BBQ sauce does not automatically make a dish unsafe. It signals awareness and suggests asking clarifying questions.'
  },
  {
    sauceName: 'Buffalo Sauce',
    guidanceLevel: 'CAUTION',
    aliases: ['buffalo', 'wing sauce'],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        notes: 'Typically gluten-free'
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['butter'],
        notes: 'Traditionally butter-based'
      }
    },
    reasonForCaution: 'Traditionally butter-based',
    commonHiddenIngredients: ['butter'],
    suggestedServerQuestions: [
      'Is the buffalo sauce made with butter or dairy?'
    ],
    notes: 'Traditional buffalo sauce is butter-based. Some restaurants may use alternatives.'
  },
  {
    sauceName: 'Soy Sauce',
    guidanceLevel: 'CAUTION',
    aliases: ['soy', 'shoyu', 'tamari'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wheat'],
        notes: 'Traditional brewing uses wheat'
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        notes: 'No dairy in soy sauce'
      }
    },
    reasonForCaution: 'Traditional brewing uses wheat',
    commonHiddenIngredients: ['wheat'],
    suggestedServerQuestions: [
      'Is your soy sauce gluten-free or tamari?'
    ],
    notes: 'Most soy sauce contains wheat. Tamari is typically gluten-free alternative.'
  },
  {
    sauceName: 'Teriyaki Sauce',
    guidanceLevel: 'CAUTION',
    aliases: ['teriyaki'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['soy sauce base'],
        notes: 'Soy sauce is usually the base ingredient'
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        notes: 'No dairy in teriyaki sauce'
      }
    },
    reasonForCaution: 'Soy sauce is usually the base ingredient',
    commonHiddenIngredients: ['soy sauce', 'wheat'],
    suggestedServerQuestions: [
      'Is the teriyaki sauce made with regular soy sauce?'
    ],
    notes: 'Teriyaki typically contains soy sauce, which usually contains wheat.'
  },
  {
    sauceName: 'Worcestershire Sauce',
    guidanceLevel: 'CAUTION',
    aliases: ['worcestershire', 'worcester'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['malt vinegar'],
        notes: 'Malt vinegar used in some formulations'
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        notes: 'No dairy in Worcestershire sauce'
      }
    },
    reasonForCaution: 'Malt vinegar used in some formulations',
    commonHiddenIngredients: ['malt vinegar'],
    suggestedServerQuestions: [
      'Does this contain Worcestershire or malt vinegar?'
    ],
    notes: 'Some Worcestershire formulations use malt vinegar which contains gluten.'
  },
  {
    sauceName: 'Hollandaise Sauce',
    guidanceLevel: 'CAUTION',
    aliases: ['hollandaise'],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        notes: 'Typically gluten-free'
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['butter'],
        notes: 'Butter is a primary ingredient'
      }
    },
    reasonForCaution: 'Butter is a primary ingredient',
    commonHiddenIngredients: ['butter', 'egg yolks'],
    suggestedServerQuestions: [
      'Is hollandaise made with butter or dairy?'
    ],
    notes: 'Hollandaise is traditionally butter-based. Some restaurants may use alternatives.'
  },
  {
    sauceName: 'Cream-Based Sauces',
    guidanceLevel: 'CAUTION',
    aliases: [],
    matchPatterns: [['alfredo'], ['cream', 'sauce'], ['cheese', 'sauce'], ['bechamel'], ['chowder']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['roux', 'flour'],
        notes: 'Often thickened with roux or flour'
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'milk', 'butter', 'cheese'],
        notes: 'Dairy-forward sauces'
      }
    },
    reasonForCaution: 'Dairy-forward and often thickened with flour',
    commonHiddenIngredients: ['cream', 'milk', 'butter', 'cheese', 'flour', 'roux'],
    suggestedServerQuestions: [
      'Is this sauce cream- or milk-based?',
      'Is it thickened with flour?'
    ],
    notes: 'Includes Alfredo, cheese sauces, chowder bases, and similar cream-based preparations.'
  },
  {
    sauceName: 'Roux',
    guidanceLevel: 'CAUTION',
    aliases: [],
    matchPatterns: [['roux'], ['gravy'], ['cream', 'gravy'], ['bechamel']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['flour'],
        notes: 'Classic flour base'
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['butter'],
        notes: 'Classic butter base'
      }
    },
    reasonForCaution: 'Classic flour + butter base',
    commonHiddenIngredients: ['flour', 'butter'],
    suggestedServerQuestions: [
      'Is this sauce thickened with a roux or flour?'
    ],
    notes: 'Roux is a common sauce thickener made from flour and butter. Used in many gravies and sauces.'
  },
  {
    sauceName: 'Glaze',
    guidanceLevel: 'CAUTION',
    aliases: ['glaze', 'glazed'],
    matchPatterns: [['glaze'], ['glazed']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['soy sauce', 'flour', 'thickeners'],
        notes: 'Glazes often contain soy sauce or flour-based thickeners'
      },
      dairy: {
        present: true,
        likelihood: 'possible',
        sources: ['butter', 'cream'],
        notes: 'Glazes may contain butter or cream'
      }
    },
    reasonForCaution: 'Glazes often contain hidden gluten or dairy ingredients',
    commonHiddenIngredients: ['soy sauce', 'butter', 'cream', 'flour'],
    suggestedServerQuestions: [
      'Does the glaze contain soy sauce, butter, cream, or flour?',
      'Can it be made without the glaze?'
    ],
    notes: 'Glazes vary widely by recipe and may contain gluten or dairy.'
  }
];

/**
 * Normalize a string for matching (lowercase, trim, remove punctuation, collapse spaces)
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse multiple spaces to single space
}

/**
 * Query sauce knowledge by name
 * @param {string} sauceName - Name of the sauce to look up
 * @returns {Object|null} Sauce knowledge entry or null if not found
 */
function getSauceKnowledge(sauceName) {
  if (!sauceName) return null;
  
  // Use shared matching utility
  for (const sauce of sauceKnowledge) {
    const match = matchEntry(sauce, sauceName);
    if (match.matched) {
      return sauce;
    }
  }
  
  return null;
}

/**
 * Get all sauces that contain a specific allergen
 * @param {string} allergen - 'gluten' or 'dairy'
 * @returns {Array} Array of sauce entries containing the allergen
 */
function getSaucesByAllergen(allergen) {
  return sauceKnowledge.filter(sauce => 
    sauce.allergens[allergen] && sauce.allergens[allergen].present
  );
}

/**
 * Check if a sauce should trigger CAUTION for given allergens
 * @param {string} sauceName - Name of the sauce
 * @param {Array<string>} toggledAllergens - Array of 'gluten' and/or 'dairy'
 * @returns {boolean} True if sauce should trigger CAUTION for any toggled allergen
 */
function shouldTriggerCaution(sauceName, toggledAllergens) {
  // Return false if no toggled allergens
  if (!toggledAllergens || toggledAllergens.length === 0) return false;
  
  const sauce = getSauceKnowledge(sauceName);
  if (!sauce) return false;
  
  // Return true only if sauce has present=true for at least one toggled allergen
  // AND likelihood is not 'unlikely'
  return toggledAllergens.some(allergen => {
    const allergenInfo = sauce.allergens[allergen];
    return allergenInfo && 
           allergenInfo.present === true && 
           allergenInfo.likelihood !== 'unlikely';
  });
}

module.exports = {
  sauceKnowledge,
  normalizeName,
  getSauceKnowledge,
  getSaucesByAllergen,
  shouldTriggerCaution
};

