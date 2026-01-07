# MenYOU Tightness Check Test Harness

## Purpose

This test harness validates that the Local Knowledge matching layer is NOT over-triggering. It ensures:

1. **Toggle Scoping**: Only evaluates allergens that are toggled
2. **Output Tightening**: Only returns CAUTION/NOT_AN_OPTION outcomes (not GENERALLY_OK)
3. **Reduced False Positives**: Generic words like "chicken", "rice", "sauce" don't trigger matches
4. **Confidence Threshold**: Only matches that meet confidence requirements are returned

## Running the Tests

```bash
cd backend
node tightnessCheck.test.js
```

## Test Cases

### Should Trigger (Expected Outcomes)

1. **"BBQ wings"** (gluten toggled)
   - Should trigger: BBQ Sauce CAUTION
   - Should NOT mention dairy

2. **"Buffalo wings"** (dairy toggled)
   - Should trigger: Buffalo Sauce CAUTION
   - Should NOT mention gluten

3. **"Caesar salad"** (gluten toggled)
   - Should trigger: Caesar Salad NOT_AN_OPTION
   - Reason: Croutons are structural gluten

4. **"Caesar salad"** (dairy toggled)
   - Should trigger: Caesar Salad NOT_AN_OPTION
   - Reason: Dressing/parmesan are structural dairy

5. **"Tempura shrimp"** (gluten toggled)
   - Should trigger: Tempura NOT_AN_OPTION
   - Reason: Breading is structural gluten

6. **"Chicken alfredo"** (dairy toggled)
   - Should trigger: Cream-based/Alfredo NOT_AN_OPTION
   - Should NOT mention gluten

7. **"Flour tortilla tacos"** (gluten toggled)
   - Should trigger: Flour Tortillas NOT_AN_OPTION

### Should NOT Trigger (False Positive Prevention)

8. **"Chicken"** (any allergens toggled)
   - Should return: null (no outcomes)
   - Reason: Generic protein, no specific context

9. **"Rice bowl"** (any allergens toggled)
   - Should return: null (no outcomes)
   - Reason: Generic rice, no specific preparation context

10. **"Sauce"** (any allergens toggled)
    - Should return: null (no outcomes)
    - Reason: Vague token, rejected by matching utility

11. **"Salad"** (any allergens toggled)
    - Should return: null (no outcomes)
    - Reason: Vague token, needs specific salad type

12. **"Tortilla"** (gluten toggled)
    - Should return: null (no outcomes)
    - Reason: Ambiguous, needs "corn" or "flour" context

13. **Any item** (no allergens toggled)
    - Should return: null (no outcomes)
    - Reason: Hard rule - no toggled allergens = no outcomes

## Expected Output

The test will show:
- ✓ PASS or ✗ FAIL for each test case
- Which knowledge modules triggered (sauces, salads, asian, etc.)
- The outcome type (CAUTION or NOT_AN_OPTION)
- Warnings if wrong allergens are mentioned
- Final summary: X passed, Y failed

## Validation Rules

1. **Toggle Scoping**: If guidance mentions an allergen that wasn't toggled → FAIL
2. **Outcome Type**: Should only see CAUTION or NOT_AN_OPTION, never GENERALLY_OK
3. **False Positives**: Generic words should not trigger matches
4. **Null Returns**: If no toggled allergens or no matches → should return null

## Troubleshooting

If tests fail:
1. Check that all knowledge modules use `matchEntry()` from `knowledgeMatch.js`
2. Verify `matchPatterns` are arrays of token arrays: `[['cream', 'sauce']]`
3. Ensure evaluation functions return `null` for GENERALLY_OK outcomes
4. Confirm toggle scoping is enforced (check for allergen mentions)

