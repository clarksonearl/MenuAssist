# MenYOU Knowledge Module Refactoring Guide

## Completed ✅

1. **`knowledgeMatch.js`** - Shared matching utility created
   - `normalizeText()` - Normalizes text for matching
   - `tokenize()` - Splits text into tokens
   - `hasAllTokens()` - Checks if all required tokens are present
   - `matchEntry()` - Main matching function with confidence scoring
   - Rejects vague single tokens (sauce, rice, chicken, etc.)
   - Allows strong single keywords (alfredo, tempura, caesar, etc.)

2. **`sauceKnowledge.js`** - Updated
   - Uses `matchEntry()` for matching
   - `matchPatterns` converted to arrays of tokens: `[['cream', 'sauce'], ['alfredo']]`
   - `extractSaucesFromText()` uses shared matching

3. **`menuParsing.js`** - Updated
   - Uses `matchEntry()` for extraction
   - `buildSauceCautionContext()` returns `null` if no CAUTION/NOT_AN_OPTION
   - Returns `null` if no toggled allergens (hard rule)

4. **`saladDressingKnowledge.js`** - Updated
   - Uses `matchEntry()` for matching
   - `matchPatterns` converted to arrays of tokens
   - `extractDressingsFromText()` and `extractSaladsFromText()` use shared matching

5. **`saladDressingEvaluation.js`** - Updated
   - `buildSaladDressingContext()` returns `null` if no CAUTION/NOT_AN_OPTION
   - Returns `null` if no toggled allergens (hard rule)

## Pattern for Remaining Modules

### Step 1: Update Knowledge Module

```javascript
// Add import at top
const { matchEntry } = require('./knowledgeMatch');

// Convert matchPatterns from strings to arrays of tokens
// OLD: matchPatterns: ['cream sauce', 'alfredo']
// NEW: matchPatterns: [['cream', 'sauce'], ['alfredo']]

// Update extraction function to use matchEntry
function extractItemsFromText(menuItemText) {
  if (!menuItemText || typeof menuItemText !== 'string') {
    return [];
  }

  const matchedItems = [];
  const seenItemNames = new Set();

  // Use shared matching utility
  for (const item of itemKnowledge) {
    const match = matchEntry(item, menuItemText);
    if (match.matched && !seenItemNames.has(item.itemName)) {
      matchedItems.push(item);
      seenItemNames.add(item.itemName);
    }
  }

  return matchedItems;
}
```

### Step 2: Update Evaluation Module

```javascript
function buildItemContext(menuItemText, toggledAllergens) {
  // Hard rule: return null if no toggled allergens
  if (!toggledAllergens || typeof toggledAllergens !== 'object') {
    return null;
  }
  if (toggledAllergens.gluten !== true && toggledAllergens.dairy !== true) {
    return null;
  }

  const evaluation = evaluateItem(menuItemText, toggledAllergens);
  
  if (!evaluation) {
    return null; // No match found
  }

  // Only return CAUTION or NOT AN OPTION
  if (evaluation.outcome !== 'CAUTION' && evaluation.outcome !== 'NOT AN OPTION') {
    return null; // Don't include GENERALLY OK
  }

  return {
    detected: true,
    evaluation: evaluation,
    hasCaution: evaluation.outcome === 'CAUTION',
    isNotAnOption: evaluation.outcome === 'NOT AN OPTION',
    guidance: evaluation.guidance,
    internalOutcome: evaluation.internalOutcome
  };
}
```

## Modules Still Needing Updates

1. **`burgerKnowledge.js`** + `burgerEvaluation.js`
2. **`sandwichKnowledge.js`** + `sandwichEvaluation.js`
3. **`friedFoodKnowledge.js`** + `friedFoodEvaluation.js`
4. **`breakfastKnowledge.js`** + `breakfastEvaluation.js`
5. **`mexicanFoodKnowledge.js`** + `mexicanFoodEvaluation.js`
6. **`pastaItalianKnowledge.js`** + `pastaItalianEvaluation.js`
7. **`asianFoodKnowledge.js`** + `asianFoodEvaluation.js`

## MatchPattern Conversion Examples

### Before (strings):
```javascript
matchPatterns: ['cream sauce', 'alfredo', 'cheese sauce']
```

### After (arrays of tokens):
```javascript
matchPatterns: [['cream', 'sauce'], ['alfredo'], ['cheese', 'sauce']]
```

### Rules:
- Single vague tokens like "sauce", "rice", "chicken" → Rejected
- Single strong keywords like "alfredo", "tempura" → Allowed
- Multi-token patterns → All tokens must be present

## Testing Examples

### Should Match:
- "bbq wings" → BBQ Sauce ✅
- "caesar salad" → Caesar Salad ✅
- "tempura shrimp" → Tempura ✅
- "alfredo pasta" → Cream-Based Sauces ✅
- "flour tortilla" → Flour Tortillas ✅

### Should NOT Match (false positives):
- "sauce" alone → null ✅
- "chicken" alone → null ✅
- "rice" alone → null ✅
- "salad" alone → null ✅
- "tortilla" alone → null ✅ (needs "corn" or "flour" context)

## Key Benefits

1. **Reduced False Positives**: Vague tokens rejected
2. **Stricter Matching**: Multi-token patterns require all tokens
3. **Toggle Scoping**: Only evaluates toggled allergens
4. **Output Tightening**: Only returns CAUTION/NOT_AN_OPTION
5. **Consistent Logic**: All modules use same matching utility

