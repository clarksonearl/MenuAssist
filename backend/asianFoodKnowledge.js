/**
 * MenYOU Local Knowledge: Asian Food
 * 
 * This module contains canonical guidance information for Asian food items
 * that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Soy sauce is the primary gluten risk.
 * Plain rice and proteins remain usable with clarification.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry, hasQualifier } = require('./knowledgeMatch');

const asianFoodKnowledge = [
  {
    itemName: 'Soy Sauce',
    aliases: ['soy sauce', 'shoyu'],
    matchPatterns: [['soy', 'sauce']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wheat'],
        isStructural: false,
        isReplaceable: true,
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
    reasonForCaution: 'Soy sauce typically contains wheat (gluten)',
    modifiers: {
      sauce: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request gluten-free tamari or no soy sauce',
        alternatives: ['gluten-free tamari', 'no soy sauce']
      }
    },
    suggestedServerQuestions: [
      'Can this be made with gluten-free soy sauce or without soy sauce?',
      'Do you have tamari (gluten-free soy sauce)?'
    ],
    notes: 'Soy sauce is CAUTION. Gluten-free tamari may be available.'
  },
  {
    itemName: 'Teriyaki Sauce',
    aliases: ['teriyaki sauce'],
    matchPatterns: [['teriyaki']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['soy sauce base'],
        isStructural: false,
        isReplaceable: true,
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
    reasonForCaution: 'Teriyaki sauce is typically made with soy sauce (gluten)',
    modifiers: {
      sauce: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request gluten-free teriyaki or no teriyaki sauce',
        alternatives: ['gluten-free teriyaki', 'no teriyaki sauce']
      }
    },
    suggestedServerQuestions: [
      'Can this be made with gluten-free teriyaki or without teriyaki sauce?',
      'Is the teriyaki sauce made with regular soy sauce?'
    ],
    notes: 'Teriyaki sauce is CAUTION. May be made with gluten-free soy sauce.'
  },
  {
    itemName: 'Asian Marinades',
    aliases: ['marinade', 'marinated'],
    matchPatterns: ['marinade', 'marinated'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['soy sauce'],
        isStructural: false,
        isReplaceable: true,
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
    reasonForCaution: 'Asian marinades often contain soy sauce (gluten)',
    suggestedServerQuestions: [
      'What is the marinade made with?',
      'Does it contain soy sauce?',
      'Can it be made without soy sauce or with gluten-free soy sauce?'
    ],
    notes: 'Asian marinades are CAUTION. Check ingredients for soy sauce.'
  },
  {
    itemName: 'Tempura',
    aliases: ['tempura', 'tempura fried'],
    matchPatterns: ['tempura'],
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
    reasonForCaution: 'Tempura contains breading (gluten) that cannot be removed',
    notes: 'Tempura = NOT AN OPTION for gluten. Breading is structural and cannot be removed.'
  },
  {
    itemName: 'Breaded Asian Dishes',
    aliases: ['breaded', 'battered', 'crispy'],
    matchPatterns: ['breaded', 'battered', 'crispy fried'],
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
    reasonForCaution: 'Breaded items contain gluten that cannot be removed',
    notes: 'Breaded Asian dishes = NOT AN OPTION for gluten. Breading is structural.'
  },
  {
    itemName: 'Stir-Fry (Plain, No Breading)',
    aliases: ['stir fry', 'stir-fry', 'wok'],
    matchPatterns: ['stir fry', 'stir-fry', 'wok'],
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
    reasonForCaution: 'Stir-fry itself is GENERALLY OK, but soy sauce may be used during cooking',
    hiddenRisks: {
      gluten: {
        risk: 'common',
        source: 'soy sauce used during cooking',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Is soy sauce used, and is it gluten-free?',
      'Can the stir-fry be made without soy sauce or with gluten-free soy sauce?'
    ],
    notes: 'Plain stir-fry is CAUTION. Rice and proteins are GENERALLY OK, but verify soy sauce usage.'
  },
  {
    itemName: 'Fried Rice',
    aliases: ['fried rice', 'chicken fried rice', 'beef fried rice'],
    matchPatterns: ['fried rice'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['soy sauce'],
        isStructural: false,
        isReplaceable: true,
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
    reasonForCaution: 'Fried rice typically contains soy sauce (gluten)',
    hiddenRisks: {
      gluten: {
        risk: 'common',
        source: 'soy sauce used in preparation',
        canBeAvoided: true
      }
    },
    modifiers: {
      sauce: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request gluten-free soy sauce or no soy sauce',
        alternatives: ['gluten-free soy sauce', 'no soy sauce']
      }
    },
    suggestedServerQuestions: [
      'Is soy sauce used in the rice, and is it gluten-free?',
      'Can the fried rice be made without soy sauce or with gluten-free soy sauce?'
    ],
    notes: 'Fried rice is CAUTION. Rice itself is GENERALLY OK, but soy sauce is commonly used.'
  },
  {
    itemName: 'Plain Rice',
    aliases: ['plain rice', 'steamed rice', 'white rice', 'jasmine rice', 'basmati rice'],
    matchPatterns: [['plain', 'rice'], ['steamed', 'rice'], ['white', 'rice'], ['jasmine', 'rice'], ['basmati', 'rice']],
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
    reasonForCaution: 'Plain rice is GENERALLY OK',
    notes: 'Plain rice is GENERALLY OK. Verify no added sauces or seasonings.'
  },
  {
    itemName: 'Plain Proteins (Chicken, Beef, Pork, Tofu)',
    aliases: ['plain chicken', 'plain beef', 'plain pork', 'plain tofu', 'steamed chicken', 'dry chicken'],
    matchPatterns: [['plain', 'chicken'], ['plain', 'beef'], ['plain', 'pork'], ['plain', 'tofu'], ['steamed', 'chicken'], ['dry', 'chicken'], ['no', 'sauce'], ['no', 'glaze'], ['unseasoned']],
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
    reasonForCaution: 'Plain proteins are GENERALLY OK',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'marinades or sauces containing soy sauce',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Is the protein marinated or cooked with soy sauce?',
      'Can it be prepared without soy sauce or with gluten-free soy sauce?'
    ],
    notes: 'Plain proteins are GENERALLY OK, but check for marinades or sauces.'
  },
  {
    itemName: 'Dumplings / Potstickers',
    aliases: ['dumpling', 'dumplings', 'potsticker', 'potstickers', 'gyoza'],
    matchPatterns: ['dumpling', 'potsticker', 'gyoza'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wrapper', 'dough'],
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
    reasonForCaution: 'Dumplings contain a wheat-based wrapper (gluten)',
    notes: 'Dumplings = NOT AN OPTION for gluten. Wrapper is structural and cannot be removed.'
  },
  {
    itemName: 'Noodles (Wheat-Based)',
    aliases: ['lo mein', 'chow mein', 'ramen'],
    matchPatterns: [['lo', 'mein'], ['chow', 'mein'], ['ramen']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wheat', 'flour'],
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
    reasonForCaution: 'Wheat-based noodles contain gluten as a core ingredient',
    notes: 'Wheat-based noodles = NOT AN OPTION for gluten. Gluten is structural and cannot be removed.'
  },
  {
    itemName: 'Rice Noodles',
    aliases: ['rice noodles', 'rice noodle', 'pad thai noodles'],
    matchPatterns: ['rice noodles', 'rice noodle'],
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
    reasonForCaution: 'Rice noodles are GENERALLY OK',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'sauces or marinades containing soy sauce',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Are the rice noodles cooked with soy sauce?',
      'Can it be made without soy sauce or with gluten-free soy sauce?'
    ],
    notes: 'Rice noodles themselves are GENERALLY OK, but check sauces.'
  }
];

/**
 * Get Asian food knowledge by name
 * @param {string} itemName - Name of the Asian food item to look up
 * @returns {Object|null} Asian food knowledge entry or null if not found
 */
function getAsianFoodKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = asianFoodKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = asianFoodKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = asianFoodKnowledge.find(item => {
    if (!item.matchPatterns || item.matchPatterns.length === 0) return false;
    return item.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract Asian food items mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched Asian food item objects (deduplicated)
 */
function extractAsianFoodsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const normalizedText = normalizeName(menuItemText);
  
  // HARD GATE: Do NOT trigger on single vague tokens
  // Reject: "noodles" alone, "soy" alone, "sauce" alone
  const stopTokens = ['noodles', 'soy', 'sauce'];
  const textTokens = normalizedText.split(/\s+/).filter(t => t.length > 0);
  
  // If text is a single stop token, return empty
  if (textTokens.length === 1 && stopTokens.includes(textTokens[0])) {
    return [];
  }

  const matchedAsianFoods = [];
  const seenItemNames = new Set();

  // Rice qualifiers
  const riceQualifiers = ['plain', 'steamed', 'white rice', 'jasmine', 'basmati'];
  // Protein qualifiers
  const proteinQualifiers = ['plain', 'steamed', 'dry', 'no sauce', 'no glaze', 'unseasoned'];

  for (const item of asianFoodKnowledge) {
    // Special handling for Plain Rice - require qualifiers
    if (item.itemName === 'Plain Rice') {
      if (!hasQualifier(menuItemText, riceQualifiers)) {
        continue; // Skip if no qualifiers
      }
    }

    // Special handling for Plain Proteins - require qualifiers
    if (item.itemName === 'Plain Proteins (Chicken, Beef, Pork, Tofu)') {
      if (!hasQualifier(menuItemText, proteinQualifiers)) {
        continue; // Skip if no qualifiers
      }
    }

    // Use shared matching utility
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedAsianFoods.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedAsianFoods;
}

module.exports = {
  asianFoodKnowledge,
  getAsianFoodKnowledge,
  extractAsianFoodsFromText
};

