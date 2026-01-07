/**
 * MenYOU Local Knowledge: Sandwiches & Bread-Based Items
 * 
 * This module contains canonical guidance information for sandwiches
 * and bread-based items that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Bread is a structural gluten source, but many sandwiches can be modified
 * by removing or replacing bread.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const sandwichKnowledge = [
  {
    itemName: 'Sandwich (general)',
    aliases: ['sandwich', 'sub', 'hoagie', 'hero', 'grinder', 'po boy', 'gyro', 'pita'],
    matchPatterns: [['sandwich'], ['sub'], ['hoagie'], ['hero'], ['grinder'], ['po', 'boy'], ['gyro'], ['pita'], ['naan'], ['bun'], ['roll'], ['baguette'], ['toast'], ['wrap']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bread'],
        isStructural: true,
        isReplaceable: true, // Can often be removed or swapped
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false, // Cheese is removable
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Bread is central to sandwiches, but many places allow no bread, lettuce wrap, or gluten-free bread',
    modifiers: {
      bread: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Ask about gluten-free bread or no bread option',
        alternatives: ['no bread', 'lettuce wrap', 'gluten-free bread'],
        canBeRemoved: true // Most places can accommodate
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you have gluten-free bread or a lettuce wrap?',
      'Can I get this without bread?',
      'Can I get it without cheese?'
    ],
    notes: 'If gluten-free bread is NOT available and bread cannot be removed → NOT AN OPTION. If bread can be removed → still orderable.'
  },
  {
    itemName: 'Grilled Cheese Sandwich',
    aliases: ['grilled cheese', 'cheese sandwich', 'melt'],
    matchPatterns: ['grilled cheese', 'cheese sandwich'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bread'],
        isStructural: true,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: true, // Cheese is the main ingredient
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Cheese is the primary ingredient and bread is structural',
    modifiers: {
      bread: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Ask about gluten-free bread or no bread option',
        alternatives: ['no bread', 'lettuce wrap', 'gluten-free bread'],
        canBeRemoved: true
      },
      cheese: {
        type: 'structural',
        allergen: 'dairy',
        guidance: 'Cheese is the main ingredient - cannot be removed',
        canBeRemoved: false
      }
    },
    suggestedServerQuestions: [
      'Do you have gluten-free bread?',
      'Can I get this without bread?'
    ],
    notes: 'Cheese is structural. If dairy is toggled → NOT AN OPTION unless explicitly dairy-free.'
  },
  {
    itemName: 'Panini',
    aliases: ['panini', 'pressed sandwich'],
    matchPatterns: ['panini'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bread'],
        isStructural: true,
        isReplaceable: false, // Panini requires bread to be pressed
        requiresExplicitLabel: true
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
    reasonForCaution: 'Bread is required for panini preparation',
    modifiers: {
      bread: {
        type: 'structural',
        allergen: 'gluten',
        guidance: 'Bread is required for panini - ask about gluten-free bread',
        alternatives: ['gluten-free bread'],
        canBeRemoved: false
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you have gluten-free bread for panini?',
      'Can I get it without cheese?'
    ],
    notes: 'Panini requires bread to be pressed. If no gluten-free option → NOT AN OPTION for gluten.'
  },
  {
    itemName: 'Wrap',
    aliases: ['wrap', 'tortilla wrap'],
    matchPatterns: ['wrap', 'tortilla'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['tortilla', 'wrap'],
        isStructural: true,
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
    reasonForCaution: 'Tortilla/wrap typically contains gluten, but can sometimes be removed or swapped',
    modifiers: {
      wrap: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Ask about gluten-free wrap or no wrap option',
        alternatives: ['no wrap', 'lettuce wrap', 'gluten-free wrap'],
        canBeRemoved: true
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you have a gluten-free wrap or lettuce wrap?',
      'Can I get this without the wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Similar to sandwiches - wrap can often be removed or replaced'
  },
  {
    itemName: 'Sub / Hoagie / Hero',
    aliases: ['sub', 'submarine', 'hoagie', 'hero', 'grinder', 'po boy'],
    matchPatterns: ['sub', 'hoagie', 'hero', 'grinder'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bread', 'roll'],
        isStructural: true,
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
    reasonForCaution: 'Bread roll is central, but can often be removed or swapped',
    modifiers: {
      bread: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Ask about gluten-free roll or no bread option',
        alternatives: ['no bread', 'lettuce wrap', 'gluten-free roll'],
        canBeRemoved: true
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you have a gluten-free roll or lettuce wrap?',
      'Can I get this without the roll?',
      'Can I get it without cheese?'
    ],
    notes: 'Similar to general sandwiches'
  }
];

/**
 * Get sandwich knowledge by name
 * @param {string} itemName - Name of the sandwich/item to look up
 * @returns {Object|null} Sandwich knowledge entry or null if not found
 */
function getSandwichKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = sandwichKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = sandwichKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = sandwichKnowledge.find(item => {
    if (!item.matchPatterns || item.matchPatterns.length === 0) return false;
    return item.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract sandwiches mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched sandwich objects (deduplicated)
 */
function extractSandwichesFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const normalizedText = normalizeName(menuItemText);
  const textTokens = normalizedText.split(/\s+/).filter(t => t.length > 0);

  // HARD GATE: If text contains wrapper tokens, it MUST also contain anchor tokens
  // This prevents generic "sandwich", "sub", "panini", "wrap" from triggering
  const wrapperTokens = ['sandwich', 'sub', 'hoagie', 'grinder', 'panini', 'wrap', 'bun', 'roll', 'hero', 'po', 'boy', 'pita', 'naan', 'baguette', 'toast'];
  const hasWrapperToken = wrapperTokens.some(token => normalizedText.includes(token));

  if (hasWrapperToken) {
    // Anchor tokens that indicate filling/intent
    const anchorTokens = [
      'chicken', 'turkey', 'ham', 'roast', 'beef', 'steak', 'bacon', 'tuna', 'salad', 'club', 'blt',
      'philly', 'cheesesteak', 'pulled', 'pork', 'meatball', 'italian', 'parm', 'parmesan',
      'eggplant', 'caprese', 'sausage', 'peppers', 'grilled', 'cheese', 'melt', 'veggie', 'vegetable',
      'buffalo', 'bbq', 'ranch', 'mayo', 'aioli', 'dressing', 'breaded', 'crispy', 'fried',
      'mozzarella', 'provolone', 'swiss', 'cheddar', 'american', 'pesto', 'marinara', 'alfredo',
      'gyro', 'shawarma', 'breakfast', 'egg'
    ];
    const hasAnchorToken = anchorTokens.some(token => normalizedText.includes(token));

    if (!hasAnchorToken) {
      return []; // Return empty - no matching attempts for generic wrapper tokens
    }

    // Additional stop-rule: "Chicken salad sandwich" without Italian/cheese context
    // If tokens include ["chicken","salad"] and wrapper but NOT Italian/cheese indicators
    const hasChickenSalad = normalizedText.includes('chicken') && normalizedText.includes('salad');
    if (hasChickenSalad) {
      const italianCheeseIndicators = ['mayo', 'aioli', 'cheese', 'dressing', 'breaded', 'crispy', 'fried', 'parm', 'parmesan', 'mozzarella', 'provolone', 'italian'];
      const hasItalianCheeseIndicator = italianCheeseIndicators.some(indicator => normalizedText.includes(indicator));
      if (!hasItalianCheeseIndicator) {
        return []; // Return empty - avoid over-triggering generic "chicken salad sandwich"
      }
    }
  }

  const matchedSandwiches = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of sandwichKnowledge) {
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedSandwiches.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedSandwiches;
}

module.exports = {
  sandwichKnowledge,
  getSandwichKnowledge,
  extractSandwichesFromText
};

