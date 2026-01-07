/**
 * MenYOU Local Knowledge: Italian Fast-Casual Sandwiches / Paninis / Subs
 * 
 * This module contains canonical guidance information for Italian fast-casual
 * sandwich items that may contain gluten and/or dairy.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * Italian sandwiches often have structural gluten (bread) and/or dairy (cheese),
 * with varying degrees of modifiability depending on the specific item.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const italianSandwichKnowledge = [
  {
    itemName: 'Meatball Sub / Meatball Sandwich',
    dishFamily: 'italian_sandwich',
    aliases: [
      'meatball sub',
      'meatball sandwich',
      'meatball hoagie',
      'meatball grinder',
      'meatball hero'
    ],
    matchPatterns: [
      ['meatball', 'sub'],
      ['meatball', 'sandwich'],
      ['meatball', 'hoagie'],
      ['meatball', 'grinder'],
      ['meatball', 'hero']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Bread is structural; meatballs often contain parmesan (dairy) but cheese can usually be omitted',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Do the meatballs contain cheese, and can it be omitted?'
    ],
    notes: 'Bread is structural gluten. Dairy from parmesan/provolone is often present but removable. Default to CAUTION for gluten, CAUTION for dairy if present.'
  },
  {
    itemName: 'Chicken Parmesan / Chicken Parm Sub',
    dishFamily: 'italian_sandwich',
    aliases: [
      'chicken parmesan sub',
      'chicken parm sub',
      'chicken parmesan sandwich',
      'chicken parm sandwich',
      'chicken parm hoagie'
    ],
    matchPatterns: [
      ['chicken', 'parmesan', 'sub'],
      ['chicken', 'parm', 'sub'],
      ['chicken', 'parmesan', 'sandwich'],
      ['chicken', 'parm', 'sandwich'],
      ['chicken', 'parm', 'hoagie']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Breaded chicken (gluten) and parmesan cheese (dairy) are both structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Chicken parm requires breaded coating (gluten) and parmesan cheese (dairy) as structural components. NOT AN OPTION for both allergens.'
  },
  {
    itemName: 'Eggplant Parmesan Sub',
    dishFamily: 'italian_sandwich',
    aliases: [
      'eggplant parmesan sub',
      'eggplant parm sub',
      'eggplant parmesan sandwich',
      'eggplant parm sandwich'
    ],
    matchPatterns: [
      ['eggplant', 'parmesan', 'sub'],
      ['eggplant', 'parm', 'sub'],
      ['eggplant', 'parmesan', 'sandwich'],
      ['eggplant', 'parm', 'sandwich']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Breaded eggplant (gluten) and parmesan cheese (dairy) are both structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Eggplant parm requires breaded coating (gluten) and parmesan cheese (dairy) as structural components. NOT AN OPTION for both allergens.'
  },
  {
    itemName: 'Italian Sub / Hoagie / Grinder',
    dishFamily: 'italian_sandwich',
    aliases: [
      'italian sub',
      'italian hoagie',
      'italian grinder',
      'italian hero',
      'italian sandwich'
    ],
    matchPatterns: [
      ['italian', 'sub'],
      ['italian', 'hoagie'],
      ['italian', 'grinder'],
      ['italian', 'hero'],
      ['italian', 'sandwich']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Bread is structural; provolone/cheese is common but removable; deli cross-contact risk exists',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Can I get it without cheese?',
      'Is the deli meat sliced on shared equipment?'
    ],
    notes: 'Bread is structural gluten. Provolone/cheese is common but removable. Deli cross-contact is a concern. CAUTION for gluten, CAUTION for dairy if present.'
  },
  {
    itemName: 'Panini with Cheese / Pesto Panini',
    dishFamily: 'italian_sandwich',
    aliases: [
      'pesto panini',
      'mozzarella panini',
      'provolone panini',
      'caprese panini',
      'chicken pesto panini',
      'panini with pesto',
      'panini with mozzarella',
      'panini with pesto and mozzarella'
    ],
    matchPatterns: [
      ['pesto', 'panini'],
      ['mozzarella', 'panini'],
      ['provolone', 'panini'],
      ['caprese', 'panini'],
      ['chicken', 'pesto', 'panini'],
      ['pesto', 'mozzarella', 'panini'],
      ['panini', 'pesto'],
      ['panini', 'mozzarella'],
      ['panini', 'pesto', 'mozzarella'],
      ['panini', 'with', 'pesto'],
      ['panini', 'with', 'mozzarella'],
      ['panini', 'with', 'pesto', 'and', 'mozzarella'],
      ['panini', 'with', 'mozzarella', 'and', 'pesto']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Panini bread is structural gluten; cheese/pesto may contain dairy but is often removable',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Does the pesto contain cheese, and can it be omitted?'
    ],
    notes: 'Panini bread is structural gluten. Cheese/pesto dairy is often present but removable. CAUTION for gluten, CAUTION for dairy if present.'
  },
  {
    itemName: 'Garlic Bread Sandwich / Cheesy Garlic Bread Sandwich',
    dishFamily: 'italian_sandwich',
    aliases: [
      'garlic bread sandwich',
      'cheesy garlic bread sandwich',
      'garlic bread sub'
    ],
    matchPatterns: [
      ['garlic', 'bread', 'sandwich'],
      ['cheesy', 'garlic', 'bread', 'sandwich'],
      ['garlic', 'bread', 'sub']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Bread (gluten) and cheese (dairy) are both structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Garlic bread sandwich requires bread (gluten) and cheese (dairy) as structural components. NOT AN OPTION for both allergens.'
  },
  {
    itemName: 'Caprese Sandwich',
    dishFamily: 'italian_sandwich',
    aliases: [
      'caprese sandwich',
      'caprese sub',
      'caprese panini',
      'tomato mozzarella sandwich',
      'tomato basil mozzarella sandwich'
    ],
    matchPatterns: [
      ['caprese', 'sandwich'],
      ['caprese', 'sub'],
      ['caprese', 'panini'],
      ['tomato', 'mozzarella', 'sandwich'],
      ['tomato', 'basil', 'mozzarella', 'sandwich']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Bread is structural gluten; mozzarella is common but removable',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Can I get it without mozzarella?'
    ],
    notes: 'Bread is structural gluten. Mozzarella is common but removable. CAUTION for gluten, CAUTION for dairy if present.'
  },
  {
    itemName: 'Sausage & Peppers Sub',
    dishFamily: 'italian_sandwich',
    aliases: [
      'sausage and peppers sub',
      'sausage peppers sub',
      'sausage and peppers sandwich',
      'sausage peppers sandwich',
      'sausage peppers hoagie'
    ],
    matchPatterns: [
      ['sausage', 'peppers', 'sub'],
      ['sausage', 'and', 'peppers', 'sub'],
      ['sausage', 'peppers', 'sandwich'],
      ['sausage', 'and', 'peppers', 'sandwich'],
      ['sausage', 'peppers', 'hoagie'],
      ['sausage', 'peppers', 'roll'],
      ['sausage', 'and', 'peppers', 'roll']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Bread is structural gluten; cheese may be added but is removable',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Bread is structural gluten. Cheese is optional and removable. CAUTION for gluten, CAUTION for dairy if present.'
  },
  {
    itemName: 'Italian Beef Sandwich',
    dishFamily: 'italian_sandwich',
    aliases: [
      'italian beef sandwich',
      'italian beef sub',
      'italian beef hoagie'
    ],
    matchPatterns: [
      ['italian', 'beef', 'sandwich'],
      ['italian', 'beef', 'sub'],
      ['italian', 'beef', 'hoagie']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Bread is structural gluten; cheese/peppers may be added but are removable',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Bread is structural gluten. Cheese/peppers are optional and removable. CAUTION for gluten, CAUTION for dairy if present.'
  },
  {
    itemName: 'Bruschetta Sandwich / Tomato Basil Sandwich',
    dishFamily: 'italian_sandwich',
    aliases: [
      'bruschetta sandwich',
      'tomato basil sandwich',
      'tomato basil sub'
    ],
    matchPatterns: [
      ['bruschetta', 'sandwich'],
      ['tomato', 'basil', 'sandwich'],
      ['tomato', 'basil', 'sub']
    ],
    structuralAllergens: ['gluten'],
    whyStructural: 'Bread is structural gluten; cheese may be added but is removable',
    suggestedServerQuestions: [
      'Can I get this without the bread or with a lettuce wrap?',
      'Can I get it without cheese?'
    ],
    notes: 'Bread is structural gluten. Cheese is optional and removable. CAUTION for gluten, CAUTION for dairy if present.'
  }
];

/**
 * Extract Italian sandwiches mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched Italian sandwich objects (deduplicated)
 */
function extractItalianSandwichesFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedSandwiches = [];
  const seenItemNames = new Set();
  const normalizedText = normalizeName(menuItemText);

  // Guardrail: Do NOT match on single tokens alone
  // Require at least 2 tokens for a match (e.g., "meatball sub", not just "sub")
  const textTokens = normalizedText.split(/\s+/).filter(t => t.length > 0);
  if (textTokens.length < 2) {
    return []; // Single token - too generic
  }

  // ROUTING LOGIC: Check if Italian sandwich anchor tokens are present
  // This ensures italianSandwich is invoked when Italian ingredients are detected
  const wrapperTokens = ['sandwich', 'sub', 'hoagie', 'grinder', 'panini', 'wrap', 'bun', 'roll', 'hero', 'po', 'boy'];
  const hasWrapperToken = wrapperTokens.some(token => normalizedText.includes(token));
  
  const italianSandwichAnchors = [
    'caprese',
    'prosciutto',
    'mortadella',
    'salami',
    'pepperoni',
    'meatball',
    'eggplant parm',
    'chicken parm',
    'sausage',
    'peppers',
    'giardiniera',
    'mozzarella',
    'pesto',
    'marinara',
    'parmesan',
    'parm',
    'provolone'
  ];
  const hasItalianAnchor = italianSandwichAnchors.some(anchor => normalizedText.includes(anchor));
  
  // If wrapper token exists AND Italian anchor exists, proceed with matching
  // This ensures italianSandwich is invoked for Italian sandwich items
  if (hasWrapperToken && hasItalianAnchor) {
    // Proceed with matching - Italian sandwich detected
  } else if (!hasWrapperToken) {
    // No wrapper token - not a sandwich context
    return [];
  } else if (!hasItalianAnchor) {
    // Has wrapper but no Italian anchor - might be generic sandwich, skip italianSandwich
    return [];
  }

  // Additional guardrail: For "caprese" or "panini", require sandwich context
  // Do NOT allow "caprese" alone or "panini" alone to match
  const hasCaprese = normalizedText.includes('caprese');
  const hasPanini = normalizedText.includes('panini');
  
  if (hasCaprese) {
    // Require sandwich context tokens
    const sandwichContextTokens = ['sandwich', 'sub', 'panini', 'roll', 'hoagie', 'grinder', 'hero'];
    const hasSandwichContext = sandwichContextTokens.some(token => normalizedText.includes(token));
    if (!hasSandwichContext) {
      return []; // "Caprese" alone - too generic
    }
  }
  
  if (hasPanini && !normalizedText.includes('pesto') && !normalizedText.includes('mozzarella') && 
      !normalizedText.includes('provolone') && !normalizedText.includes('caprese') && 
      !normalizedText.includes('cheese')) {
    // "Panini" alone without filling indicators - too generic
    return [];
  }

  // Use shared matching utility with minimum confidence threshold
  for (const item of italianSandwichKnowledge) {
    const match = matchEntry(item, menuItemText, { minConfidence: 2 });
    if (match.matched && match.confidence >= 2 && !seenItemNames.has(item.itemName)) {
      matchedSandwiches.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedSandwiches;
}

/**
 * Get Italian sandwich knowledge for a specific item
 * @param {string} itemName - Item name to look up
 * @returns {Object|null} Italian sandwich knowledge entry or null
 */
function getItalianSandwichKnowledge(itemName) {
  if (!itemName || typeof itemName !== 'string') {
    return null;
  }

  const normalized = normalizeName(itemName);
  for (const item of italianSandwichKnowledge) {
    if (normalizeName(item.itemName) === normalized) {
      return item;
    }
    if (item.aliases && item.aliases.some(alias => normalizeName(alias) === normalized)) {
      return item;
    }
  }

  return null;
}

module.exports = {
  italianSandwichKnowledge,
  getItalianSandwichKnowledge,
  extractItalianSandwichesFromText
};

