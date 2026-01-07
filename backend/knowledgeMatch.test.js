/**
 * MenYOU Knowledge Matching Tests
 * 
 * Examples showing reduced false positives and proper matching behavior
 */

const { matchEntry } = require('./knowledgeMatch');
const { sauceKnowledge } = require('./sauceKnowledge');

// Test cases demonstrating reduced false positives
const testCases = [
  // Sauces
  { text: 'bbq wings', expected: 'BBQ Sauce', shouldMatch: true },
  { text: 'sauce', expected: null, shouldMatch: false }, // Vague token, should not match
  { text: 'chicken with bbq', expected: 'BBQ Sauce', shouldMatch: true },
  { text: 'alfredo pasta', expected: 'Cream-Based Sauces', shouldMatch: true },
  { text: 'cream sauce', expected: 'Cream-Based Sauces', shouldMatch: true },
  { text: 'sauce on chicken', expected: null, shouldMatch: false }, // Too vague
  
  // Salads
  { text: 'caesar salad', expected: 'Caesar Salad', shouldMatch: true },
  { text: 'salad', expected: null, shouldMatch: false }, // Vague token
  
  // Asian
  { text: 'tempura shrimp', expected: 'Tempura', shouldMatch: true },
  { text: 'chicken', expected: null, shouldMatch: false }, // Vague token
  { text: 'soy sauce', expected: 'Soy Sauce', shouldMatch: true },
  
  // Italian
  { text: 'alfredo', expected: 'Alfredo Sauce', shouldMatch: true },
  { text: 'pasta', expected: 'Wheat-Based Pasta', shouldMatch: true },
  
  // Mexican
  { text: 'flour tortilla', expected: 'Flour Tortillas', shouldMatch: true },
  { text: 'corn tortilla', expected: 'Corn Tortillas', shouldMatch: true },
  { text: 'tortilla', expected: null, shouldMatch: false }, // Ambiguous, needs more context
];

console.log('Testing knowledge matching...\n');

for (const testCase of testCases) {
  // Find matching entry
  let matched = null;
  for (const entry of sauceKnowledge) {
    const match = matchEntry(entry, testCase.text);
    if (match.matched) {
      matched = entry.sauceName;
      break;
    }
  }
  
  const passed = (testCase.shouldMatch && matched === testCase.expected) ||
                 (!testCase.shouldMatch && matched === null);
  
  console.log(`${passed ? '✓' : '✗'} "${testCase.text}"`);
  console.log(`  Expected: ${testCase.expected || 'null'}, Got: ${matched || 'null'}`);
  if (!passed) {
    console.log(`  FAILED`);
  }
  console.log();
}

console.log('Note: This is a basic test. Full testing requires all knowledge modules.');

