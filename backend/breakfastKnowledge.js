/**
 * MenYOU Local Knowledge: Breakfast Items
 * 
 * This module contains canonical guidance information for breakfast items
 * that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Eggs themselves are generally ok, but breakfast prep often introduces
 * hidden gluten and dairy.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const breakfastKnowledge = [
  {
    itemName: 'Scrambled Eggs',
    aliases: ['scrambled eggs', 'scrambled', 'eggs scrambled'],
    matchPatterns: ['scrambled eggs', 'scrambled'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['pancake batter'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['milk', 'butter', 'cream'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Some restaurants add pancake batter or dairy to eggs for fluffiness',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'pancake batter added to eggs',
        canBeAvoided: true
      },
      dairy: {
        risk: 'common',
        source: 'milk or butter added during cooking',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Do you add pancake batter or milk to the eggs?',
      'Are they cooked with butter?',
      'Can I get plain eggs without any additions?'
    ],
    notes: 'Eggs themselves are GENERALLY OK, but preparation methods vary. Hidden ingredients are common.'
  },
  {
    itemName: 'Omelets',
    aliases: ['omelet', 'omelette', 'omelets'],
    matchPatterns: ['omelet', 'omelette'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['pancake batter'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['milk', 'butter', 'cheese', 'cream'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'May contain pancake batter, milk, butter, or cheese',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'pancake batter added to eggs',
        canBeAvoided: true
      },
      dairy: {
        risk: 'common',
        source: 'milk, butter, or cheese added during cooking',
        canBeAvoided: true
      }
    },
    modifiers: {
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you add pancake batter or milk to the eggs?',
      'Are they cooked with butter?',
      'Can I get it without cheese?',
      'Can I get plain eggs without any additions?'
    ],
    notes: 'Omelets often include cheese and may have batter or dairy added. Request plain eggs if needed.'
  },
  {
    itemName: 'Pancakes',
    aliases: ['pancake', 'pancakes', 'hotcakes', 'flapjacks'],
    matchPatterns: ['pancake', 'hotcake', 'flapjack'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['flour'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['milk', 'butter'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Pancakes contain flour (gluten) and milk/butter (dairy) as core ingredients',
    notes: 'Pancakes = NOT AN OPTION unless explicitly gluten-free & dairy-free. Flour and dairy are structural.'
  },
  {
    itemName: 'Waffles',
    aliases: ['waffle', 'waffles', 'belgian waffle'],
    matchPatterns: ['waffle', 'belgian waffle'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['flour'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['milk', 'butter'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Waffles contain flour (gluten) and milk/butter (dairy) as core ingredients',
    notes: 'Waffles = NOT AN OPTION unless explicitly gluten-free & dairy-free. Flour and dairy are structural.'
  },
  {
    itemName: 'French Toast',
    aliases: ['french toast', 'french toast'],
    matchPatterns: ['french toast'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bread'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['milk', 'butter', 'eggs'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'French toast contains bread (gluten) and milk/butter (dairy) as core ingredients',
    notes: 'French toast = NOT AN OPTION unless explicitly gluten-free & dairy-free. Bread and dairy are structural.'
  },
  {
    itemName: 'Breakfast Sandwiches',
    aliases: ['breakfast sandwich', 'egg sandwich', 'breakfast burrito'],
    matchPatterns: ['breakfast sandwich', 'egg sandwich', 'breakfast burrito'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['bread', 'bun', 'tortilla'],
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
    reasonForCaution: 'Breakfast sandwiches typically include bread (gluten) and cheese (dairy)',
    modifiers: {
      bread: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Remove bread or use gluten-free bread',
        alternatives: ['no bread', 'lettuce wrap', 'gluten-free bread']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Remove cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you have gluten-free bread or a lettuce wrap?',
      'Can I get this without bread?',
      'Can I get it without cheese?'
    ],
    notes: 'Breakfast sandwiches are similar to regular sandwiches - bread and cheese can usually be removed or replaced.'
  },
  {
    itemName: 'Breakfast Burrito',
    aliases: ['breakfast burrito', 'burrito'],
    matchPatterns: ['breakfast burrito', 'burrito'],
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
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Breakfast burritos typically include tortilla (gluten) and cheese (dairy)',
    modifiers: {
      tortilla: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Remove tortilla or use gluten-free wrap',
        alternatives: ['no tortilla', 'lettuce wrap', 'gluten-free wrap']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Remove cheese'
      }
    },
    suggestedServerQuestions: [
      'Do you have a gluten-free wrap or lettuce wrap?',
      'Can I get this without the tortilla?',
      'Can I get it without cheese?'
    ],
    notes: 'Similar to wraps - tortilla can often be removed or replaced.'
  },
  {
    itemName: 'Hash Browns',
    aliases: ['hash browns', 'hashbrowns', 'hash brown'],
    matchPatterns: [['hash', 'brown'], ['hash', 'browns']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['shared fryer'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'possible',
        sources: ['butter'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'May be cooked with butter (dairy) and fried in shared fryer (gluten cross-contact)',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'shared fryer with breaded items',
        canBeAvoided: true
      },
      dairy: {
        risk: 'possible',
        source: 'butter used during cooking',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Are the hash browns cooked with butter?',
      'Are they fried in a shared fryer?',
      'Can I get them cooked without butter?'
    ],
    notes: 'Hash browns themselves are GENERALLY OK, but may be cooked with butter and fried in shared fryers.'
  },
  {
    itemName: 'Home Fries',
    aliases: ['home fries', 'homefries', 'home fried potatoes'],
    matchPatterns: ['home fries', 'home fried'],
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
        sources: ['butter'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'May be cooked with butter (dairy)',
    hiddenRisks: {
      dairy: {
        risk: 'possible',
        source: 'butter used during cooking',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Are the home fries cooked with butter?',
      'Can I get them cooked without butter?'
    ],
    notes: 'Home fries themselves are GENERALLY OK, but may be cooked with butter.'
  },
  {
    itemName: 'Biscuits and Gravy',
    aliases: ['biscuits and gravy', 'biscuit and gravy', 'sausage gravy', 'biscuits'],
    matchPatterns: [['biscuits', 'and', 'gravy'], ['biscuit', 'and', 'gravy'], ['sausage', 'gravy'], ['biscuits'], ['biscuit'], ['gravy']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['biscuit', 'flour'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'milk', 'butter'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Biscuits contain flour (gluten) and gravy contains cream/milk/butter (dairy) as core ingredients',
    notes: 'Biscuits and gravy = NOT AN OPTION unless explicitly gluten-free & dairy-free. Flour and dairy are structural.'
  },
  {
    itemName: 'Toast',
    aliases: ['toast', 'toast with butter', 'gluten-free toast'],
    matchPatterns: [['toast', 'with', 'butter'], ['gluten-free', 'toast'], ['toast']],
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
        sources: ['butter'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Toast contains bread (gluten) and may be served with butter (dairy)',
    modifiers: {
      bread: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request gluten-free bread',
        alternatives: ['gluten-free bread']
      },
      butter: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request without butter'
      }
    },
    suggestedServerQuestions: [
      'Do you have gluten-free bread?',
      'Can I get it without butter?',
      'Is butter added automatically?'
    ],
    notes: 'Toast can be modified with gluten-free bread and without butter.'
  },
  {
    itemName: 'Eggs Benedict',
    aliases: ['eggs benedict', 'benedict'],
    matchPatterns: [['eggs', 'benedict'], ['benedict']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['english muffin'],
        isStructural: true,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['hollandaise', 'butter'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Eggs Benedict contains English muffin (gluten) and hollandaise sauce (dairy) as core ingredients',
    notes: 'Eggs Benedict = NOT AN OPTION for dairy (hollandaise is structural). Gluten can be modified with gluten-free muffin.'
  },
  {
    itemName: 'Breakfast Sausage',
    aliases: ['breakfast sausage', 'sausage patty', 'sausage links'],
    matchPatterns: [['breakfast', 'sausage'], ['sausage', 'patty'], ['sausage', 'links']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['binder', 'breadcrumbs'],
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
    reasonForCaution: 'Breakfast sausage may contain gluten binders or breadcrumbs',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'binders or breadcrumbs used in sausage',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Does the sausage contain any binders or breadcrumbs?',
      'Is the sausage gluten-free?'
    ],
    notes: 'Breakfast sausage may contain gluten binders. Ask about ingredients.'
  },
  {
    itemName: 'Cinnamon Roll',
    aliases: ['cinnamon roll', 'cinnamon rolls'],
    matchPatterns: [['cinnamon', 'roll'], ['cinnamon', 'rolls']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['flour'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['butter', 'cream', 'icing'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Cinnamon rolls contain flour (gluten) and butter/cream/icing (dairy) as core ingredients',
    notes: 'Cinnamon rolls = NOT AN OPTION unless explicitly gluten-free & dairy-free. Flour and dairy are structural.'
  }
];

/**
 * Get breakfast knowledge by name
 * @param {string} itemName - Name of the breakfast item to look up
 * @returns {Object|null} Breakfast knowledge entry or null if not found
 */
function getBreakfastKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = breakfastKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = breakfastKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = breakfastKnowledge.find(item => {
    if (!item.matchPatterns || item.matchPatterns.length === 0) return false;
    return item.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract breakfast items mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched breakfast item objects (deduplicated)
 */
function extractBreakfastItemsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedBreakfastItems = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of breakfastKnowledge) {
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedBreakfastItems.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedBreakfastItems;
}

module.exports = {
  breakfastKnowledge,
  getBreakfastKnowledge,
  extractBreakfastItemsFromText
};

