/**
 * MenYOU Local Knowledge: Burgers
 * 
 * This module contains canonical guidance information for burgers
 * that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Burgers are CAUTION by default because bread and cheese are common,
 * but both are replaceable or removable. Burger patties themselves are GENERALLY OK.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const burgerKnowledge = [
  {
    burgerName: 'Standard Burger',
    aliases: ['burger', 'hamburger', 'beef burger', 'burger patty'],
    matchPatterns: ['burger', 'hamburger'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bun', 'bread'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false, // Cheese is removable, not replaceable
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Most burgers include a bun (gluten) and cheese (dairy) by default',
    modifiers: {
      bun: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request no bun, lettuce wrap, or gluten-free bun if available',
        alternatives: ['no bun', 'lettuce wrap', 'gluten-free bun']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Can I get this without the bun?',
      'Do you have a gluten-free bun or lettuce wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Burgers are customizable and should remain orderable. Do NOT treat as NOT AN OPTION.'
  },
  {
    burgerName: 'Cheeseburger',
    aliases: ['cheeseburger', 'cheese burger'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bun', 'bread'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Always includes cheese (dairy) and typically has a bun (gluten)',
    modifiers: {
      bun: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request no bun, lettuce wrap, or gluten-free bun if available',
        alternatives: ['no bun', 'lettuce wrap', 'gluten-free bun']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Can I get this without the bun?',
      'Do you have a gluten-free bun or lettuce wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Cheeseburgers always include cheese, but it can be removed.'
  },
  {
    burgerName: 'Chicken Burger',
    aliases: ['chicken burger', 'chickenburger', 'chicken patty'],
    matchPatterns: ['chicken burger'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bun', 'bread', 'breading'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'May have breaded chicken patty (gluten) and typically includes bun and cheese',
    modifiers: {
      bun: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request no bun, lettuce wrap, or gluten-free bun if available',
        alternatives: ['no bun', 'lettuce wrap', 'gluten-free bun']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      },
      breading: {
        type: 'caution',
        allergen: 'gluten',
        guidance: 'Check if chicken is breaded - request grilled if available'
      }
    },
    suggestedServerQuestions: [
      'Can I get this without the bun?',
      'Do you have a gluten-free bun or lettuce wrap?',
      'Is the chicken breaded? Can I get it grilled instead?',
      'Can I get it without cheese?'
    ],
    notes: 'Chicken may be breaded. Check preparation method.'
  },
  {
    burgerName: 'Turkey Burger',
    aliases: ['turkey burger', 'turkeyburger'],
    matchPatterns: ['turkey burger'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bun', 'bread'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Typically includes bun (gluten) and may include cheese (dairy)',
    modifiers: {
      bun: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request no bun, lettuce wrap, or gluten-free bun if available',
        alternatives: ['no bun', 'lettuce wrap', 'gluten-free bun']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Can I get this without the bun?',
      'Do you have a gluten-free bun or lettuce wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Turkey burger patty itself is GENERALLY OK'
  },
  {
    burgerName: 'Veggie Burger',
    aliases: ['veggie burger', 'vegetable burger', 'veggieburger', 'veggie patty'],
    matchPatterns: ['veggie burger', 'vegetable burger'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bun', 'bread', 'binder'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'possible',
        sources: ['cheese', 'binder'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'May contain gluten or dairy in patty binders, plus bun and cheese',
    modifiers: {
      bun: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request no bun, lettuce wrap, or gluten-free bun if available',
        alternatives: ['no bun', 'lettuce wrap', 'gluten-free bun']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      },
      patty: {
        type: 'caution',
        guidance: 'Check patty ingredients for gluten or dairy binders'
      }
    },
    suggestedServerQuestions: [
      'Can I get this without the bun?',
      'Do you have a gluten-free bun or lettuce wrap?',
      'What is the veggie patty made with? Does it contain gluten or dairy?',
      'Can I get it without cheese?'
    ],
    notes: 'Veggie burger patties may contain gluten or dairy as binders. Check ingredients.'
  }
];

/**
 * Get burger knowledge by name
 * @param {string} burgerName - Name of the burger to look up
 * @returns {Object|null} Burger knowledge entry or null if not found
 */
function getBurgerKnowledge(burgerName) {
  if (!burgerName) return null;
  
  const normalized = normalizeName(burgerName);
  if (!normalized) return null;
  
  // First, try exact match on burgerName
  const exactMatch = burgerKnowledge.find(burger => 
    normalizeName(burger.burgerName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = burgerKnowledge.find(burger => {
    if (!burger.aliases || burger.aliases.length === 0) return false;
    return burger.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = burgerKnowledge.find(burger => {
    if (!burger.matchPatterns || burger.matchPatterns.length === 0) return false;
    return burger.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract burgers mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched burger objects (deduplicated)
 */
function extractBurgersFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedBurgers = [];
  const seenBurgerNames = new Set();

  // Use shared matching utility
  for (const burger of burgerKnowledge) {
    const match = matchEntry(burger, menuItemText);
    if (match.matched && !seenBurgerNames.has(burger.burgerName)) {
      matchedBurgers.push(burger);
      seenBurgerNames.add(burger.burgerName);
    }
  }

  return matchedBurgers;
}

module.exports = {
  burgerKnowledge,
  getBurgerKnowledge,
  extractBurgersFromText
};

