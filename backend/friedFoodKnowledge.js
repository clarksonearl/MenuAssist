/**
 * MenYOU Local Knowledge: Fried Foods & Fryers
 * 
 * This module contains canonical guidance information for fried foods
 * that may contain gluten or dairy, and cross-contact risks from shared fryers.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Frying introduces cross-contact risk.
 * Breaded items are structural gluten; plain items depend on fryer use.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const friedFoodKnowledge = [
  {
    itemName: 'Breaded Fried Foods',
    aliases: ['breaded', 'battered', 'crispy fried', 'panko'],
    matchPatterns: [['breaded'], ['battered'], ['crispy', 'fried'], ['fried', 'and', 'breaded'], ['crispy'], ['panko']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['breading', 'batter', 'flour'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Breading contains gluten and cannot be removed after cooking',
    notes: 'Breaded fried foods = NOT AN OPTION for gluten. Breading is structural and cannot be removed.'
  },
  {
    itemName: 'Plain Fried Foods',
    aliases: ['fried wings', 'fries', 'fried chicken wings', 'onion rings', 'fried chicken', 'mozzarella sticks', 'hash brown', 'hash browns'],
    matchPatterns: [['fried'], ['fries'], ['french', 'fries'], ['onion', 'rings'], ['fried', 'chicken'], ['mozzarella', 'sticks'], ['hash', 'brown'], ['hash', 'browns']],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Fryers are often shared with breaded items, creating cross-contact risk',
    crossContactRisk: {
      gluten: {
        risk: 'high',
        source: 'shared fryer with breaded items',
        canBeMitigated: true
      },
      dairy: {
        risk: 'medium',
        source: 'shared fryer with dairy-containing items',
        canBeMitigated: true
      }
    },
    suggestedServerQuestions: [
      'Are these fried in a shared fryer?',
      'Do you have a dedicated fryer for plain items?',
      'Are the fries cooked separately from breaded items?'
    ],
    notes: 'Plain fried foods = CAUTION, not blocked. Cross-contact risk depends on fryer usage.'
  },
  {
    itemName: 'Chicken Wings (Fried)',
    aliases: ['fried wings', 'fried chicken wings', 'buffalo wings fried'],
    matchPatterns: [['fried', 'wings'], ['fried', 'chicken', 'wings']],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Wings are typically plain but fried in shared fryers',
    crossContactRisk: {
      gluten: {
        risk: 'high',
        source: 'shared fryer with breaded items',
        canBeMitigated: true
      },
      dairy: {
        risk: 'medium',
        source: 'shared fryer with dairy-containing items',
        canBeMitigated: true
      }
    },
    modifiers: {
      sauce: {
        type: 'caution',
        guidance: 'Check sauce ingredients (buffalo sauce may contain dairy)'
      }
    },
    suggestedServerQuestions: [
      'Are the wings fried in a shared fryer?',
      'Do you have a dedicated fryer?',
      'What sauce is used? Does it contain dairy?'
    ],
    notes: 'Plain wings are CAUTION due to fryer cross-contact. Only matches when "fried" is explicitly mentioned.'
  },
  {
    itemName: 'French Fries',
    aliases: ['fries', 'french fries', 'potato fries'],
    matchPatterns: ['fries', 'french fries'],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Fries are typically plain but fried in shared fryers',
    crossContactRisk: {
      gluten: {
        risk: 'high',
        source: 'shared fryer with breaded items',
        canBeMitigated: true
      },
      dairy: {
        risk: 'low',
        source: 'shared fryer with dairy-containing items',
        canBeMitigated: true
      }
    },
    suggestedServerQuestions: [
      'Are the fries fried in a shared fryer?',
      'Do you have a dedicated fryer for fries?',
      'Are the fries cooked separately from breaded items?'
    ],
    notes: 'Plain fries are CAUTION due to fryer cross-contact. Not blocked.'
  },
  {
    itemName: 'Fried Chicken (Breaded)',
    aliases: ['fried chicken', 'crispy chicken', 'battered chicken'],
    matchPatterns: ['fried chicken', 'crispy chicken'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['breading', 'batter', 'flour'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Breading contains gluten and cannot be removed after cooking',
    notes: 'Breaded fried chicken = NOT AN OPTION for gluten. Breading is structural.'
  },
  {
    itemName: 'Onion Rings',
    aliases: ['onion rings', 'fried onions'],
    matchPatterns: ['onion rings'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['breading', 'batter'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Breading contains gluten and cannot be removed after cooking',
    notes: 'Onion rings = NOT AN OPTION for gluten. Breading is structural.'
  },
  {
    itemName: 'Mozzarella Sticks',
    aliases: ['mozzarella sticks', 'cheese sticks', 'fried mozzarella'],
    matchPatterns: ['mozzarella sticks', 'cheese sticks'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['breading', 'batter'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['mozzarella cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Contains both breading (gluten) and cheese (dairy), both structural',
    notes: 'Mozzarella sticks = NOT AN OPTION for gluten and/or dairy. Both are structural.'
  }
];

/**
 * Get fried food knowledge by name
 * @param {string} itemName - Name of the fried food item to look up
 * @returns {Object|null} Fried food knowledge entry or null if not found
 */
function getFriedFoodKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = friedFoodKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = friedFoodKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = friedFoodKnowledge.find(item => {
    if (!item.matchPatterns || item.matchPatterns.length === 0) return false;
    return item.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract fried foods mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched fried food objects (deduplicated)
 */
function extractFriedFoodsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedFriedFoods = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of friedFoodKnowledge) {
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedFriedFoods.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedFriedFoods;
}

/**
 * Check if an item is breaded (has structural gluten)
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {boolean} True if item appears to be breaded
 */
function isBreadedItem(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return false;
  }

  const normalizedText = normalizeName(menuItemText);
  const breadingTerms = ['breaded', 'battered', 'crispy fried', 'crispy', 'fried and breaded'];
  
  return breadingTerms.some(term => normalizedText.includes(normalizeName(term)));
}

module.exports = {
  friedFoodKnowledge,
  getFriedFoodKnowledge,
  extractFriedFoodsFromText,
  isBreadedItem
};

