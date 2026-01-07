/**
 * MenYOU Local Knowledge: Pasta & Italian Food
 * 
 * This module contains canonical guidance information for pasta and Italian food items
 * that may contain gluten or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Standard pasta is never modifiable for gluten.
 * Sauce choice determines dairy risk.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const pastaItalianKnowledge = [
  {
    itemName: 'Wheat-Based Pasta',
    aliases: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'rigatoni', 'macaroni', 'ziti'],
    matchPatterns: [['pasta'], ['spaghetti'], ['penne'], ['fettuccine'], ['linguine'], ['rigatoni'], ['macaroni'], ['ziti'], ['noodles']],
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
    reasonForCaution: 'Wheat-based pasta contains gluten as a core ingredient',
    notes: 'Standard pasta = NOT AN OPTION for gluten. Gluten is structural to pasta and cannot be removed.'
  },
  {
    itemName: 'Gluten-Free Pasta',
    aliases: ['gluten-free pasta', 'gf pasta', 'gluten free pasta'],
    matchPatterns: [['gluten', 'free', 'pasta'], ['gf', 'pasta']],
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
    reasonForCaution: 'Gluten-free pasta is GENERALLY OK',
    crossContactRisk: {
      gluten: {
        risk: 'medium',
        source: 'shared cooking water or equipment with wheat pasta',
        canBeMitigated: true
      }
    },
    suggestedServerQuestions: [
      'Is the gluten-free pasta cooked in separate water?',
      'Is there any risk of cross-contact with wheat pasta?'
    ],
    notes: 'Gluten-free pasta is GENERALLY OK. Confirm preparation and cross-contact.'
  },
  {
    itemName: 'Alfredo Sauce',
    aliases: ['alfredo', 'alfredo sauce', 'fettuccine alfredo'],
    matchPatterns: [['alfredo']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['roux', 'flour'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'butter', 'parmesan cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Alfredo sauce is cream-based and dairy is core to the sauce',
    notes: 'Alfredo sauce = NOT AN OPTION for dairy. Dairy is structural and cannot be removed.'
  },
  {
    itemName: 'Carbonara Sauce',
    aliases: ['carbonara', 'carbonara sauce'],
    matchPatterns: [['carbonara']], // Strong single keyword
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
        sources: ['parmesan cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Carbonara sauce contains parmesan cheese as a core ingredient',
    notes: 'Carbonara sauce = NOT AN OPTION for dairy. Cheese is structural and cannot be removed.'
  },
  {
    itemName: 'Cream-Based Sauces',
    aliases: ['cream sauce', 'creamy sauce', 'white sauce'],
    matchPatterns: [['cream', 'sauce'], ['creamy', 'sauce'], ['white', 'sauce']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['roux', 'flour'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'milk', 'butter', 'cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Cream-based sauces contain dairy as a core ingredient',
    notes: 'Cream-based sauces = NOT AN OPTION for dairy. Dairy is structural and cannot be removed.'
  },
  {
    itemName: 'Marinara Sauce',
    aliases: ['marinara', 'marinara sauce', 'tomato sauce'],
    matchPatterns: [['marinara'], ['tomato', 'sauce']],
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
    reasonForCaution: 'Marinara sauce is typically GENERALLY OK, but may have hidden ingredients',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'added flour as thickener',
        canBeAvoided: true
      },
      dairy: {
        risk: 'possible',
        source: 'added butter or cheese',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Is there any butter, cheese, or flour added to the sauce?'
    ],
    notes: 'Marinara sauce is usually GENERALLY OK, but verify ingredients.'
  },
  {
    itemName: 'Pizza',
    aliases: ['pizza', 'pie'],
    matchPatterns: [['pizza']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['crust', 'dough'],
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
    reasonForCaution: 'Pizza typically includes crust (gluten) and cheese (dairy)',
    modifiers: {
      crust: {
        type: 'replaceable',
        allergen: 'gluten',
        guidance: 'Request gluten-free crust if available',
        alternatives: ['gluten-free crust', 'cauliflower crust']
      },
      cheese: {
        type: 'removable',
        allergen: 'dairy',
        guidance: 'Request no cheese or dairy-free cheese if available'
      }
    },
    suggestedServerQuestions: [
      'Do you have a gluten-free crust?',
      'Can I get it without cheese or with dairy-free cheese?'
    ],
    notes: 'Pizza is CAUTION. Gluten-free crust and no cheese options may be available.'
  },
  {
    itemName: 'Lasagna',
    aliases: ['lasagna', 'lasagne'],
    matchPatterns: [['lasagna']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['pasta sheets'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'ricotta', 'mozzarella'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Lasagna contains pasta sheets (gluten) and cheese (dairy) as core ingredients',
    notes: 'Lasagna = NOT AN OPTION for gluten and/or dairy. Both are structural and cannot be removed.'
  },
  {
    itemName: 'Ravioli',
    aliases: ['ravioli', 'raviolis'],
    matchPatterns: [['ravioli']], // Strong single keyword
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['pasta'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese filling', 'ricotta'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Ravioli contains pasta (gluten) and may have cheese filling (dairy)',
    modifiers: {
      filling: {
        type: 'caution',
        allergen: 'dairy',
        guidance: 'Check filling ingredients - may contain cheese'
      }
    },
    suggestedServerQuestions: [
      'What is the ravioli filling made with?',
      'Does it contain cheese?'
    ],
    notes: 'Ravioli = NOT AN OPTION for gluten (pasta is structural). Check filling for dairy.'
  },
  {
    itemName: 'Risotto',
    aliases: ['risotto'],
    matchPatterns: [['risotto']], // Strong single keyword
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
        sources: ['butter', 'parmesan cheese'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      }
    },
    reasonForCaution: 'Risotto is typically cooked with butter and parmesan cheese',
    hiddenRisks: {
      dairy: {
        risk: 'common',
        source: 'butter and parmesan cheese added during cooking',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Is the risotto cooked with butter or cheese?',
      'Can I get it without butter or cheese?'
    ],
    notes: 'Risotto is CAUTION. Rice is GENERALLY OK, but butter and cheese are commonly added.'
  },
  {
    itemName: 'Mac and Cheese',
    aliases: ['mac and cheese', 'macaroni and cheese', 'mac n cheese', 'mac & cheese'],
    matchPatterns: [['mac', 'cheese'], ['macaroni', 'cheese']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['macaroni', 'pasta'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'cream', 'milk'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Mac and cheese contains pasta (gluten) and cheese (dairy) as core ingredients',
    notes: 'Mac and cheese = NOT AN OPTION for gluten and/or dairy. Both are structural and cannot be removed.'
  },
  {
    itemName: 'Stuffed Shells',
    aliases: ['stuffed shells', 'stuffed pasta shells'],
    matchPatterns: [['stuffed', 'shells']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['pasta shells'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'ricotta', 'mozzarella'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Stuffed shells contain pasta (gluten) and cheese (dairy) as core ingredients',
    notes: 'Stuffed shells = NOT AN OPTION for gluten and/or dairy. Both are structural and cannot be removed.'
  },
  {
    itemName: 'Manicotti',
    aliases: ['manicotti'],
    matchPatterns: [['manicotti']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['pasta'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese', 'ricotta'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Manicotti contains pasta (gluten) and cheese (dairy) as core ingredients',
    notes: 'Manicotti = NOT AN OPTION for gluten and/or dairy. Both are structural and cannot be removed.'
  },
  {
    itemName: 'Cheese Ravioli',
    aliases: ['cheese ravioli', 'ravioli with cheese', 'cheese-filled ravioli'],
    matchPatterns: [['cheese', 'ravioli'], ['ravioli', 'cheese']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['pasta'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cheese filling', 'ricotta'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Cheese ravioli contains pasta (gluten) and cheese filling (dairy) as core ingredients',
    notes: 'Cheese ravioli = NOT AN OPTION for gluten and/or dairy. Both are structural and cannot be removed.'
  },
  {
    itemName: 'Vodka Sauce',
    aliases: ['vodka sauce', 'penne vodka', 'vodka cream sauce'],
    matchPatterns: [['vodka', 'sauce'], ['vodka', 'cream']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['roux', 'flour'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream', 'heavy cream'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Vodka sauce is cream-based and dairy is core to the sauce',
    notes: 'Vodka sauce = NOT AN OPTION for dairy. Dairy is structural and cannot be removed.'
  },
  {
    itemName: 'Parmesan Crusted',
    aliases: ['parmesan crusted', 'parmesan-crusted'],
    matchPatterns: [['parmesan', 'crusted']],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['breadcrumbs', 'flour'],
        isStructural: false,
        isReplaceable: false,
        requiresExplicitLabel: false
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['parmesan cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Parmesan crusted items contain parmesan cheese (dairy) as a core ingredient',
    notes: 'Parmesan crusted = NOT AN OPTION for dairy. Parmesan cheese is structural and cannot be removed.'
  }
];

/**
 * Get pasta/Italian food knowledge by name
 * @param {string} itemName - Name of the pasta/Italian food item to look up
 * @returns {Object|null} Pasta/Italian food knowledge entry or null if not found
 */
function getPastaItalianKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = pastaItalianKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = pastaItalianKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  // Finally, try matchPatterns for concept entries
  const patternMatch = pastaItalianKnowledge.find(item => {
    if (!item.matchPatterns || item.matchPatterns.length === 0) return false;
    return item.matchPatterns.some(pattern => 
      normalized.includes(normalizeName(pattern))
    );
  });
  if (patternMatch) return patternMatch;
  
  return null;
}

/**
 * Extract pasta/Italian food items mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched pasta/Italian food item objects (deduplicated)
 */
function extractPastaItalianFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return null;
  }

  const normalizedText = normalizeName(menuItemText);

  // HARD EXCLUSION: If text contains "pizza", block pizza-specific phrases from pasta module
  // Pizza items should be handled by structural module ONLY, not pasta module
  const hasPizza = normalizedText.includes('pizza');
  
  if (hasPizza) {
    // Exclusion tokens that indicate modifiable/non-pasta pizza items
    const pizzaExclusionTokens = ['bowl', 'crustless', 'no crust', 'crust-less', 'crust less'];
    const hasExclusionToken = pizzaExclusionTokens.some(token => normalizedText.includes(token));
    
    if (hasExclusionToken) {
      return null; // Return null immediately for pizza bowl / crustless pizza - no matching attempts
    }
    
    // Pasta anchor tokens (required for pizza to be considered pasta context)
    const pastaAnchors = ['pasta', 'spaghetti', 'fettuccine', 'penne', 'rigatoni', 'ziti', 'linguine', 'ravioli', 'tortellini', 'gnocchi', 'lasagna'];
    const hasPastaAnchor = pastaAnchors.some(anchor => normalizedText.includes(anchor));
    
    // Named Italian sauce keywords (required for pizza to be considered pasta context)
    const namedSauceKeywords = ['alfredo', 'vodka', 'rosa', 'carbonara', 'marinara', 'parmigiana', 'parmesan', 'gorgonzola', 'pesto'];
    const hasNamedSauceKeyword = namedSauceKeywords.some(keyword => normalizedText.includes(keyword));
    
    // HARD EXCLUSION: If pizza present and no pasta anchor AND no named sauce => return null
    // This ensures "pepperoni pizza", "cheese pizza", "stuffed crust pizza" don't route into pasta
    // (They will be handled by structural module instead)
    if (!hasPastaAnchor && !hasNamedSauceKeyword) {
      return null; // Return null immediately - pizza without pasta context should not match pasta module
    }
  }

  // HARD GATE: If text contains "cream" or "creamy", it MUST also contain pasta anchor OR named sauce keyword
  // This gate runs BEFORE any matching attempts to prevent false positives
  const hasCreamy = normalizedText.includes('creamy');
  const hasCream = normalizedText.includes('cream');
  
  if (hasCreamy || hasCream) {
    // Pasta anchor tokens
    const pastaAnchors = ['pasta', 'spaghetti', 'fettuccine', 'penne', 'rigatoni', 'ziti', 'linguine', 'ravioli', 'tortellini', 'gnocchi', 'lasagna'];
    const hasPastaAnchor = pastaAnchors.some(anchor => normalizedText.includes(anchor));
    
    // Named Italian sauce keywords (specific sauce names, NOT generic "cream"/"creamy"/"sauce")
    const namedSauceKeywords = ['alfredo', 'vodka', 'rosa', 'carbonara', 'marinara', 'parmigiana', 'parmesan', 'gorgonzola', 'pesto'];
    const hasNamedSauceKeyword = namedSauceKeywords.some(keyword => normalizedText.includes(keyword));
    
    // HARD GATE: If creamy/cream present and neither anchor nor sauce exists => return null BEFORE matching
    if (!hasPastaAnchor && !hasNamedSauceKeyword) {
      return null; // Return null immediately - no matching attempts
    }
  }

  const matchedPastaItalian = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of pastaItalianKnowledge) {
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedPastaItalian.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedPastaItalian;
}

module.exports = {
  pastaItalianKnowledge,
  getPastaItalianKnowledge,
  extractPastaItalianFromText
};

