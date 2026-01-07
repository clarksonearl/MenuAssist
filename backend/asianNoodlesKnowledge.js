/**
 * MenYOU Local Knowledge: Asian Noodles
 * 
 * This module contains canonical guidance information for Asian noodle dishes.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * - Wheat noodles (lo mein, chow mein, udon, ramen) = structural gluten (NOT AN OPTION)
 * - Rice/glass noodles (pad thai, pho, vermicelli) = CAUTION (sauces/cross-contact)
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const asianNoodlesKnowledge = [
  {
    itemName: 'Wheat Noodles (Lo Mein, Chow Mein, Udon, Ramen)',
    aliases: ['lo mein', 'chow mein', 'udon', 'ramen', 'yakisoba', 'soba'],
    matchPatterns: [
      ['lo', 'mein'],
      ['chow', 'mein'],
      ['udon'],
      ['ramen'],
      ['yakisoba'],
      ['soba'],
      ['noodle', 'bowl'],
      ['noodle', 'soup'],
      ['drunken', 'noodles']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'common',
        sources: ['wheat noodles'],
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
    reasonForCaution: 'Wheat noodles contain gluten as a core ingredient',
    notes: 'Wheat noodles = NOT AN OPTION for gluten. Gluten is structural and cannot be removed.'
  },
  {
    itemName: 'Rice/Glass Noodles (Pad Thai, Pho, Vermicelli)',
    aliases: ['pad thai', 'pho', 'vermicelli', 'drunken noodles', 'chow fun', 'mei fun'],
    matchPatterns: [
      ['pad', 'thai'],
      ['pho'],
      ['vermicelli'],
      ['drunken', 'noodles'],
      ['chow', 'fun'],
      ['mei', 'fun'],
      ['rice', 'noodles'],
      ['glass', 'noodles'],
      ['mung', 'bean', 'noodles'],
      ['cellophane', 'noodles']
    ],
    allergens: {
      gluten: {
        present: true,
        likelihood: 'possible',
        sources: ['soy sauce', 'cross-contact'],
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
    reasonForCaution: 'Rice/glass noodles may contain gluten from sauces or cross-contact',
    hiddenRisks: {
      gluten: {
        risk: 'possible',
        source: 'soy sauce or cross-contact during preparation',
        canBeAvoided: true
      }
    },
    suggestedServerQuestions: [
      'Are soy sauce or other gluten-containing sauces used?',
      'Is there a risk of cross-contact with wheat noodles?'
    ],
    notes: 'Rice/glass noodles = CAUTION for gluten. Noodles themselves are gluten-free, but sauces and cross-contact are risks.'
  }
];

/**
 * Get Asian noodles knowledge by name
 * @param {string} itemName - Name of the noodle dish to look up
 * @returns {Object|null} Noodle knowledge entry or null if not found
 */
function getAsianNoodlesKnowledge(itemName) {
  if (!itemName) return null;
  
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  
  // First, try exact match on itemName
  const exactMatch = asianNoodlesKnowledge.find(item => 
    normalizeName(item.itemName) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Then, try aliases
  const aliasMatch = asianNoodlesKnowledge.find(item => {
    if (!item.aliases || item.aliases.length === 0) return false;
    return item.aliases.some(alias => normalizeName(alias) === normalized);
  });
  if (aliasMatch) return aliasMatch;
  
  return null;
}

/**
 * Extract Asian noodle dishes mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched noodle dish objects (deduplicated)
 */
function extractAsianNoodlesFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const normalizedText = normalizeName(menuItemText);
  
  // HARD GATE: Do NOT trigger on single vague tokens
  // Reject: "noodles" alone, "soy" alone, "sauce" alone
  const stopTokens = ['noodles', 'soy', 'sauce', 'sushi', 'poke', 'spring roll'];
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
  if (normalizedText === 'spring roll' || normalizedText === 'spring rolls') {
    return [];
  }

  const matchedNoodles = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of asianNoodlesKnowledge) {
    const match = matchEntry(item, menuItemText, { minConfidence: 2 });
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedNoodles.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedNoodles;
}

module.exports = {
  asianNoodlesKnowledge,
  getAsianNoodlesKnowledge,
  extractAsianNoodlesFromText
};

