/**
 * Merge Local Results with AI Results
 * Local rules always take precedence over AI classification
 */

function normalizeName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse spaces
}

/**
 * Build local results map from hard stops and local knowledge
 * @param {Array} hardStopItems - Items flagged as hard stop
 * @param {Object} localKnowledgeFindings - Local knowledge outcomes
 * @returns {Map} Map of normalized item name -> local result
 */
function buildLocalResultsMap(hardStopItems, localKnowledgeFindings) {
  const localMap = new Map();
  
  // Add hard stop items
  if (Array.isArray(hardStopItems)) {
    for (const item of hardStopItems) {
      if (item.name) {
        const normalized = normalizeName(item.name);
        localMap.set(normalized, {
          source: 'HARD_STOP',
          status: 'HARD_STOP',
          item: item
        });
      }
    }
  }
  
  // Add local knowledge outcomes
  if (localKnowledgeFindings && Array.isArray(localKnowledgeFindings.outcomes)) {
    for (const outcome of localKnowledgeFindings.outcomes) {
      const itemName = outcome.itemName || '';
      if (itemName) {
        const normalized = normalizeName(itemName);
        const outcomeType = outcome.outcome || outcome.internalOutcome || 'CAUTION';
        // Only override if not already in map (hard stop takes precedence)
        if (!localMap.has(normalized)) {
          localMap.set(normalized, {
            source: 'LOCAL_KNOWLEDGE',
            status: outcomeType === 'NOT AN OPTION' ? 'NOT AN OPTION' : 'CAUTION',
            item: outcome
          });
        }
      }
    }
  }
  
  return localMap;
}

/**
 * Check if item contains obvious dairy terms when dairy-free is selected
 * @param {Object} item - Menu item
 * @param {Array} restrictions - Active restrictions
 * @returns {boolean} True if item should not be marked as GENERALLY_OK
 */
function hasObviousDairyTerms(item, restrictions) {
  if (!restrictions.includes('dairy')) {
    return false;
  }
  
  const itemText = `${item.name || ''} ${item.reason || ''}`.toLowerCase();
  const dairyTerms = ['cheese', 'cream', 'butter', 'milk', 'dairy', 'yogurt', 'sour cream', 'whey', 'casein'];
  
  return dairyTerms.some(term => itemText.includes(term));
}

/**
 * Merge local results with AI results
 * @param {Object} localResults - { hardStopItems, localKnowledgeFindings }
 * @param {Object} aiResults - { safe: [], caution: [] }
 * @param {Array} restrictions - Active restrictions
 * @returns {Object} { safe: [], caution: [], hard_stop: [] }
 */
function mergeResults(localResults, aiResults, restrictions) {
  const { hardStopItems = [], localKnowledgeFindings = null } = localResults;
  const { safe: aiSafe = [], caution: aiCaution = [] } = aiResults;
  
  // Build local results map
  const localMap = buildLocalResultsMap(hardStopItems, localKnowledgeFindings);
  
  // Process AI safe items - filter out items that should not be GENERALLY_OK
  const mergedSafe = [];
  const itemsToMoveToCaution = [];
  
  for (const item of aiSafe) {
    const normalized = normalizeName(item.name || '');
    const localResult = localMap.get(normalized);
    
    // Skip if item is in hard stop (should not be in AI results, but double-check)
    if (localResult && localResult.source === 'HARD_STOP') {
      continue;
    }
    
    // If local knowledge says CAUTION or NOT AN OPTION, move to caution
    if (localResult && localResult.status !== 'SAFE') {
      // Item should be in caution, not safe - move it
      const localItem = localResult.item;
      itemsToMoveToCaution.push({
        ...item,
        askServer: localItem.askServer || item.askServer || [],
        bestReason: localItem.bestReason || item.reason,
        orderItLikeThis: localItem.orderItLikeThis,
        status: localResult.status,
        reasons: localItem.bestReason ? [{ type: 'UNKNOWN', detail: localItem.bestReason }] : undefined,
        confidence: 'HIGH'
      });
      continue;
    }
    
    // Safety check: prevent GENERALLY_OK for items with obvious dairy terms when dairy-free
    if (hasObviousDairyTerms(item, restrictions)) {
      // Move to caution instead
      itemsToMoveToCaution.push({
        ...item,
        reason: item.reason || 'May contain dairy - verify with staff',
        status: 'CAUTION'
      });
      continue;
    }
    
    // Item is safe to include
    mergedSafe.push(item);
  }
  
  // Process AI caution items - check against local results
  const mergedCaution = [];
  
  // Add items moved from safe array
  mergedCaution.push(...itemsToMoveToCaution);
  
  for (const item of aiCaution) {
    const normalized = normalizeName(item.name || '');
    const localResult = localMap.get(normalized);
    
    // Skip if item is in hard stop
    if (localResult && localResult.source === 'HARD_STOP') {
      continue;
    }
    
    // Skip if already added from safe array
    if (itemsToMoveToCaution.some(moved => normalizeName(moved.name) === normalized)) {
      continue;
    }
    
    // If local knowledge exists, prefer local result (but both are caution, so merge metadata)
    if (localResult && localResult.source === 'LOCAL_KNOWLEDGE') {
      // Use local knowledge metadata but keep AI reason if it adds value
      const localItem = localResult.item;
      mergedCaution.push({
        ...item,
        // Prefer local knowledge fields
        askServer: localItem.askServer || item.askServer,
        bestReason: localItem.bestReason || item.reason,
        orderItLikeThis: localItem.orderItLikeThis,
        status: localResult.status
      });
    } else {
      // AI-only item, include as-is
      mergedCaution.push(item);
    }
  }
  
  // Format hard stop items
  const hardStopFormatted = hardStopItems.map(item => ({
    name: item.name,
    status: 'HARD_STOP',
    reason: item.reason,
    reasons: [{ type: 'INGREDIENT', detail: item.reason }],
    askServer: item.askServer || [],
    confidence: 'HIGH',
    allergens: item.allergens || []
  }));
  
  return {
    safe: mergedSafe,
    caution: mergedCaution,
    hard_stop: hardStopFormatted
  };
}

module.exports = {
  mergeResults,
  buildLocalResultsMap,
  hasObviousDairyTerms
};
