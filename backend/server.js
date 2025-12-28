require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const app = express();
const PORT = 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS middleware - allow all origins for development
app.use(cors());

// Middleware to parse JSON bodies (increase limit for base64 images)
app.use(express.json({ limit: '50mb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Analyze menu endpoint
app.post('/api/analyze-menu', async (req, res) => {
  console.log('Received analyze-menu request');
  console.log('Image data length:', req.body.image ? req.body.image.length : 0);
  console.log('Restrictions:', req.body.restrictions);
  
  const { image, restrictions } = req.body;

  // Validate image
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Image must be a string starting with "data:image/"'
    });
  }

  // Validate restrictions
  if (!Array.isArray(restrictions) || restrictions.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'At least one restriction must be selected (gluten and/or dairy)'
    });
  }

  // Validate restrictions contain only valid values
  const validRestrictions = ['gluten', 'dairy'];
  const hasValidRestriction = restrictions.some(r => validRestrictions.includes(r));
  
  if (!hasValidRestriction) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Restrictions must contain at least one of: "gluten", "dairy"'
    });
  }

  // Extract base64 image data (remove data URL prefix)
  const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');
  console.log('Base64 image length:', base64Image.length);

  // Build restrictions text for prompt - only mention the active restrictions
  const restrictionsText = restrictions.join(' and/or ');
  
  // Build specific restriction details for the prompt
  const restrictionDetails = restrictions.map(r => {
    if (r === 'gluten') return 'gluten (wheat, flour, bread, pasta, croutons, breading, batter)';
    if (r === 'dairy') return 'dairy (cheese, milk, butter, cream, yogurt, sour cream, whey)';
    return r;
  }).join(' and/or ');

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_openai_api_key')) {
    console.error('OpenAI API key not configured');
    return res.status(500).json({
      success: false,
      error: 'CONFIG_ERROR',
      message: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.'
    });
  }

  try {
    console.log('Calling OpenAI API with model: gpt-4o');
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a dietary restriction analyzer for restaurant menus. Analyze menu items and categorize them based on the user's restrictions. Return ONLY valid JSON with no markdown formatting, no code blocks, no extra text.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Perform a DEEP, COMPREHENSIVE, THOROUGH analysis of this restaurant menu image. This requires careful, methodical analysis - take 15-30 seconds to think through each item. The goal is FOOD FREEDOM WITH SAFETY - help users eat anywhere without worry by providing complete, accurate information.

ANALYSIS METHODOLOGY (FOLLOW THIS ORDER FOR EACH ITEM):
1. FIRST: Identify the dish name and recall TRADITIONAL INGREDIENT KNOWLEDGE
   - What are the traditional ingredients in this dish?
   - What are traditional preparation methods?
   - What hidden ingredients are typically present (dressings, sauces, marinades, garnishes)?
   
2. SECOND: Check the MENU DESCRIPTION
   - What does the menu explicitly state?
   - Are there any modifications mentioned?
   - Does the menu confirm or contradict traditional knowledge?
   
3. THIRD: COMBINE traditional knowledge with menu description
   - Use traditional knowledge as PRIMARY source
   - Use menu description as SECONDARY confirmation
   - If menu doesn't mention something but it's traditional → assume it's there
   - Hidden ingredients (dressings, sauces) are often not listed but are traditional

4. FOURTH: Classify based on ACTIVE restrictions only (${restrictionsText})

ANALYSIS REQUIREMENTS:
- Review EVERY menu item (appetizers, entrees, sides, desserts, beverages, specials, daily features)
- For EACH item: Think through traditional ingredients FIRST, then check menu
- Examine each ingredient listed or implied
- Consider preparation methods (grilled, fried, sautéed, etc.)
- Check sauces, dressings, marinades, and garnishes (often hidden)
- Look for hidden ingredients in descriptions
- Be comprehensive - leave no item unanalyzed
- Take time to think deeply about each item

Extract ALL menu items and classify each item based ONLY on these specific dietary restrictions: ${restrictionDetails}.

TRADITIONAL INGREDIENT KNOWLEDGE:
You must have comprehensive knowledge of traditional ingredients and preparation methods for ALL common dishes. Break down each item into its traditional components:

SALADS (TRADITIONAL INGREDIENT KNOWLEDGE - PRIMARY SOURCE):
- Caesar Salad: 
  * Traditional ingredients = romaine lettuce, Caesar dressing (MUST CONTAIN: parmesan cheese = dairy, egg yolks, anchovies, sometimes cream = dairy), croutons (gluten), often parmesan cheese shavings (dairy)
  * Dressing is ESSENTIAL and CANNOT be removed - it's the core of the dish
  * If gluten ONLY restricted: CAUTION "Contains croutons (gluten) - request without croutons" (dressing is dairy but dairy is NOT restricted, so ignore it)
  * If dairy ONLY restricted: DO NOT LIST (Caesar dressing contains dairy and is essential - cannot be removed)
  * If BOTH restricted: DO NOT LIST (contains both gluten croutons AND dairy dressing)
- Garden Salad: Typically = lettuce, tomatoes, cucumbers, carrots, dressing (may contain dairy). Usually SAFE if no cheese, but check dressing for dairy if dairy restricted.
- Greek Salad: Typically = lettuce, tomatoes, cucumbers, olives, feta cheese (dairy), dressing (may contain dairy). If dairy restricted: CAUTION "Contains feta cheese (dairy) - request without cheese. Check dressing for dairy"

SOUPS:
- Tomato Soup: May or may not contain cream. Traditional versions often have cream (dairy). If dairy restricted: CAUTION "May contain cream (dairy) - ask if cream-based or request no cream"
- French Onion Soup: Traditional = beef broth, onions, bread (gluten), cheese (dairy). If gluten restricted: CAUTION "Contains bread (gluten) - request without bread". If dairy restricted: CAUTION "Contains cheese (dairy) - request without cheese"
- Clam Chowder: Traditional = cream-based (dairy), may have flour (gluten). If dairy restricted: DO NOT LIST (cream is essential). If gluten only: CAUTION "May contain flour (gluten) - verify with kitchen"
- Broth-based soups: Usually SAFE, but check for added dairy or gluten

BURGERS & SANDWICHES (Traditional Components):
- Hamburger: Traditional = beef patty, bun (gluten), lettuce, tomato, onion, may have cheese (dairy), pickles, condiments. Break down each component:
  * Bun = gluten (if gluten restricted: request no bun or gluten-free bun)
  * Cheese = dairy (if dairy restricted: request without cheese)
  * Check for crispy fried onions (batter = gluten)
  * Check for breaded items
  * Check sauces (may contain dairy or gluten)
- Cheeseburger: Same as hamburger but always includes cheese (dairy)
- Chicken Sandwich: Traditional = chicken, bun (gluten), lettuce, tomato, may have cheese (dairy), sauces. Check if chicken is breaded (gluten)
- Fish Sandwich: Traditional = fish (may be breaded = gluten), bun (gluten), tartar sauce (may contain dairy), lettuce. Check breading and sauce

PASTA DISHES:
- Alfredo: Traditional = pasta (gluten), butter (dairy), cream (dairy), parmesan cheese (dairy). If dairy restricted: DO NOT LIST. If gluten only: CAUTION "Contains pasta (gluten) - ask if gluten-free pasta available"
- Carbonara: Traditional = pasta (gluten), eggs, bacon, parmesan cheese (dairy). If dairy restricted: CAUTION "Contains parmesan cheese (dairy) - request without cheese". If gluten only: CAUTION "Contains pasta (gluten) - ask if gluten-free pasta available"
- Marinara: Traditional = pasta (gluten), tomato sauce (usually no dairy). If gluten only: CAUTION "Contains pasta (gluten) - ask if gluten-free pasta available". If dairy only: Usually SAFE

SAUCES & DRESSINGS:
- Caesar Dressing: Dairy (parmesan cheese, egg yolks, sometimes cream)
- Ranch Dressing: Dairy (buttermilk, sour cream, mayonnaise)
- Blue Cheese Dressing: Dairy (blue cheese, buttermilk)
- Tartar Sauce: May contain dairy (mayonnaise base)
- Béarnaise/Hollandaise: Dairy (butter, egg yolks)
- Pesto: May contain dairy (parmesan cheese)
- Marinara: Usually no dairy
- Alfredo: Dairy (butter, cream, parmesan)

GENERAL KNOWLEDGE:
- Steaks: Always SAFE - can be modified (request no butter, no sauce, etc.)
- ALL CHEESES: If dairy is restricted, any item with cheese is NOT OK unless cheese can be completely removed
- BUTTER: Can often be removed/modified - classify as CAUTION with modification instructions
- FRIED ITEMS: Many restaurants use shared fryers - always CAUTION with cross-contamination warning
- ALL BREAD: If gluten is restricted, ALL bread items contain gluten. Always remind about gluten-free options.
- BREADED ITEMS: Any "breaded", "crispy", "fried" with batter, or "crispy fried onions" contains gluten unless menu states otherwise
- "Caesar crisps" or "Caesar chips": These are typically PARMESAN CHEESE crisps (dairy), NOT bread/croutons (gluten). Do NOT confuse with croutons.

CROSS-CONTAMINATION KNOWLEDGE:
- Shared fryers: Restaurants often fry multiple items in the same oil (fries, breaded items, etc.)
- If gluten restricted: Fried items may be contaminated from breaded items in same fryer
- If dairy restricted: Fried items may be contaminated from items cooked with butter/dairy
- Always warn about fryer cross-contamination for fried items

CRITICAL CLASSIFICATION RULES - READ CAREFULLY:
1. ONLY consider the restrictions listed above (${restrictionsText}). IGNORE ALL OTHER DIETARY RESTRICTIONS COMPLETELY.

2. "SAFE" section is MANDATORY - you must always return items in the safe array.

3. "SAFE": Items that do NOT contain the restricted ingredients (${restrictionsText}). CRITICAL RULES:
   - ALL STEAKS are SAFE (can always be modified - request no butter, no sauce, etc.)
   - If restricting ONLY gluten: Items with dairy (cheese, butter, cream, etc.) are 100% SAFE. Dairy is NOT a restriction, so ignore it completely.
   - If restricting ONLY dairy: Items with gluten (bread, pasta, croutons, etc.) are 100% SAFE. Gluten is NOT a restriction, so ignore it completely.
   - If restricting BOTH gluten AND dairy: Item must not contain EITHER gluten OR dairy
   - Items where menu doesn't mention the restricted ingredients
   - For SAFE items, use SHORT disclaimer format: "Check with server - no ${restrictionsText}"

4. IMPORTANT - DO NOT MIX RESTRICTIONS:
   - If user restricts ONLY gluten: A cheeseburger is SAFE (cheese is dairy, not gluten). Only the bun matters.
   - If user restricts ONLY dairy: A sandwich with bread is SAFE (bread is gluten, not dairy). Only cheese/dairy matters.
   - If user restricts ONLY gluten: Caesar salad dressing (dairy) is SAFE. Only croutons (gluten) matter.
   - If user restricts ONLY dairy: Croutons (gluten) are SAFE. Only the dressing (dairy) matters.

4. "CAUTION": Items that contain the restricted ingredients (${restrictionsText}) BUT can be modified to remove them, OR items that need cross-contamination verification:
   - ONLY mention the ACTIVE restrictions in CAUTION reasons
   - If restricting ONLY gluten: Items with butter/cheese are SAFE (not CAUTION) - butter/cheese are dairy, not gluten
   - If restricting ONLY dairy: Items with bread/pasta are SAFE (not CAUTION) - bread/pasta are gluten, not dairy
   - Fried items: CAUTION with cross-contamination warning for the ACTIVE restriction only
   - Include clear modification instructions for the ACTIVE restriction only
   - Caesar Salad with gluten ONLY: CAUTION "Contains croutons (gluten) - request without croutons" (dressing is dairy, ignore it)
   - Caesar Salad with dairy ONLY: DO NOT LIST (Caesar dressing contains dairy and cannot be removed) (croutons are gluten, ignore them)
   - Vegetables cooked with butter: Only CAUTION if dairy is restricted. If only gluten restricted, SAFE.

5. DO NOT list items that contain restricted ingredients that CANNOT be modified or removed (e.g., Caesar salad if dairy restricted, Alfredo pasta if dairy restricted).

EXAMPLES (if restricting ONLY gluten):
- "Grilled Steak" → SAFE: "Check with server - no gluten"
- "Caesar Salad" → CAUTION: "Contains croutons (gluten) - request without croutons"
- "Caesar Crisps" or "Caesar Chips" → SAFE: "Check with server - no gluten" (these are cheese crisps, not bread - dairy only)
- "Pasta" → CAUTION: "Contains pasta (gluten) - ask if gluten-free pasta available"
- "French Fries" → CAUTION: "Check fryer cross-contamination - verify if shared oil with breaded items"
- "Chicken Wings" → CAUTION: "Check fryer cross-contamination - verify if shared oil with breaded items"
- "Grilled Chicken with Cheese" → SAFE: "Check with server - no gluten" (cheese is dairy, not gluten)
- "Hamburger" → CAUTION: "Traditional hamburger contains bun (gluten), lettuce, tomato, onion - request no bun or ask about gluten-free bun. Check for crispy fried onions or breaded toppings"
- "Cheeseburger" → CAUTION: "Traditional cheeseburger contains bun (gluten), cheese (dairy), lettuce, tomato, onion - request no bun (or gluten-free bun). Cheese is dairy (not gluten restriction)"
- "Sandwich" → CAUTION: "Contains bread (gluten) - request no bread or ask about gluten-free bread. Check for breaded items or crispy toppings"
- "Tomato Soup" → SAFE: "Check with server - no gluten" (traditional tomato soup may have cream but that's dairy, not gluten)
- "Bread Basket" → DO NOT LIST (all bread contains gluten - remind user to always ask about gluten-free bread options)

EXAMPLES (if restricting ONLY dairy - IGNORE gluten completely):
- "Grilled Steak" → SAFE: "Check with server - no dairy"
- "Caesar Salad" → DO NOT LIST (Traditional Caesar salad dressing contains dairy - parmesan cheese, egg yolks, sometimes cream - and is essential to the dish, cannot be removed) (croutons are gluten but gluten is NOT restricted, so they're 100% safe - ignore gluten completely)
- "Pasta with Cream Sauce" → CAUTION: "Contains cream (dairy) - request no cream sauce" (pasta is gluten - gluten is NOT restricted, ignore it)
- "Grilled Asparagus" → CAUTION: "May be cooked with butter (dairy) - request no butter"
- "French Fries" → CAUTION: "Check fryer cross-contamination - verify if shared oil with dairy items" (only check for dairy contamination)
- "Grilled Chicken" → SAFE: "Check with server - no dairy"
- "Burger" → CAUTION: "May contain cheese (dairy) - request without cheese. Check sauces for dairy" (bun is gluten - gluten is NOT restricted, ignore it completely)
- "Sandwich" → CAUTION: "May contain cheese (dairy) - request without cheese. Check sauces and spreads for dairy" (bread is gluten - gluten is NOT restricted, ignore it)
- "Bread Basket" → SAFE: "Check with server - no dairy" (bread is gluten - gluten is NOT restricted, so it's 100% safe)

EXAMPLES (if restricting BOTH gluten AND dairy):
- "Grilled Steak" → SAFE: "Check with server - no gluten/dairy"
- "Caesar Salad" → DO NOT LIST (contains both gluten croutons AND dairy dressing)
- "Pasta with Cream Sauce" → DO NOT LIST (contains both gluten pasta AND dairy cream - cannot modify both)
- "French Fries" → CAUTION: "Check fryer cross-contamination - verify if shared oil with breaded/dairy items"
- "Grilled Asparagus" → CAUTION: "May be cooked with butter (dairy) - request no butter"
- "Burger" → CAUTION: "Contains bun (gluten) and may have cheese (dairy) - request no bun (or gluten-free bun) and no cheese. Check for crispy fried onions, breaded items, and dairy-containing sauces"
- "Sandwich" → CAUTION: "Contains bread (gluten) and may have cheese (dairy) - request no bread (or gluten-free bread) and no cheese. Check for breaded items and dairy-containing spreads"

IMPORTANT ANALYSIS PRINCIPLES - CRITICAL:
- FOOD FREEDOM WITH SAFETY: Maximize options while ensuring safety
- ONLY FILTER BY ACTIVE RESTRICTIONS: If only gluten is restricted, dairy items are 100% SAFE. If only dairy is restricted, gluten items are 100% SAFE.
- DO NOT MIX RESTRICTIONS: Never mention or filter by restrictions that are NOT toggled. If user only restricts gluten, ignore dairy completely. If user only restricts dairy, ignore gluten completely.
- BREAK DOWN EVERY ITEM: For each menu item, identify its traditional components and preparation methods
- UNDERSTAND TRADITIONAL RECIPES: Know what ingredients are typically in each dish (e.g., hamburger = beef, bun, lettuce, tomato, onion, may have cheese)
- MIX TRADITIONAL KNOWLEDGE WITH MENU: Combine your knowledge of traditional recipes with what the menu actually states
- ALL STEAKS are always SAFE (can be modified - request no butter, no sauce, etc.)
- Use comprehensive traditional ingredient knowledge for ALL dishes (not just a few)
- If BOTH restrictions are toggled: item must not contain EITHER gluten OR dairy (check both simultaneously)
- If ONLY gluten restricted: Items with dairy (cheese, butter, cream) are 100% SAFE - dairy is NOT a restriction
- If ONLY dairy restricted: Items with gluten (bread, pasta, croutons) are 100% SAFE - gluten is NOT a restriction
- ALL CHEESES: If dairy restricted, items with cheese are NOT OK unless cheese can be completely removed. If only gluten restricted, cheese is SAFE.
- BUTTER: Can usually be removed - classify as CAUTION if dairy restricted. If only gluten restricted, butter is SAFE.
- FRIED ITEMS: Always CAUTION due to potential cross-contamination - only check for contamination related to ACTIVE restrictions
- VEGETABLES: May be cooked with butter - classify as CAUTION if dairy restricted. If only gluten restricted, SAFE.
- ALL BREAD: If gluten restricted, bread items are NOT safe. If only dairy restricted, bread is SAFE.
- BREADED ITEMS: Any breaded, crispy fried, or battered item contains gluten - only matters if gluten is restricted
- DISTINGUISH: "Caesar crisps" or "Caesar chips" are CHEESE (dairy), NOT bread/croutons (gluten). Do NOT confuse.
- BURGERS & SANDWICHES: Break down into traditional components and check ONLY for ACTIVE restrictions:
  * Buns/bread (gluten) - only check if gluten restricted
  * Cheese (dairy) - only check if dairy restricted
  * Crispy fried onions (batter = gluten) - only check if gluten restricted
  * Breaded toppings (gluten) - only check if gluten restricted
  * Sauces/spreads - only check for ACTIVE restrictions
- SOUPS: Know traditional preparation - only filter by ACTIVE restrictions
- SAFE section must always have items (it's mandatory)
- Be THOROUGH - analyze every single item on the menu
- For EACH item: Identify traditional ingredients, check menu description, combine knowledge, filter ONLY by active restrictions
- Review each ingredient carefully, especially in complex dishes
- Consider all preparation methods and hidden ingredients
- Provide EVERY possible option - don't skip items
- Use SHORT disclaimer format for SAFE: "Check with server - no [restriction]" (only mention active restrictions)
- CAUTION items must have clear, specific modification instructions for ACTIVE restrictions only
- When in doubt → classify as SAFE with disclaimer (safety-first but maximize options)

COMPREHENSIVE ANALYSIS CHECKLIST:
✓ Every appetizer analyzed
✓ Every entree analyzed  
✓ Every side dish analyzed
✓ Every dessert analyzed
✓ Every salad analyzed
✓ Every soup analyzed
✓ Every special/daily feature analyzed
✓ Every ingredient reviewed
✓ Every sauce/dressing considered
✓ Every preparation method evaluated

Return a JSON object with this exact structure:
{
  "safe": [
    {"name": "Item Name", "reason": "Check with server - no ${restrictionsText}"}
  ],
  "caution": [
    {"name": "Item Name", "reason": "Contains [specific restriction] - request modification OR Check fryer cross-contamination - verify if shared oil"}
  ]
}

Return ALL menu items found in the image. Be comprehensive - include every single item. Do not limit or skip any items.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 6000,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    // Parse OpenAI response
    const content = response.choices[0].message.content;
    let menuData;
    
    try {
      menuData = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // If response is not valid JSON, try to extract JSON from markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        menuData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid response format from AI');
      }
    }

    // Apply safety bias: ensure structure exists
    let safe = Array.isArray(menuData.safe) ? menuData.safe : [];
    let caution = Array.isArray(menuData.caution) ? menuData.caution : [];

    // Ensure SAFE section is mandatory - if empty, add a default message
    if (safe.length === 0) {
      safe = [{
        name: 'No items found',
        reason: 'Please verify all menu items with restaurant staff about hidden ingredients, preparation methods, and cross-contamination risks.'
      }];
    }

    // Ensure SAFE items have proper disclaimers - use simple format
    // Build disclaimer text based ONLY on active restrictions
    const buildDisclaimer = () => {
      const restrictionsText = restrictions.join('/');
      return `Check with server - no ${restrictionsText}`;
    };

    // Ensure all steaks are in SAFE (they can always be modified)
    const steakKeywords = ['steak', 'ribeye', 'filet', 'sirloin', 't-bone', 'porterhouse', 'new york strip'];
    safe = safe.map(item => {
      const itemName = (item.name || '').toLowerCase();
      const isSteak = steakKeywords.some(keyword => itemName.includes(keyword));
      
      // If it's a steak, ensure it's SAFE with proper disclaimer
      if (isSteak) {
        return {
          ...item,
          reason: buildDisclaimer()
        };
      }
      
      const reason = item.reason || '';
      const hasDisclaimer = reason.toLowerCase().includes('check with server') || 
                           reason.toLowerCase().includes('verify') ||
                           reason.toLowerCase().includes('double check');
      
      if (!hasDisclaimer) {
        return {
          ...item,
          reason: buildDisclaimer()
        };
      }
      
      // Ensure existing disclaimers only mention active restrictions
      let updatedReason = reason;
      if (!restrictions.includes('gluten') && reason.toLowerCase().includes('gluten')) {
        // Remove gluten mentions if not restricted
        updatedReason = updatedReason.replace(/gluten/gi, '').trim();
      }
      if (!restrictions.includes('dairy') && reason.toLowerCase().includes('dairy')) {
        // Remove dairy mentions if not restricted
        updatedReason = updatedReason.replace(/dairy/gi, '').trim();
      }
      
      // If reason was cleared, use default disclaimer
      if (!updatedReason || updatedReason.length < 10) {
        updatedReason = buildDisclaimer();
      }
      
      return {
        ...item,
        reason: updatedReason
      };
    });

    // Filter CAUTION items - only keep those that can be modified
    // Remove any that definitely contain restrictions that can't be removed
    caution = caution.filter(item => {
      const itemText = `${item.name} ${item.reason || ''}`.toLowerCase();
      const reason = (item.reason || '').toLowerCase();
      
      // If reason suggests it can be modified (remove, hold, without, request, etc.), keep it
      const canBeModified = reason.includes('remove') || 
                           reason.includes('hold') || 
                           reason.includes('without') || 
                           reason.includes('no ') ||
                           reason.includes('omit') ||
                           reason.includes('modify') ||
                           reason.includes('request') ||
                           reason.includes('ask');
      
      // If it can't be modified, don't list it in caution
      return canBeModified;
    });

    // Return structured response
    res.json({
      success: true,
      safe: safe,
      caution: caution,
      disclaimer: 'Menu Safe is guidance only. Always confirm with restaurant staff.'
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      response: error.response?.data || error.response
    });
    
    // Handle specific error cases
    if (error.message && (error.message.includes('unreadable') || error.message.includes('blurry'))) {
      return res.status(400).json({
        success: false,
        error: 'IMAGE_UNREADABLE',
        message: 'The menu image is too blurry or unreadable. Please try: 1) Ensure good lighting, 2) Hold phone steady, 3) Get closer to the menu, 4) Take photo again',
        tips: [
          'Ensure good lighting',
          'Hold phone steady',
          'Get closer to the menu',
          'Take photo again'
        ]
      });
    }

    // Handle API key errors
    if (error.status === 401 || error.message?.includes('api key') || error.message?.includes('authentication')) {
      return res.status(500).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'OpenAI API authentication failed. Please check your API key.'
      });
    }

    // Handle rate limit errors
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT',
        message: 'OpenAI API rate limit exceeded. Please try again in a moment.'
      });
    }

    // Generic error response with more details
    res.status(500).json({
      success: false,
      error: 'PROCESSING_ERROR',
      message: error.message || 'Failed to analyze menu. Please try again with a clearer image.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start server - listen on all interfaces (0.0.0.0) to allow network access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server accessible on network at http://192.168.1.43:${PORT}`);
});

