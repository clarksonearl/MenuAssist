/**
 * MenYOU Local Knowledge: Mexican Food
 * 
 * This module contains canonical guidance information for Mexican food items
 * that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Corn tortillas keep items usable; flour tortillas are a hard no for gluten.
 * Rice and beans are usually safe but recipe-dependent.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const mexicanFoodKnowledge = [
  {
    itemName: 'Corn Tortillas',
    aliases: ['corn tortilla', 'corn tortillas', 'corn'],
    matchPatterns: [['corn', 'tortilla']], // Require both tokens
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
    reasonForCaution: 'Corn tortillas themselves are GENERALLY OK',
    crossContactRisk: {
      gluten: {
        risk: 'medium',
        source: 'shared grill with flour tortillas',
        canBeMitigated: true
      }
    },
    suggestedServerQuestions: [
      'Are the corn tortillas cooked on a shared grill with flour tortillas?'
    ],
    notes: 'Corn tortillas keep items usable. Cross-contact possible on shared grills.'
  },
  {
    itemName: 'Flour Tortillas',
    aliases: ['flour tortilla', 'flour tortillas', 'wheat tortilla'],
    matchPatterns: [['flour', 'tortilla'], ['wheat', 'tortilla']], // Require both tokens
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
    reasonForCaution: 'Flour tortillas contain gluten as a core ingredient',
    notes: 'Flour tortillas = NOT AN OPTION for gluten. Gluten is structural and cannot be removed.'
  },
  {
    itemName: 'Mexican Rice / Spanish Rice',
    aliases: ['mexican rice', 'spanish rice', 'arroz', 'mexican rice'],
    matchPatterns: [['mexican', 'rice'], ['spanish', 'rice'], ['arroz']],
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
    reasonForCaution: 'Rice itself is GENERALLY OK, but may be cooked with broth or seasonings',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'broth or seasonings containing gluten',
        canBeAvoided: true
      },
      dairy: {
        risk: 'possible',
        source: 'broth or seasonings containing dairy',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Is the rice cooked with broth or anything containing gluten or dairy?'
    ],
    notes: 'Mexican rice is usually GENERALLY OK, but verify preparation method.'
  },
  {
    itemName: 'Beans (Black, Pinto, Refried)',
    aliases: ['black beans', 'pinto beans', 'refried beans', 'frijoles', 'beans'],
    matchPatterns: [['black', 'beans'], ['pinto', 'beans'], ['refried', 'beans'], ['frijoles']],
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
        present: true,
        likelihood: 'possible',
        sources: ['lard', 'butter', 'cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Beans may be cooked with lard, butter, or cheese',
    hiddenRisks: {
      dairy: {
        risk: 'possible',
        source: 'lard, butter, or cheese used in cooking',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Are the beans cooked with lard, butter, or cheese?'
    ],
    notes: 'Beans are usually CAUTION due to possible dairy in preparation.'
  },
  {
    itemName: 'Salsa (Red / Green / Pico)',
    aliases: ['salsa', 'pico de gallo', 'salsa verde', 'salsa roja'],
    matchPatterns: [['salsa'], ['pico']], // Strong single keywords
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
    reasonForCaution: 'Salsa is typically GENERALLY OK',
    notes: 'Verify no added cream or flour. Traditional salsa is GENERALLY OK.'
  },
  {
    itemName: 'Enchilada Sauce',
    aliases: ['enchilada sauce', 'enchilada'],
    matchPatterns: [['enchilada', 'sauce']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['flour'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'possible',
        sources: ['cheese', 'cream'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Enchilada sauce may contain flour, cheese, or cream depending on recipe',
    suggestedServerQuestions: [
      'Does this sauce contain flour, cheese, or cream?'
    ],
    notes: 'Recipe varies by restaurant. Ask about ingredients.'
  },
  {
    itemName: 'Mole Sauce',
    aliases: ['mole', 'mole sauce'],
    matchPatterns: [['mole']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['flour', 'bread'],
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
    reasonForCaution: 'Mole sauce may contain flour or bread depending on recipe',
    suggestedServerQuestions: [
      'Does the mole sauce contain flour or bread?'
    ],
    notes: 'Traditional mole may include bread or flour as thickener.'
  },
  {
    itemName: 'Creamy Mexican Sauces',
    aliases: ['creamy sauce', 'cream sauce', 'sour cream sauce'],
    matchPatterns: [['creamy'], ['cream', 'sauce']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['flour'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'sour cream', 'cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Creamy sauces may contain flour, cream, or cheese',
    suggestedServerQuestions: [
      'Does this sauce contain flour, cheese, or cream?'
    ],
    notes: 'Creamy sauces are CAUTION due to possible gluten and dairy.'
  },
  {
    itemName: 'Tacos',
    aliases: [], // Removed generic aliases - require qualifiers via patterns only
    matchPatterns: [
      ['flour', 'tortilla', 'taco'],
      ['flour', 'tortilla', 'tacos'],
      ['crispy', 'taco'],
      ['crispy', 'tacos'],
      ['breaded', 'taco'],
      ['breaded', 'tacos'],
      ['battered', 'taco'],
      ['battered', 'tacos'],
      ['tempura', 'taco'],
      ['tempura', 'tacos'],
      ['panko', 'taco'],
      ['panko', 'tacos'],
      ['wheat', 'taco'],
      ['wheat', 'tacos']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['tortilla'],
        isStructural: true,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'sour cream'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Tacos typically include tortilla (gluten if flour) and may include cheese or sour cream',
    modifiers: {
      tortilla: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request corn tortillas instead of flour tortillas',
        alternatives: ['corn tortilla', 'no tortilla', 'lettuce wrap']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      },
      sourCream: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without sour cream'
      }
    },
    suggestedServerQuestions: [
      'Can I get corn tortillas instead of flour?',
      'Can I get it without cheese or sour cream?'
    ],
    notes: 'Tacos are CAUTION. Corn tortillas keep items usable; flour tortillas are NOT AN OPTION for gluten. Generic "tacos" without qualifiers should not trigger (modifiable).'
  },
  {
    itemName: 'Burritos',
    aliases: ['burrito', 'burritos'],
    matchPatterns: [['burrito']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['flour tortilla'],
        isStructural: true,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'sour cream'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Burritos typically use flour tortillas (gluten) and may include cheese or sour cream',
    modifiers: {
      tortilla: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request corn tortillas or no tortilla',
        alternatives: ['corn tortilla', 'no tortilla', 'bowl']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      },
      sourCream: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without sour cream'
      }
    },
    suggestedServerQuestions: [
      'Can I get corn tortillas or a bowl instead of flour tortilla?',
      'Can I get it without cheese or sour cream?'
    ],
    notes: 'Burritos are CAUTION. Flour tortilla is structural for gluten, but can sometimes be replaced with corn or bowl.'
  },
  {
    itemName: 'Enchiladas',
    aliases: ['enchilada', 'enchiladas'],
    matchPatterns: [['enchilada']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['corn tortilla', 'flour tortilla', 'sauce'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'sauce'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Enchiladas include tortillas and sauce, plus cheese',
    modifiers: {
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      },
      sauce: {
        type: 'caution',
        guidance: 'Check sauce ingredients for gluten and dairy'
      }
    },
    suggestedServerQuestions: [
      'What type of tortillas are used?',
      'Does the sauce contain flour, cheese, or cream?',
      'Can I get it without cheese?'
    ],
    notes: 'Enchiladas are CAUTION. Check tortilla type and sauce ingredients.'
  }
];

/**
 * Get Mexican food knowledge by name
 * @param {string} itemName - Name of the Mexican food item to look up
 * @returns {Object|null} Mexican food knowledge entry or null if not found
 */
function getMexicanFoodKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = mexicanFoodKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = mexicanFoodKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = mexicanFoodKnowledge.find(item => {
    if (!item.matchPatterns || item.matchPatterns.length === 0) return false;
    return item.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract Mexican food items mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched Mexican food item objects (deduplicated)
 */
function extractMexicanFoodsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedMexicanFoods = [];
  const seenItemNames = new Set();
  const normalizedText = normalizeName(menuItemText);

  // Gluten-structural qualifiers for tacos
  const glutenStructuralQualifiers = ['flour', 'wheat', 'crispy', 'breaded', 'battered', 'tempura', 'panko'];
  const hasTacoKeyword = normalizedText.includes('taco') || normalizedText.includes('tacos');
  const hasFlourTortillaPhrase = normalizedText.includes('flour tortilla');
  const hasGlutenQualifier = glutenStructuralQualifiers.some(qualifier => normalizedText.includes(qualifier));

  // Use shared matching utility
  for (const item of mexicanFoodKnowledge) {
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      // Guardrail: For tacos, require gluten-structural qualifier
      if (item.itemName === 'Tacos' && hasTacoKeyword) {
        // Require qualifier for tacos (they're modifiable without qualifiers)
        if (!hasFlourTortillaPhrase && !hasGlutenQualifier) {
          continue; // Skip generic tacos without qualifiers
        }
      }
      
      matchedMexicanFoods.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedMexicanFoods;
}

module.exports = {
  mexicanFoodKnowledge,
  getMexicanFoodKnowledge,
  extractMexicanFoodsFromText
};

