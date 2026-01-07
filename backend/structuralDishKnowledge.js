/**
 * MenYOU Local Knowledge: Structural Dishes
 * 
 * This module contains canonical guidance for dishes where gluten and/or dairy
 * are structural (core to the dish identity) and not realistically modifiable.
 * 
 * This data is used as a logic layer BEFORE AI reasoning.
 * 
 * Core rule:
 * All entries in this module return NOT AN OPTION when matched.
 * These are dishes where removing the allergen fundamentally changes the dish.
 */

const { normalizeName } = require('./sauceKnowledge');
const { matchEntry } = require('./knowledgeMatch');

const structuralDishKnowledge = [
  {
    itemName: 'Creamy / Cheesy Sauce Pastas',
    dishFamily: 'Creamy / Cheesy Sauce Pastas',
    aliases: [
      'fettuccine alfredo',
      'chicken alfredo',
      'shrimp alfredo',
      'seafood alfredo',
      'penne alla vodka',
      'rigatoni alla vodka',
      'vodka rosa pasta',
      'carbonara pasta',
      'chicken carbonara'
    ],
    matchPatterns: [
      ['alfredo', 'pasta'],
      ['alfredo', 'fettuccine'],
      ['alfredo', 'penne'],
      ['alfredo', 'rigatoni'],
      ['alfredo', 'linguine'],
      ['vodka', 'pasta'],
      ['vodka', 'rosa', 'pasta'],
      ['vodka', 'penne'],
      ['vodka', 'rigatoni'],
      ['carbonara', 'pasta'],
      ['carbonara', 'penne'],
      ['carbonara', 'rigatoni'],
      ['cream', 'sauce', 'pasta'],
      ['cheese', 'sauce', 'pasta'],
      ['parmesan', 'cream', 'pasta']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Cream/cheese sauce and wheat pasta are core to the dish identity',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Alfredo, vodka sauce, and carbonara are cream/cheese-based sauces that cannot be removed without fundamentally changing the dish. Requires BOTH sauce keywords AND pasta keywords.'
  },
  {
    itemName: 'Cheese-Filled Stuffed Pastas',
    dishFamily: 'Cheese-Filled Stuffed Pastas',
    aliases: [
      'four-cheese ravioli',
      'cheese ravioli',
      'cheese tortelloni',
      'cheese tortellini',
      'stuffed shells',
      'manicotti',
      'cannelloni'
    ],
    matchPatterns: [
      ['cheese', 'ravioli'],
      ['cheese', 'tortellini'],
      ['cheese', 'tortelloni'],
      ['stuffed', 'shells'],
      ['manicotti'],
      ['cannelloni']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pasta shell and cheese filling are both core structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Stuffed pastas require both pasta (gluten) and cheese filling (dairy) as structural components.'
  },
  {
    itemName: 'Breaded / Fried Stuffed Pasta Appetizers',
    dishFamily: 'Breaded / Fried Stuffed Pasta Appetizers',
    aliases: [
      'toasted ravioli',
      'fried ravioli',
      'baked ravioli parmesan',
      'stuffed ziti fritta',
      'lasagna fritta'
    ],
    matchPatterns: [
      ['toasted', 'ravioli'],
      ['fried', 'ravioli'],
      ['baked', 'ravioli'],
      ['lasagna', 'fritta']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Breaded pasta with cheese filling - both components are structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Fried/breaded stuffed pastas require breading (gluten) and cheese filling (dairy).'
  },
  {
    itemName: 'Baked Cheese Pastas',
    dishFamily: 'Baked Cheese Pastas',
    aliases: [
      'five cheese ziti al forno',
      'baked ziti',
      'baked rigatoni',
      'pasta al forno'
    ],
    matchPatterns: [
      ['baked', 'ziti'],
      ['baked', 'rigatoni'],
      ['five', 'cheese', 'ziti'],
      ['pasta', 'al', 'forno']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Baked pasta with multiple cheeses - both pasta and cheese are structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Baked pasta dishes require wheat pasta (gluten) and multiple cheeses (dairy) as core components.'
  },
  {
    itemName: 'Lasagna',
    dishFamily: 'Lasagna',
    aliases: [
      'lasagna',
      'lasagna classico',
      'lasagne',
      'meat lasagna'
    ],
    matchPatterns: [
      ['lasagna'],
      ['lasagne']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pasta sheets and cheese layers are core structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Lasagna requires pasta sheets (gluten) and cheese layers (dairy) as structural components.'
  },
  {
    itemName: 'Parmigiana-Style Breaded Entrées',
    dishFamily: 'Parmigiana-Style Breaded Entrées',
    aliases: [
      'chicken parmigiana',
      'chicken parmesan',
      'chicken parm',
      'eggplant parmigiana',
      'veal parmesan',
      'veal parm'
    ],
    matchPatterns: [
      ['chicken', 'parmigiana'],
      ['chicken', 'parmesan'],
      ['chicken', 'parm'],
      ['eggplant', 'parmigiana'],
      ['veal', 'parmesan'],
      ['veal', 'parm'],
      ['breaded', 'parmigiana'],
      ['breaded', 'parmesan'],
      ['breaded', 'parm']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Breaded coating (gluten) and parmesan/cheese topping (dairy) are structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Parmigiana dishes require breading (gluten) and parmesan cheese (dairy) as structural components. Requires breaded + parm keywords.'
  },
  {
    itemName: 'Breaded Fried Mozzarella',
    dishFamily: 'Breaded Fried Mozzarella',
    aliases: [
      'fried mozzarella',
      'crispy mozzarella',
      'mozzarella sticks'
    ],
    matchPatterns: [
      ['fried', 'mozzarella'],
      ['crispy', 'mozzarella'],
      ['mozzarella', 'sticks']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Breaded coating (gluten) and mozzarella cheese (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Fried mozzarella requires breading (gluten) and mozzarella cheese (dairy) as structural components.'
  },
  {
    itemName: 'Cheesy Garlic Bread',
    dishFamily: 'Cheesy Garlic Bread',
    aliases: [
      'mozzarella garlic bread',
      'garlic bread with cheese',
      'truffle garlic bread'
    ],
    matchPatterns: [
      ['garlic', 'bread', 'cheese'],
      ['mozzarella', 'garlic', 'bread'],
      ['truffle', 'garlic', 'bread']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Bread (gluten) and cheese topping (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Cheesy garlic bread requires bread (gluten) and cheese (dairy) as structural components.'
  },
  {
    itemName: 'Spinach & Artichoke Dip',
    dishFamily: 'Spinach & Artichoke Dip',
    aliases: [
      'spinach & artichoke dip',
      'spinach-artichoke dip',
      'spinach and artichoke dip'
    ],
    matchPatterns: [
      ['spinach', 'artichoke', 'dip']
    ],
    structuralAllergens: ['dairy'],
    whyStructural: 'Cream cheese and/or sour cream are core to the dip',
    suggestedServerQuestions: [
      'Is there a dairy-free version available?'
    ],
    notes: 'Spinach and artichoke dip requires cream cheese or sour cream (dairy) as a structural component.'
  },
  {
    itemName: 'Tiramisu',
    dishFamily: 'Tiramisu',
    aliases: [
      'tiramisu',
      'classic tiramisu'
    ],
    matchPatterns: [
      ['tiramisu']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Ladyfingers (gluten) and mascarpone (dairy) are core structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Tiramisu requires ladyfingers (gluten) and mascarpone cheese (dairy) as structural components.'
  },
  {
    itemName: 'Cannoli',
    dishFamily: 'Cannoli',
    aliases: [
      'cannoli',
      'chocolate chip cannoli',
      'mini cannoli'
    ],
    matchPatterns: [
      ['cannoli']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Fried pastry shell (gluten) and ricotta filling (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Cannoli requires fried pastry shell (gluten) and ricotta filling (dairy) as structural components.'
  },
  {
    itemName: 'Shrimp Scampi',
    dishFamily: 'Shrimp Scampi',
    aliases: [
      'shrimp scampi',
      'scampi'
    ],
    matchPatterns: [
      ['shrimp', 'scampi']
    ],
    structuralAllergens: ['dairy'],
    whyStructural: 'Butter is a core structural component of scampi preparation',
    suggestedServerQuestions: [
      'Is there a dairy-free version available?'
    ],
    notes: 'Shrimp scampi requires butter (dairy) as a structural component of the preparation.'
  },
  {
    itemName: 'Scampi Pasta',
    dishFamily: 'Scampi Pasta',
    aliases: [
      'shrimp scampi pasta',
      'scampi linguine',
      'scampi angel hair',
      'scampi over pasta'
    ],
    matchPatterns: [
      ['scampi', 'pasta'],
      ['scampi', 'linguine'],
      ['scampi', 'angel', 'hair'],
      ['scampi', 'over', 'pasta']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Butter (dairy) and wheat pasta (gluten) are both structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free version available?'
    ],
    notes: 'Scampi pasta requires butter (dairy) and wheat pasta (gluten) as structural components.'
  },
  // ================================================
  // ITALIAN FAST-CASUAL: PIZZA & DOUGH POCKETS
  // ================================================
  {
    itemName: 'Cheese Pizza / Pizza',
    dishFamily: 'Pizza',
    aliases: [
      'cheese pizza',
      'pepperoni pizza',
      'margherita pizza',
      'pizza slice',
      'pizza pie',
      'personal pizza',
      'thin crust pizza',
      'deep dish pizza',
      'new york pizza',
      'chicago pizza',
      'neapolitan pizza'
    ],
    matchPatterns: [
      ['pizza', 'slice'],
      ['pizza', 'pie'],
      ['pizza', 'crust'],
      ['pizza', 'dough'],
      ['pepperoni', 'pizza'],
      ['cheese', 'pizza'],
      ['margherita', 'pizza'],
      ['personal', 'pizza'],
      ['thin', 'crust', 'pizza'],
      ['deep', 'dish', 'pizza'],
      ['new', 'york', 'pizza'],
      ['chicago', 'pizza'],
      ['neapolitan', 'pizza'],
      ['slice', 'pizza'],
      ['za'],
      ['pie']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pizza dough (gluten) and cheese (dairy) are core structural components',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free pizza option available?',
      'Do you have any crustless or bowl-style alternatives?'
    ],
    notes: 'Pizza requires wheat dough (gluten) and cheese (dairy) as structural components. Patterns require dough/crust/slice/pie tokens to avoid matching "pizza bowl" or "crustless pizza".'
  },
  {
    itemName: 'Stuffed Crust / Cheese-Stuffed Crust Pizza',
    dishFamily: 'Stuffed Crust Pizza',
    aliases: [
      'stuffed crust pizza',
      'cheese-stuffed crust',
      'stuffed crust',
      'cheese stuffed crust pizza'
    ],
    matchPatterns: [
      ['stuffed', 'crust', 'pizza'],
      ['stuffed', 'crust'],
      ['cheese', 'stuffed', 'crust'],
      ['cheese', 'stuffed', 'crust', 'pizza']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pizza dough (gluten) and cheese-stuffed crust (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free pizza option available?'
    ],
    notes: 'Stuffed crust pizza requires wheat dough (gluten) and cheese-stuffed crust (dairy) as structural components.'
  },
  {
    itemName: 'Calzone',
    dishFamily: 'Calzone',
    aliases: [
      'calzone',
      'cheese calzone',
      'pepperoni calzone',
      'calzone pocket',
      'stuffed calzone'
    ],
    matchPatterns: [
      ['calzone'],
      ['cheese', 'calzone'],
      ['pepperoni', 'calzone'],
      ['calzone', 'pocket'],
      ['stuffed', 'calzone']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pizza dough pocket (gluten) and cheese filling (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free calzone option available?'
    ],
    notes: 'Calzone requires pizza dough (gluten) and cheese filling (dairy) as structural components.'
  },
  {
    itemName: 'Stromboli',
    dishFamily: 'Stromboli',
    aliases: [
      'stromboli',
      'pepperoni stromboli',
      'italian stromboli',
      'cheese stromboli'
    ],
    matchPatterns: [
      ['stromboli'],
      ['pepperoni', 'stromboli'],
      ['italian', 'stromboli'],
      ['cheese', 'stromboli']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pizza dough roll (gluten) and cheese filling (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free stromboli option available?'
    ],
    notes: 'Stromboli requires pizza dough (gluten) and cheese filling (dairy) as structural components.'
  },
  {
    itemName: 'Cheese Bread / Cheesy Bread / Mozzarella Bread',
    dishFamily: 'Cheese Bread',
    aliases: [
      'cheesy bread',
      'cheese bread',
      'mozzarella bread',
      'garlic bread with cheese',
      'cheese sticks',
      'mozzarella sticks',
      'cheesy garlic bread'
    ],
    matchPatterns: [
      ['cheesy', 'bread'],
      ['cheese', 'bread'],
      ['mozzarella', 'bread'],
      ['garlic', 'bread', 'cheese'],
      ['garlic', 'bread', 'mozzarella'],
      ['cheese', 'sticks'],
      ['mozzarella', 'sticks'],
      ['cheesy', 'garlic', 'bread']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Bread (gluten) and cheese topping (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free bread option available?'
    ],
    notes: 'Cheese bread requires bread (gluten) and cheese (dairy) as structural components. Requires cheese/mozzarella/parmesan tokens to avoid matching generic "garlic bread".'
  },
  {
    itemName: 'Garlic Knots with Cheese / Cheesy Knots',
    dishFamily: 'Cheesy Garlic Knots',
    aliases: [
      'cheesy garlic knots',
      'garlic knots with cheese',
      'garlic knots w cheese',
      'stuffed knots',
      'cheese knots'
    ],
    matchPatterns: [
      ['cheesy', 'garlic', 'knots'],
      ['garlic', 'knots', 'cheese'],
      ['garlic', 'knots', 'w', 'cheese'],
      ['stuffed', 'knots'],
      ['cheese', 'knots']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pizza dough knots (gluten) and cheese (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free option available?'
    ],
    notes: 'Cheesy garlic knots require pizza dough (gluten) and cheese (dairy) as structural components. Requires cheese token to avoid matching plain "garlic knots".'
  },
  {
    itemName: 'Pizza Rolls / Pizza Pockets',
    dishFamily: 'Pizza Rolls',
    aliases: [
      'pizza rolls',
      'pizza pockets',
      'pizza bites',
      'mini pizza rolls'
    ],
    matchPatterns: [
      ['pizza', 'rolls'],
      ['pizza', 'pockets'],
      ['pizza', 'bites'],
      ['mini', 'pizza', 'rolls']
    ],
    structuralAllergens: ['gluten', 'dairy'],
    whyStructural: 'Pizza dough wrapper (gluten) and cheese filling (dairy) are both structural',
    suggestedServerQuestions: [
      'Is there a gluten-free and dairy-free option available?'
    ],
    notes: 'Pizza rolls/pockets require pizza dough (gluten) and cheese filling (dairy) as structural components.'
  }
];

/**
 * Extract structural dishes mentioned in menu item text
 * @param {string} menuItemText - Menu item name and description combined
 * @returns {Array<Object>} Array of matched structural dish objects (deduplicated)
 */
function extractStructuralDishesFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedDishes = [];
  const seenDishFamilies = new Set();
  const normalizedText = normalizeName(menuItemText);
  const textTokens = normalizedText.split(/\s+/).filter(t => t.length > 0);

  // Pasta keywords for guardrail checks
  const pastaKeywords = ['pasta', 'penne', 'rigatoni', 'fettuccine', 'linguine', 'ravioli', 'tortellini', 'ziti', 'spaghetti', 'angel', 'hair'];
  const hasPastaKeyword = pastaKeywords.some(keyword => normalizedText.includes(keyword));

  // Sauce keywords for creamy/cheesy sauce pastas
  const sauceKeywords = ['alfredo', 'vodka', 'rosa', 'cream', 'sauce', 'parmesan', 'cheese', 'sauce', 'carbonara'];
  const hasSauceKeyword = sauceKeywords.some(keyword => normalizedText.includes(keyword));

  // Use shared matching utility with minimum confidence threshold
  // Require confidence >= 3 to avoid false positives from generic tokens
  for (const dish of structuralDishKnowledge) {
    const match = matchEntry(dish, menuItemText, { minConfidence: 3 });
    if (match.matched && match.confidence >= 3 && !seenDishFamilies.has(dish.itemName)) {
      // Guardrail: For creamy/cheesy sauce pastas, require BOTH sauce keywords AND pasta keywords
      // Exception: If matched by alias (exact match), trust the alias (aliases already include pasta keywords)
      if (dish.itemName === 'Creamy / Cheesy Sauce Pastas') {
        // If matched by pattern (not alias/name), require both keywords
        if (match.matchedBy === 'pattern') {
          if (!hasPastaKeyword || !hasSauceKeyword) {
            continue; // Skip if missing required keywords
          }
        }
        // If matched by alias/name, trust it (aliases like "chicken alfredo" already include context)
      }
      
      // Guardrail: For parmigiana dishes, require breaded + parm keywords (or exact alias match)
      if (dish.itemName === 'Parmigiana-Style Breaded Entrées') {
        // If matched by pattern (not alias), check for required keywords
        if (match.matchedBy === 'pattern') {
          const hasBreadedKeyword = normalizedText.includes('breaded') || 
                                   normalizedText.includes('chicken') || 
                                   normalizedText.includes('eggplant') || 
                                   normalizedText.includes('veal');
          const hasParmKeyword = normalizedText.includes('parmigiana') || 
                                normalizedText.includes('parmesan') || 
                                normalizedText.includes('parm');
          if (!hasBreadedKeyword || !hasParmKeyword) {
            continue; // Skip if missing required keywords
          }
        }
        // If matched by alias/name, trust it (aliases like "chicken parmesan" already include context)
      }
      
      // Guardrail: For pizza, exclude "pizza bowl" and "crustless pizza" (these are modifiable)
      if (dish.itemName === 'Cheese Pizza / Pizza') {
        // Negative qualifiers that indicate modifiable/non-structural pizza
        const negativeQualifiers = ['pizza bowl', 'crustless pizza', 'pizza without crust', 'bowl pizza'];
        const hasNegativeQualifier = negativeQualifiers.some(qualifier => normalizedText.includes(qualifier));
        if (hasNegativeQualifier) {
          continue; // Skip pizza bowl / crustless pizza
        }
        
        // If matched by pattern (not alias), require dough/crust/slice/pie tokens
        if (match.matchedBy === 'pattern') {
          const pizzaAnchorTokens = ['crust', 'dough', 'slice', 'pie', 'za'];
          const hasPizzaAnchor = pizzaAnchorTokens.some(token => normalizedText.includes(token));
          // Also allow if "pizza" appears with a topping (pepperoni, cheese, margherita, etc.)
          const hasTopping = normalizedText.includes('pepperoni') || 
                            normalizedText.includes('cheese') || 
                            normalizedText.includes('margherita') ||
                            normalizedText.includes('personal') ||
                            normalizedText.includes('thin') ||
                            normalizedText.includes('deep') ||
                            normalizedText.includes('dish');
          if (!hasPizzaAnchor && !hasTopping) {
            continue; // Skip if no anchor or topping (too generic)
          }
        }
        // If matched by alias/name, trust it (aliases like "cheese pizza" already include context)
      }
      
      matchedDishes.push(dish);
      seenDishFamilies.add(dish.itemName);
    }
  }

  return matchedDishes;
}

module.exports = {
  structuralDishKnowledge,
  extractStructuralDishesFromText
};

