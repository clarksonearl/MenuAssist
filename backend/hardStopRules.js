/**
 * Hard Stop Rules - Deterministic override layer
 * These items MUST be marked as HARD_STOP regardless of AI classification
 */

function normalizeItemName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().trim().replace(/[^\w\s&]/g, ' ').replace(/\s+/g, ' ');
}

function isHardStop(itemName, prefs) {
  if (!itemName || typeof itemName !== 'string') {
    return { hardStop: false };
  }

  if (!prefs || typeof prefs !== 'object') {
    return { hardStop: false };
  }

  const normalized = normalizeItemName(itemName);
  const dairyFree = prefs.dairy === true;
  const glutenFree = prefs.gluten === true;

  // Mac and Cheese - HARD STOP for dairy-free and gluten-free
  if (normalized.includes('mac') && (normalized.includes('cheese') || normalized.includes('& cheese'))) {
    if (dairyFree || glutenFree) {
      return {
        hardStop: true,
        reason: 'Mac and cheese contains dairy (cheese) and gluten (pasta) as core ingredients that cannot be removed.',
        ask: ['Does this contain cheese?', 'Is the pasta gluten-free?'],
        allergens: dairyFree && glutenFree ? ['dairy', 'gluten'] : dairyFree ? ['dairy'] : ['gluten']
      };
    }
  }

  // Alfredo - HARD STOP for dairy-free
  if (normalized.includes('alfredo')) {
    if (dairyFree) {
      return {
        hardStop: true,
        reason: 'Alfredo sauce contains butter, cream, and parmesan cheese as core ingredients that cannot be removed.',
        ask: ['Does this contain butter, cream, or cheese?', 'Can it be made without dairy?'],
        allergens: ['dairy']
      };
    }
  }

  // Lasagna - HARD STOP for dairy-free (cheese) and gluten-free (pasta)
  if (normalized.includes('lasagna') || normalized.includes('lasagne')) {
    if (dairyFree || glutenFree) {
      return {
        hardStop: true,
        reason: 'Lasagna contains cheese (dairy) and pasta (gluten) as core ingredients that cannot be removed.',
        ask: ['Does this contain cheese?', 'Is the pasta gluten-free?'],
        allergens: dairyFree && glutenFree ? ['dairy', 'gluten'] : dairyFree ? ['dairy'] : ['gluten']
      };
    }
  }

  // Ravioli / Tortellini - HARD STOP for dairy-free (cheese filling) and gluten-free (pasta)
  if (normalized.includes('ravioli') || normalized.includes('tortellini')) {
    if (dairyFree || glutenFree) {
      return {
        hardStop: true,
        reason: 'Contains cheese filling (dairy) and pasta (gluten) as core ingredients that cannot be removed.',
        ask: ['Does the filling contain cheese?', 'Is the pasta gluten-free?'],
        allergens: dairyFree && glutenFree ? ['dairy', 'gluten'] : dairyFree ? ['dairy'] : ['gluten']
      };
    }
  }

  // Queso dip / Cheese dip - HARD STOP for dairy-free
  if ((normalized.includes('queso') || normalized.includes('cheese')) && normalized.includes('dip')) {
    if (dairyFree) {
      return {
        hardStop: true,
        reason: 'Cheese dip contains cheese as a core ingredient that cannot be removed.',
        ask: ['Does this contain cheese?', 'Can it be made without dairy?'],
        allergens: ['dairy']
      };
    }
  }

  // Cheesecake - HARD STOP for dairy-free
  if (normalized.includes('cheesecake')) {
    if (dairyFree) {
      return {
        hardStop: true,
        reason: 'Cheesecake contains cream cheese as a core ingredient that cannot be removed.',
        ask: ['Does this contain cream cheese?', 'Can it be made without dairy?'],
        allergens: ['dairy']
      };
    }
  }

  // Ice cream - HARD STOP for dairy-free
  if (normalized.includes('ice cream') || normalized.includes('icecream')) {
    if (dairyFree) {
      return {
        hardStop: true,
        reason: 'Ice cream contains milk and cream as core ingredients that cannot be removed.',
        ask: ['Does this contain milk or cream?', 'Is there a dairy-free alternative?'],
        allergens: ['dairy']
      };
    }
  }

  // Milkshake - HARD STOP for dairy-free
  if (normalized.includes('milkshake') || normalized.includes('milk shake')) {
    if (dairyFree) {
      return {
        hardStop: true,
        reason: 'Milkshake contains milk and ice cream as core ingredients that cannot be removed.',
        ask: ['Does this contain milk or ice cream?', 'Is there a dairy-free alternative?'],
        allergens: ['dairy']
      };
    }
  }

  return { hardStop: false };
}

module.exports = {
  isHardStop
};
