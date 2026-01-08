/**
 * Test script to verify hard stop rules work correctly
 * Run with: node backend/test_hardStop.js
 */

const { isHardStop } = require('./hardStopRules');

function testMacAndCheese() {
  console.log('Testing: Mac and Cheese with dairy-free restriction...');
  
  const result = isHardStop('Mac and Cheese', { dairy: true, gluten: false });
  
  if (result.hardStop === true) {
    console.log('✓ PASS: Mac and Cheese correctly flagged as hard stop for dairy-free');
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Allergens: ${result.allergens.join(', ')}`);
    return true;
  } else {
    console.log('✗ FAIL: Mac and Cheese should be hard stop for dairy-free');
    return false;
  }
}

function testMacAndCheeseGlutenFree() {
  console.log('\nTesting: Mac and Cheese with gluten-free restriction...');
  
  const result = isHardStop('Mac and Cheese', { dairy: false, gluten: true });
  
  if (result.hardStop === true) {
    console.log('✓ PASS: Mac and Cheese correctly flagged as hard stop for gluten-free');
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Allergens: ${result.allergens.join(', ')}`);
    return true;
  } else {
    console.log('✗ FAIL: Mac and Cheese should be hard stop for gluten-free');
    return false;
  }
}

function testMacAndCheeseBoth() {
  console.log('\nTesting: Mac and Cheese with both restrictions...');
  
  const result = isHardStop('Mac and Cheese', { dairy: true, gluten: true });
  
  if (result.hardStop === true) {
    console.log('✓ PASS: Mac and Cheese correctly flagged as hard stop for both restrictions');
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Allergens: ${result.allergens.join(', ')}`);
    return true;
  } else {
    console.log('✗ FAIL: Mac and Cheese should be hard stop for both restrictions');
    return false;
  }
}

function testMacAndCheeseNoRestrictions() {
  console.log('\nTesting: Mac and Cheese with no restrictions...');
  
  const result = isHardStop('Mac and Cheese', { dairy: false, gluten: false });
  
  if (result.hardStop === false) {
    console.log('✓ PASS: Mac and Cheese correctly NOT flagged when no restrictions');
    return true;
  } else {
    console.log('✗ FAIL: Mac and Cheese should not be hard stop when no restrictions');
    return false;
  }
}

function testVariations() {
  console.log('\nTesting: Mac & Cheese variations...');
  
  const variations = [
    'Mac & Cheese',
    'Macaroni and Cheese',
    'Mac n Cheese',
    'Macaroni & Cheese'
  ];
  
  let allPassed = true;
  for (const variation of variations) {
    const result = isHardStop(variation, { dairy: true, gluten: false });
    if (result.hardStop === true) {
      console.log(`✓ PASS: "${variation}" correctly flagged`);
    } else {
      console.log(`✗ FAIL: "${variation}" should be flagged`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

function testOtherItems() {
  console.log('\nTesting: Other hard stop items...');
  
  const testCases = [
    { name: 'Alfredo Pasta', prefs: { dairy: true, gluten: false }, shouldBeHardStop: true },
    { name: 'Lasagna', prefs: { dairy: true, gluten: false }, shouldBeHardStop: true },
    { name: 'Cheesecake', prefs: { dairy: true, gluten: false }, shouldBeHardStop: true },
    { name: 'Ice Cream', prefs: { dairy: true, gluten: false }, shouldBeHardStop: true },
    { name: 'Grilled Chicken', prefs: { dairy: true, gluten: false }, shouldBeHardStop: false }
  ];
  
  let allPassed = true;
  for (const testCase of testCases) {
    const result = isHardStop(testCase.name, testCase.prefs);
    if (result.hardStop === testCase.shouldBeHardStop) {
      console.log(`✓ PASS: "${testCase.name}" (dairy: ${testCase.prefs.dairy})`);
    } else {
      console.log(`✗ FAIL: "${testCase.name}" expected hardStop=${testCase.shouldBeHardStop}, got ${result.hardStop}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Run all tests
console.log('=== Hard Stop Rules Test Suite ===\n');

const results = [
  testMacAndCheese(),
  testMacAndCheeseGlutenFree(),
  testMacAndCheeseBoth(),
  testMacAndCheeseNoRestrictions(),
  testVariations(),
  testOtherItems()
];

const allPassed = results.every(r => r === true);

console.log('\n=== Test Summary ===');
if (allPassed) {
  console.log('✓ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('✗ SOME TESTS FAILED');
  process.exit(1);
}
