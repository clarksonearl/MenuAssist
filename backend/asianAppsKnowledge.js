/**
 * MenYOU Local Knowledge: Asian Apps (Wrappers/Batters/Sauces)
 * 
 * This module contains canonical guidance information for Asian appetizers,
 * including dumplings, wrappers, batters, and sauces.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * - Wrapper/batter apps (dumplings, egg rolls, tempura) = structural gluten (NOT AN OPTION)
 * - Sauce-glazed apps (teriyaki, hoisin, etc.) = CAUTION (gluten in sauces)
 * - Dairy apps (crab rangoon, cream cheese wontons) = structural dairy (NOT AN OPTION)
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const asianAppsKnowledge = [
  {
    itemName: 'Dairy Apps (Crab Rangoon, Cream Cheese Wontons)',
    aliases: ['crab rangoon', 'crab rangoons', 'rangoon', 'rangoons', 'ragoon', 'ragoons', 'cream cheese wontons', 'cream cheese wonton', 'creamcheese wontons', 'creamcheese wonton', 'cheese wontons', 'cheese wonton', 'cc wontons', 'cc wonton'],
    matchPatterns: [
      ['crab', 'rangoon'],
      ['crab', 'rangoons'],
      ['rangoon'],
      ['rangoons'],
      ['ragoon'],
      ['ragoons'],
      ['cream', 'cheese', 'wontons'],
      ['cream', 'cheese', 'wonton'],
      ['creamcheese', 'wontons'],
      ['creamcheese', 'wonton'],
      ['cheese', 'wontons'],
      ['cheese', 'wonton'],
      ['cc', 'wontons'],
      ['cc', 'wonton']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wheat wrapper'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      },
      dairy: {
        present: true,
        likelihood: 'common',
        sources: ['cream cheese'],
        isStructural: true,
        isReplaceable: false,
        requiresExplicitLabel: true
      }
    },
    reasonForCaution: 'Crab rangoon and cream cheese wontons contain both gluten (wrapper) and dairy (cream cheese) as core ingredients',
    notes: 'Dairy apps = NOT AN OPTION for dairy. Cream cheese is structural and cannot be removed.'
  },
  {
    itemName: 'Wrapper/Batter Apps (Dumplings, Egg Rolls, Tempura)',
    aliases: ['dumpling', 'dumplings', 'potsticker', 'potstickers', 'gyoza', 'wonton', 'wontons', 'egg roll', 'egg rolls', 'tempura', 'panko', 'mandu', 'bao'],
    matchPatterns: [
      ['dumpling'],
      ['dumplings'],
      ['potsticker'],
      ['potstickers'],
      ['gyoza'],
      ['wonton'],
      ['wontons'],
      ['egg', 'roll'],
      ['egg', 'rolls'],
      ['tempura'],
      ['panko'],
      ['mandu'],
      ['bao'],
      ['crispy', 'chicken'],
      ['crispy', 'shrimp'],
      ['crispy', 'beef']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wheat wrapper', 'batter', 'flour'],
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
    reasonForCaution: 'Wrappers and batters contain gluten as a core ingredient',
    notes: 'Wrapper/batter apps = NOT AN OPTION for gluten. Gluten is structural and cannot be removed.'
  },
  {
    itemName: 'Sauce-Glazed Apps (Teriyaki, Hoisin, etc.)',
    aliases: ['teriyaki', 'hoisin', 'oyster sauce', 'ponzu', 'miso', 'eel sauce'],
    matchPatterns: [
      ['teriyaki'],
      ['hoisin'],
      ['oyster', 'sauce'],
      ['ponzu'],
      ['miso'],
      ['eel', 'sauce'],
      ['soy', 'sauce']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['soy sauce', 'wheat'],
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
    reasonForCaution: 'Asian sauces often contain gluten from soy sauce or wheat',
    hiddenRisks: {
      gluten: {
        risk: 'common',
        source: 'soy sauce or wheat-based ingredients',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Does this contain soy sauce or other gluten-containing sauces?',
      'Can this be made without the sauce?'
    ],
    notes: 'Sauce-glazed apps = CAUTION for gluten. Sauces may contain gluten but can sometimes be omitted.'
  },
  {
    itemName: 'Fresh Spring Roll / Summer Roll',
    aliases: ['fresh spring roll', 'fresh spring rolls', 'summer roll', 'summer rolls'],
    matchPatterns: [
      ['fresh', 'spring', 'roll'],
      ['fresh', 'spring', 'rolls'],
      ['summer', 'roll'],
      ['summer', 'rolls']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['sauces', 'cross-contact'],
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
    reasonForCaution: 'Fresh spring rolls use rice paper (gluten-free) but sauces and cross-contact may introduce gluten',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'sauces or cross-contact during preparation',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Are the sauces gluten-free?',
      'Is there a risk of cross-contact with wheat-based items?'
    ],
    notes: 'Fresh spring rolls = CAUTION for gluten. Rice paper is gluten-free, but sauces and cross-contact are risks.'
  }
];

/**
 * Get Asian apps knowledge by name
 * @param {string} itemName - Name of the app to look up
 * @returns {Object|null} App knowledge entry or null if not found
 */
function getAsianAppsKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = asianAppsKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = asianAppsKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  return null;
}

/**
 * Extract Asian apps mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched app objects (deduplicated)
 */
function extractAsianAppsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const normalizedText = normalizeName(menuItemText);
  
  // HARD GATE: Do NOT trigger on single vague tokens
  // Reject: "noodles" alone, "soy" alone, "sauce" alone, "crispy" alone
  const stopTokens = ['noodles', 'soy', 'sauce', 'sushi', 'poke', 'crispy'];
  const textTokens = normalizedText.split(/\s+/).filter(t => t.length > 0);
  
  // If text is a single stop token, return empty
  if (textTokens.length === 1 && stopTokens.includes(textTokens[0])) {
    return [];
  }
  
  // Reject "sushi roll", "sushi", "poke" (save for later module)
  if (normalizedText.includes('sushi') || normalizedText.includes('poke')) {
    return [];
  }
  
  // Reject generic "spring roll" (ambiguous, no trigger by default)
  // But allow "fresh spring roll" and "summer roll"
  if (normalizedText === 'spring roll' || normalizedText === 'spring rolls') {
    return [];
  }
  
  // Special handling for "crispy" - only allow if paired with a food item
  if (normalizedText === 'crispy') {
    return [];
  }

  const matchedApps = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of asianAppsKnowledge) {
    const match = matchEntry(item, menuItemText, { minConfidence: 2 });
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedApps.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedApps;
}

module.exports = {
  asianAppsKnowledge,
  getAsianAppsKnowledge,
  extractAsianAppsFromText
};

