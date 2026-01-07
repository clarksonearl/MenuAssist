/**
 * MenYOU Local Knowledge: Salads & Salad Dressings
 * 
 * This module contains canonical guidance information for common salads
 * and salad dressings that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Key concepts:
 * - Structural allergen: Cannot be removed without changing the item's identity
 * - Removable modifier: Can be removed (cheese, croutons)
 * - Replaceable modifier: Can be swapped (dressings)
 * 
 * Internal outcomes:
 * - GENERALLY OK: Lower concern, removable modifiers
 * - CAUTION: Replaceable components, requires swap/removal guidance
 * - NOT AN OPTION: Structural allergen that cannot be removed
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

// ================================================
// SALAD DRESSINGS
// ================================================

const dressingKnowledge = [
  {
    dressingName: 'Caesar Dressing',
    aliases: ['caesar', 'caesar dressing'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['Worcestershire'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['Parmesan cheese', 'cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Caesar dressing is fundamentally dairy-based and cannot be modified to remove dairy',
    notes: 'Only acceptable if menu explicitly states dairy-free / gluten-free Caesar'
  },
  {
    dressingName: 'Ranch Dressing',
    aliases: ['ranch', 'ranch dressing'],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['buttermilk', 'sour cream'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Dairy is the base of ranch dressing',
    notes: 'User may choose a different dressing instead'
  },
  {
    dressingName: 'Blue Cheese Dressing',
    aliases: ['blue cheese', 'blue cheese dressing', 'bleu cheese', 'bleu cheese dressing'],
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['blue cheese', 'cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Cheese is the primary ingredient',
    notes: 'Cannot be modified to remove dairy'
  },
  {
    dressingName: 'Creamy / House Cream Dressings',
    aliases: ['creamy dressing', 'cream dressing', 'house cream', 'house creamy'],
    matchPatterns: [['creamy'], ['cream', 'dressing'], ['house', 'cream']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['thickeners', 'flour'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'milk', 'buttermilk'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Dairy-forward and recipe-dependent',
    notes: 'Dairy is structural; gluten may be present in thickeners'
  },
  {
    dressingName: 'Vinaigrette',
    aliases: ['vinaigrette', 'balsamic', 'italian dressing', 'house vinaigrette'],
    matchPatterns: [['vinaigrette'], ['balsamic'], ['italian', 'dressing']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['malt vinegar', 'wheat-based additives'],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Gluten possible depending on vinegar or flavorings',
    suggestedServerQuestions: [
      'Is the vinaigrette made with malt vinegar or wheat-based additives?'
    ],
    notes: 'Generally GENERALLY OK, but ask about gluten if toggled'
  },
  {
    dressingName: 'Oil & Vinegar',
    aliases: ['oil and vinegar', 'oil vinegar', 'olive oil vinegar'],
    matchPatterns: [['oil', 'vinegar']], // Require both tokens
    allergens: {
      gluten: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      },
      dairy: {
        present: false,
        likelihood: 'unlikely',
        sources: [],
        isStructural: false,
        isReplaceable: true,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Simple, minimal ingredients',
    notes: 'Generally GENERALLY OK'
  }
];

// ================================================
// SALADS
// ================================================

const saladKnowledge = [
  {
    saladName: 'Caesar Salad',
    aliases: ['caesar', 'caesar salad'],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['croutons'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['Caesar dressing', 'Parmesan cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Dressing and croutons are core components',
    notes: 'This is not treated as "just remove cheese/croutons" by default. Only acceptable if menu explicitly states gluten-free AND dairy-free (or has dairy-free dressing + no croutons)'
  },
  {
    saladName: 'House Salad / Garden Salad',
    aliases: ['house salad', 'garden salad', 'house', 'garden', 'mixed greens', 'green salad'],
    matchPatterns: [['house', 'salad'], ['garden', 'salad'], ['mixed', 'greens']],
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
    reasonForCaution: 'Base greens and vegetables are typically safe',
    modifiers: {
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Remove cheese'
      },
      croutons: {
        type: 'removable',
        allergen: 'gluten',
        guidance: 'Remove croutons'
      },
      dressing: {
        type: 'replaceable',
        guidance: 'Swap dressing'
      }
    },
    notes: 'Guidance focuses on removing or swapping components'
  },
  {
    saladName: 'Chef Salad',
    aliases: ['chef salad', 'chef'],
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
    reasonForCaution: 'Risks come from toppings, not the base',
    modifiers: {
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Remove cheese'
      },
      dressing: {
        type: 'replaceable',
        guidance: 'Swap dressing'
      },
      processedMeats: {
        type: 'review',
        guidance: 'Review if needed'
      }
    },
    notes: 'Base is GENERALLY OK'
  },
  {
    saladName: 'Cobb Salad',
    aliases: ['cobb', 'cobb salad'],
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
        likelihood: 'common',
        sources: ['cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Cheese is removable',
    modifiers: {
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Remove cheese'
      },
      dressing: {
        type: 'replaceable',
        guidance: 'Swap dressing'
      }
    },
    notes: 'Not automatically disallowed'
  },
  {
    saladName: 'Grilled Chicken Salad',
    aliases: ['grilled chicken salad', 'chicken salad'],
    matchPatterns: [['grilled', 'chicken'], ['chicken', 'salad']],
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
    reasonForCaution: 'Chicken and greens are usually fine',
    modifiers: {
      marinades: {
        type: 'caution',
        guidance: 'Possible CAUTION - check marinades'
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Remove cheese'
      },
      croutons: {
        type: 'removable',
        allergen: 'gluten',
        guidance: 'Remove croutons'
      },
      dressing: {
        type: 'replaceable',
        guidance: 'Swap dressing'
      }
    },
    notes: 'Base is GENERALLY OK'
  }
];

/**
 * Get dressing knowledge by name
 * @param {string} dressingName - Name of the dressing to look up
 * @returns {Object|null} Dressing knowledge entry or null if not found
 */
function getDressingKnowledge(dressingName) {
  if (!dressingName) return null;
  
  const normalized = normalizeName(dressingName);
  if (!normalized) return null;
  
  // First, try exact match on dressingName
  const exactMatch = dressingKnowledge.find(dressing => 
    normalizeName(dressing.dressingName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = dressingKnowledge.find(dressing => {
    if (!dressing.aliases || dressing.aliases.length === 0) return false;
    return dressing.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = dressingKnowledge.find(dressing => {
    if (!dressing.matchPatterns || dressing.matchPatterns.length === 0) return false;
    return dressing.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Get salad knowledge by name
 * @param {string} saladName - Name of the salad to look up
 * @returns {Object|null} Salad knowledge entry or null if not found
 */
function getSaladKnowledge(saladName) {
  if (!saladName) return null;
  
  const normalized = normalizeName(saladName);
  if (!normalized) return null;
  
  // First, try exact match on saladName
  const exactMatch = saladKnowledge.find(salad => 
    normalizeName(salad.saladName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = saladKnowledge.find(salad => {
    if (!salad.aliases || salad.aliases.length === 0) return false;
    return salad.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = saladKnowledge.find(salad => {
    if (!salad.matchPatterns || salad.matchPatterns.length === 0) return false;
    return salad.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract dressings mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched dressing objects (deduplicated)
 */
function extractDressingsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedDressings = [];
  const seenDressingNames = new Set();

  // Use shared matching utility
  for (const dressing of dressingKnowledge) {
    const match = matchEntry(dressing, menuItemText);
    if (match.matched && !seenDressingNames.has(dressing.dressingName)) {
      matchedDressings.push(dressing);
      seenDressingNames.add(dressing.dressingName);
    }
  }

  return matchedDressings;
}

/**
 * Extract salads mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched salad objects (deduplicated)
 */
function extractSaladsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedSalads = [];
  const seenSaladNames = new Set();

  // Use shared matching utility
  for (const salad of saladKnowledge) {
    const match = matchEntry(salad, menuItemText);
    if (match.matched && !seenSaladNames.has(salad.saladName)) {
      matchedSalads.push(salad);
      seenSaladNames.add(salad.saladName);
    }
  }

  return matchedSalads;
}

module.exports = {
  dressingKnowledge,
  saladKnowledge,
  getDressingKnowledge,
  getSaladKnowledge,
  extractDressingsFromText,
  extractSaladsFromText
};

