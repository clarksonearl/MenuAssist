/**
 * MenYOU Question Layer
 * 
 * Generates deterministic server questions and ordering modifications
 * for menu items flagged as CAUTION or NOT AN OPTION.
 * 
 * Uses template-based questions for specific dish types, with fallback
 * to generic Q1-Q6 logic when templates don't apply.
 */

/**
 * Build question layer for a menu item
 * @param {Object} params - Parameters object
 * @param {string} params.inputText - Menu item text
 * @param {Object} params.toggledAllergens - { gluten: boolean, dairy: boolean }
 * @param {Array<string>} params.triggeredModules - Array of module names that triggered
 * @param {string} params.outcome - 'CAUTION' or 'NOT AN OPTION'
 * @returns {Object} { askServer: string[], orderItLikeThis: string[], bestReason: string }
 */
function buildQuestionLayer({ inputText, toggledAllergens, triggeredModules, outcome }) {
  if (!inputText || typeof inputText !== 'string') {
    return { askServer: [], orderItLikeThis: [], bestReason: '' };
  }

  if (outcome !== 'CAUTION' && outcome !== 'NOT AN OPTION') {
    return { askServer: [], orderItLikeThis: [], bestReason: '' };
  }

  const normalizedText = inputText.toLowerCase();
  const askServer = [];
  const orderItLikeThis = [];
  let bestReason = '';

  // Dish-type detection
  const proteinWords = ['steak', 'strip', 'ribeye', 'filet', 'salmon', 'chicken', 'pork', 'shrimp', 'fish', 'beef', 'turkey', 'lamb'];
  const burgerWords = ['burger', 'cheeseburger', 'patty'];
  const saladWords = ['salad', 'caesar'];
  const wingWords = ['wings', 'wing'];
  const breakfastWords = ['omelet', 'omelette', 'scrambled', 'benedict', 'toast'];
  const asianAppWords = ['wonton', 'rangoon', 'dumpling', 'gyoza', 'egg roll', 'tempura'];
  
  // Keyword detectors
  const sauceWords = ['sauce', 'glaze', 'dressing', 'gravy', 'aioli', 'hollandaise', 'alfredo', 'ranch', 'caesar', 'pesto', 'marinara', 'buffalo', 'bbq', 'teriyaki', 'soy'];
  const breadedWords = ['breaded', 'battered', 'fried', 'crispy', 'crunchy', 'tempura', 'crusted', 'parmesan', 'schnitzel'];
  const fryerWords = ['fries', 'tots', 'hash browns', 'home fries', 'tempura', 'fried', 'crispy', 'onion rings'];
  const breadWords = ['bun', 'bread', 'sub', 'sandwich', 'wrap', 'tortilla', 'toast', 'biscuit', 'croissant', 'panini', 'pita', 'naan'];
  const binderWords = ['sausage', 'meatball', 'meatballs', 'crab cake', 'crab cakes', 'patty', 'patties', 'house-made', 'house made'];

  // Detect dish types
  const isProtein = proteinWords.some(word => normalizedText.includes(word));
  const isBurger = burgerWords.some(word => normalizedText.includes(word));
  const isSalad = saladWords.some(word => normalizedText.includes(word));
  const isWings = wingWords.some(word => normalizedText.includes(word));
  const isBreakfast = breakfastWords.some(word => normalizedText.includes(word)) || triggeredModules.includes('breakfast');
  const isAsianApp = asianAppWords.some(word => normalizedText.includes(word)) || triggeredModules.includes('asianApps');
  const hasGlazed = normalizedText.includes('glaze') || normalizedText.includes('glazed');
  const hasSauce = sauceWords.some(word => normalizedText.includes(word));
  const isFried = fryerWords.some(word => normalizedText.includes(word)) || breadedWords.some(word => normalizedText.includes(word)) || triggeredModules.includes('fried');
  const hasCroutons = normalizedText.includes('crouton');
  const hasOmelet = normalizedText.includes('omelet') || normalizedText.includes('omelette');
  const hasScrambled = normalizedText.includes('scrambled');
  const hasFluffy = normalizedText.includes('fluffy');

  // Check for keywords
  const hasBreadWords = breadWords.some(word => normalizedText.includes(word));
  
  // Count triggers for enrichment
  let triggerCount = 0;
  if (hasSauce || hasGlazed || triggeredModules.includes('sauces')) triggerCount++;
  if (isFried || triggeredModules.includes('fried')) triggerCount++;
  if (hasBreadWords || triggeredModules.includes('sandwich') || triggeredModules.includes('burger')) triggerCount++;
  if (isProtein && toggledAllergens.dairy) triggerCount++;
  if (isSalad) triggerCount++;
  if (isBreakfast) triggerCount++;

  // Template-based questions (priority order)
  
  // 1. GLAZED/SAUCE + dairy toggled (highest priority for glazed items)
  if ((hasGlazed || hasSauce || triggeredModules.includes('sauces')) && toggledAllergens.dairy) {
    askServer.push('Is the glaze/sauce made with butter, cream, or cheese?');
    askServer.push('Can I get it without sauce or with oil + lemon?');
    orderItLikeThis.push('No glaze/sauce; sauce on the side');
    orderItLikeThis.push('Oil + lemon; no butter');
    bestReason = 'Sauce/glaze may contain butter or cream';
  }
  
  // 2. PROTEIN + dairy toggled (only if no glaze/sauce)
  if (isProtein && toggledAllergens.dairy && !toggledAllergens.gluten && !bestReason) {
    askServer.push('Is it cooked or finished with butter, ghee, or any dairy?');
    askServer.push('Any butter basting or compound butter on top?');
    orderItLikeThis.push('Cook with oil only; no butter finish');
    orderItLikeThis.push('No dairy-based sauce; lemon + oil');
    bestReason = 'Often finished with butter or dairy sauces';
  }
  
  // 3. BURGER + gluten+dairy toggled
  if (isBurger && toggledAllergens.gluten && toggledAllergens.dairy && !bestReason) {
    askServer.push('Do you have a gluten-free bun or lettuce wrap?');
    askServer.push('Any butter on the bun or dairy in seasoning/sauce?');
    orderItLikeThis.push('Lettuce wrap or GF bun; no bun on plate');
    orderItLikeThis.push('No cheese; sauces on the side');
    bestReason = 'Bun + cheese/sauces often contain allergens';
  }
  
  // 4. FRIED / crispy / breaded + gluten toggled
  if (isFried && toggledAllergens.gluten && !bestReason) {
    askServer.push('Is it breaded/battered or dusted with flour?');
    askServer.push('Is it cooked in a shared fryer with breaded items?');
    orderItLikeThis.push('Not breaded; grilled/pan-seared instead');
    orderItLikeThis.push('Clean pan or dedicated fryer only');
    bestReason = 'Breading and shared fryers are common';
  }
  
  // 5. SALAD
  if (isSalad && (toggledAllergens.gluten || toggledAllergens.dairy) && !bestReason) {
    askServer.push('Does the dressing contain dairy or gluten thickeners?');
    if (toggledAllergens.gluten) {
      askServer.push('Any croutons/crispy toppings or breaded add-ons?');
    }
    orderItLikeThis.push('No croutons; dressing on the side');
    orderItLikeThis.push('Oil + vinegar or lemon instead');
    bestReason = 'Dressings and toppings often hide allergens';
  }
  
  // 6. BREAKFAST omelet/scrambled + gluten toggled
  if (isBreakfast && (hasOmelet || hasScrambled || hasFluffy) && toggledAllergens.gluten && !bestReason) {
    askServer.push('Do you add pancake batter/flour to eggs for fluffiness?');
    askServer.push('Is it cooked on a shared griddle with pancakes/toast?');
    orderItLikeThis.push('Eggs only; no batter; clean pan');
    orderItLikeThis.push('No toast; avoid shared griddle');
    bestReason = 'Some kitchens add batter or use shared griddles';
  }

  // Fallback to generic Q1-Q6 logic if templates didn't provide enough
  const minQuestions = outcome === 'NOT AN OPTION' ? 2 : (triggerCount >= 2 ? 2 : 1);
  const minMods = outcome === 'NOT AN OPTION' ? 2 : (triggerCount >= 2 ? 2 : 1);

  // Q1: Finish/Fat (butter/ghee/cream) - for proteins
  if (askServer.length < minQuestions && toggledAllergens.dairy && isProtein && !normalizedText.includes('butter') && !hasSauce) {
    askServer.push('Is this cooked or finished with butter, ghee, or any dairy?');
    orderItLikeThis.push('Oil only; no butter finish');
    if (!bestReason) bestReason = 'Often finished with butter or dairy';
  }

  // Q2: Sauce/Glaze/Dressing
  if (askServer.length < minQuestions && (hasSauce || hasGlazed || triggeredModules.includes('sauces') || triggeredModules.includes('salads'))) {
    if (toggledAllergens.dairy && !askServer.some(q => q.includes('sauce') || q.includes('glaze') || q.includes('dressing'))) {
      askServer.push('Does the sauce/glaze/dressing contain butter, cream, or dairy?');
      orderItLikeThis.push('No sauce/glaze; oil + lemon');
      if (!bestReason) bestReason = 'Sauce/glaze may contain dairy';
    }
    if (toggledAllergens.gluten && (triggeredModules.includes('asian') || triggeredModules.includes('asianNoodles')) && !askServer.some(q => q.includes('soy'))) {
      askServer.push('Is gluten-free soy sauce used, or can it be made without soy sauce?');
      orderItLikeThis.push('No soy sauce or gluten-free tamari');
      if (!bestReason) bestReason = 'Soy sauce often contains gluten';
    }
  }

  // Q3: Breaded/Battered
  if (askServer.length < minQuestions && (breadedWords.some(w => normalizedText.includes(w)) || triggeredModules.includes('fried') || triggeredModules.includes('asianApps')) && toggledAllergens.gluten) {
    if (!askServer.some(q => q.includes('breaded') || q.includes('battered'))) {
      askServer.push('Is this breaded, battered, dredged, or dusted with flour?');
      orderItLikeThis.push('Not breaded; grilled or pan-seared');
      if (!bestReason) bestReason = 'Breading contains gluten';
    }
  }

  // Q4: Shared fryer
  if (askServer.length < minQuestions && (fryerWords.some(w => normalizedText.includes(w)) || breadedWords.some(w => normalizedText.includes(w)) || triggeredModules.includes('fried')) && toggledAllergens.gluten) {
    if (!askServer.some(q => q.includes('fryer') || q.includes('shared'))) {
      askServer.push('Is it cooked in a shared fryer with breaded items?');
      orderItLikeThis.push('Clean pan or dedicated fryer only');
      if (!bestReason) bestReason = 'Shared fryers risk cross-contact';
    }
  }

  // Q5: Bun/Tortilla/Bread
  if (askServer.length < minQuestions && breadWords.some(w => normalizedText.includes(w)) && (triggeredModules.includes('sandwich') || triggeredModules.includes('italianSandwich') || triggeredModules.includes('mexican') || triggeredModules.includes('burger')) && toggledAllergens.gluten) {
    if (!askServer.some(q => q.includes('bun') || q.includes('wrap') || q.includes('tortilla'))) {
      askServer.push('Do you have a gluten-free bun/tortilla or a lettuce wrap?');
      orderItLikeThis.push('GF bun/tortilla or lettuce wrap; no bread on plate');
      if (!bestReason) bestReason = 'Bread/tortilla contains gluten';
    }
  }

  // Q6: Binder/Filler
  if (askServer.length < minQuestions && binderWords.some(w => normalizedText.includes(w)) && toggledAllergens.gluten) {
    if (!askServer.some(q => q.includes('binder') || q.includes('breadcrumb'))) {
      askServer.push('Any flour/breadcrumbs or dairy in the seasoning mix or binder?');
      orderItLikeThis.push('Confirm no binder; choose plain grilled option if unsure');
      if (!bestReason) bestReason = 'Binders may contain gluten';
    }
  }

  // Breakfast-specific
  if (isBreakfast && askServer.length < minQuestions) {
    if (toggledAllergens.gluten && (hasOmelet || hasScrambled || hasFluffy) && !askServer.some(q => q.includes('batter'))) {
      askServer.push('Do you add pancake batter or milk to the eggs?');
      orderItLikeThis.push('No batter or milk added');
      if (!bestReason) bestReason = 'Some kitchens add batter to eggs';
    }
    if (toggledAllergens.dairy && normalizedText.includes('toast') && !askServer.some(q => q.includes('butter'))) {
      askServer.push('Is butter used on the toast or in cooking?');
      orderItLikeThis.push('No butter; oil only');
      if (!bestReason) bestReason = 'Toast may be buttered';
    }
  }

  // Salad croutons
  if (isSalad && hasCroutons && toggledAllergens.gluten && askServer.length < minQuestions) {
    if (!askServer.some(q => q.includes('crouton'))) {
      askServer.push('Can the croutons be removed?');
      orderItLikeThis.push('No croutons');
      if (!bestReason) bestReason = 'Croutons contain gluten';
    }
  }

  // Asian apps with cream cheese
  if (isAsianApp && normalizedText.includes('cream cheese') && triggeredModules.includes('asianApps') && toggledAllergens.dairy && askServer.length < minQuestions) {
    if (!askServer.some(q => q.includes('cream') || q.includes('dairy'))) {
      askServer.push('Does this contain cream cheese or other dairy?');
      orderItLikeThis.push('No cream cheese; plain wrapper option if available');
      if (!bestReason) bestReason = 'Cream cheese contains dairy';
    }
  }

  // Deduplicate and ensure minimum counts
  const uniqueAskServer = [];
  const seen = new Set();
  for (const q of askServer) {
    if (!seen.has(q) && q.length <= 90) {
      uniqueAskServer.push(q);
      seen.add(q);
      if (uniqueAskServer.length >= 3) break;
    }
  }

  const uniqueOrderItLikeThis = [];
  const seenOrder = new Set();
  for (const o of orderItLikeThis) {
    if (!seenOrder.has(o) && o.length <= 90) {
      uniqueOrderItLikeThis.push(o);
      seenOrder.add(o);
      if (uniqueOrderItLikeThis.length >= 3) break;
    }
  }

  // Ensure minimum counts for NOT AN OPTION
  if (outcome === 'NOT AN OPTION') {
    while (uniqueAskServer.length < 2 && uniqueAskServer.length < 3) {
      // Add generic questions if needed
      if (toggledAllergens.gluten && !uniqueAskServer.some(q => q.includes('gluten'))) {
        uniqueAskServer.push('Does this contain gluten?');
      } else if (toggledAllergens.dairy && !uniqueAskServer.some(q => q.includes('dairy'))) {
        uniqueAskServer.push('Does this contain dairy?');
      } else {
        break;
      }
    }
    while (uniqueOrderItLikeThis.length < 2 && uniqueOrderItLikeThis.length < 3) {
      if (toggledAllergens.gluten && !uniqueOrderItLikeThis.some(o => o.includes('gluten'))) {
        uniqueOrderItLikeThis.push('Request gluten-free option if available');
      } else if (toggledAllergens.dairy && !uniqueOrderItLikeThis.some(o => o.includes('dairy'))) {
        uniqueOrderItLikeThis.push('Request dairy-free option if available');
      } else {
        break;
      }
    }
  }

  // Ensure minimum counts for CAUTION with multiple triggers
  if (outcome === 'CAUTION' && triggerCount >= 2) {
    while (uniqueAskServer.length < 2 && uniqueAskServer.length < 3) {
      if (toggledAllergens.gluten && !uniqueAskServer.some(q => q.includes('gluten'))) {
        uniqueAskServer.push('Does this contain gluten?');
      } else if (toggledAllergens.dairy && !uniqueAskServer.some(q => q.includes('dairy'))) {
        uniqueAskServer.push('Does this contain dairy?');
      } else {
        break;
      }
    }
    while (uniqueOrderItLikeThis.length < 2 && uniqueOrderItLikeThis.length < 3) {
      if (toggledAllergens.gluten && !uniqueOrderItLikeThis.some(o => o.includes('gluten'))) {
        uniqueOrderItLikeThis.push('Request gluten-free option if available');
      } else if (toggledAllergens.dairy && !uniqueOrderItLikeThis.some(o => o.includes('dairy'))) {
        uniqueOrderItLikeThis.push('Request dairy-free option if available');
      } else {
        break;
      }
    }
  }

  // Ensure bestReason is set
  if (!bestReason) {
    if (toggledAllergens.gluten && toggledAllergens.dairy) {
      bestReason = 'May contain gluten or dairy';
    } else if (toggledAllergens.gluten) {
      bestReason = 'May contain gluten';
    } else if (toggledAllergens.dairy) {
      bestReason = 'May contain dairy';
    } else {
      bestReason = 'Requires clarification';
    }
  }

  // Truncate bestReason to 90 chars
  if (bestReason.length > 90) {
    bestReason = bestReason.substring(0, 87) + '...';
  }

  return {
    askServer: uniqueAskServer,
    orderItLikeThis: uniqueOrderItLikeThis,
    bestReason: bestReason
  };
}

module.exports = {
  buildQuestionLayer
};
