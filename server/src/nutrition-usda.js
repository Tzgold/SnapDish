const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';
const ENERGY_ID = 1008;
const PROTEIN_ID = 1003;
const FAT_ID = 1004;
const CARBS_ID = 1005;

const PREP_WORDS =
  /\b(fresh|frozen|diced|chopped|minced|sliced|grated|shredded|crushed|ground|boneless|skinless|optional|large|small|medium|raw|cooked|unsalted|salted|peeled|trimmed|thinly|roughly|finely)\b/gi;

/** @type {Map<string, { fdcId: number; description: string; kcalPer100g: number; proteinPer100g: number; fatPer100g: number; carbsPer100g: number }>} */
const foodCache = new Map();

function apiKey() {
  return process.env.USDA_API_KEY?.trim() || 'DEMO_KEY';
}

function nutrientAmount(nutrients, id, numberFallback) {
  if (!Array.isArray(nutrients)) return 0;
  for (const n of nutrients) {
    const nid = n.nutrientId ?? n.nutrient?.id;
    const nnum = n.nutrientNumber ?? n.nutrient?.number;
    if (nid === id || nnum === numberFallback) {
      const val = n.value ?? n.amount;
      return typeof val === 'number' && Number.isFinite(val) ? val : 0;
    }
  }
  return 0;
}

function kcalFromMacros(protein, fat, carbs) {
  return protein * 4 + carbs * 4 + fat * 9;
}

function normalizeSearchName(name) {
  return String(name ?? '')
    .replace(PREP_WORDS, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function searchQueryForIngredient(name) {
  const n = normalizeSearchName(name);
  if (/white rice|cooked rice/.test(n)) return 'rice white cooked';
  if (/brown rice/.test(n)) return 'rice brown cooked';
  if (/chicken breast/.test(n)) return 'chicken breast raw boneless';
  if (/ground beef|mince/.test(n)) return 'beef ground raw';
  if (/olive oil/.test(n)) return 'olive oil';
  if (/pasta|spaghetti|penne|rigatoni/.test(n)) return 'pasta cooked';
  return n;
}

function scoreFoodMatch(query, description) {
  const q = normalizeSearchName(query);
  const d = description.toLowerCase();
  if (!q || !d) return 0;
  const qTokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const t of qTokens) {
    if (d.includes(t)) hits += 1;
  }
  let score = hits / qTokens.length;
  if (d.startsWith(q) || d.includes(q)) score += 0.35;
  const dTokens = d.replace(/,/g, ' ').split(/\s+/).filter((t) => t.length > 2);
  const extras = dTokens.filter((t) => !qTokens.some((qt) => t.includes(qt) || qt.includes(t)));
  score -= extras.length * 0.07;
  if (/\band\b/.test(d) && !/\band\b/.test(q)) score -= 0.3;
  if (/lunchmeat|baby food|fast food|restaurant|frozen meal|snack|rotisserie|pickled|canned|powder|mix, dry|breaded|tenders|nuggets|with sauce|beans and/i.test(d)) {
    score -= 0.45;
  }
  if (/\braw\b|boneless|skinless/.test(d) && /chicken|beef|pork|fish|salmon/.test(q)) score += 0.12;
  if (/cooked/.test(d) && /cooked|rice|pasta/.test(q)) score += 0.1;
  return score;
}

async function fdcFetch(path, params = {}, body = null) {
  const url = new URL(`${FDC_BASE}${path}`);
  url.searchParams.set('api_key', apiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`USDA API ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

async function loadFoodNutrients(fdcId, description, inlineNutrients) {
  const cacheKey = String(fdcId);
  if (foodCache.has(cacheKey)) return foodCache.get(cacheKey);

  let nutrients = inlineNutrients;
  if (!nutrients?.length) {
    const detail = await fdcFetch(`/food/${fdcId}`);
    nutrients = detail.foodNutrients ?? [];
    description = detail.description ?? description;
  }

  let protein = nutrientAmount(nutrients, PROTEIN_ID, '203');
  let fat = nutrientAmount(nutrients, FAT_ID, '204');
  let carbs = nutrientAmount(nutrients, CARBS_ID, '205');
  let kcal = nutrientAmount(nutrients, ENERGY_ID, '208');

  if (kcal <= 0 && (protein > 0 || fat > 0 || carbs > 0)) {
    kcal = kcalFromMacros(protein, fat, carbs);
  }

  const entry = {
    fdcId,
    description: description ?? 'Unknown food',
    kcalPer100g: Math.max(0, kcal),
    proteinPer100g: Math.max(0, protein),
    fatPer100g: Math.max(0, fat),
    carbsPer100g: Math.max(0, carbs),
  };
  foodCache.set(cacheKey, entry);
  return entry;
}

async function searchBestFood(ingredientName) {
  const query = searchQueryForIngredient(ingredientName);
  if (!query || query.length < 2) return null;

  const data = await fdcFetch('/foods/search', {}, {
    query,
    pageSize: 8,
    dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
  });

  const foods = data.foods ?? [];
  if (foods.length === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const food of foods) {
    const score = scoreFoodMatch(ingredientName, food.description ?? '');
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }

  if (!best || bestScore < 0.35) return null;

  return loadFoodNutrients(best.fdcId, best.description, best.foodNutrients);
}

/**
 * Look up one ingredient in USDA FoodData Central.
 * @param {{ name: string; quantity: string; optional?: boolean }} item
 * @param {(q: string) => number | null} parseGrams
 */
export async function lookupIngredientNutrition(item, parseGrams) {
  if (item.optional) return null;

  const grams = parseGrams(item.quantity);
  if (grams == null || grams <= 0) return null;

  const food = await searchBestFood(item.name);
  if (!food) return null;

  const factor = grams / 100;
  return {
    name: item.name,
    quantity: item.quantity,
    grams: Math.round(grams),
    matchedAs: food.description,
    fdcId: food.fdcId,
    calories: Math.round(food.kcalPer100g * factor),
    proteinGrams: Math.round(food.proteinPer100g * factor * 10) / 10,
    fatGrams: Math.round(food.fatPer100g * factor * 10) / 10,
    carbsGrams: Math.round(food.carbsPer100g * factor * 10) / 10,
    source: 'usda',
  };
}

/**
 * Compute recipe nutrition from ingredients via USDA (with graceful partial coverage).
 * @param {{ name: string; quantity: string; optional?: boolean }[]} ingredients
 * @param {(q: string) => number | null} parseGrams
 */
export async function computeUsdaNutrition(ingredients, parseGrams) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return null;
  }

  const eligible = ingredients.filter((i) => !i.optional);
  if (eligible.length === 0) return null;

  /** @type {Awaited<ReturnType<typeof lookupIngredientNutrition>>[]} */
  const breakdown = [];
  let matchedWeight = 0;
  let totalEligible = 0;

  for (const item of eligible) {
    const grams = parseGrams(item.quantity);
    totalEligible += 1;
    if (grams == null) continue;

    try {
      const row = await lookupIngredientNutrition(item, parseGrams);
      if (row) {
        breakdown.push(row);
        matchedWeight += grams;
      }
    } catch (err) {
      console.warn('[nutrition] USDA lookup failed for', item.name, err instanceof Error ? err.message : err);
    }
  }

  if (breakdown.length === 0) return null;

  const coverage = breakdown.length / totalEligible;
  const calories = breakdown.reduce((s, r) => s + r.calories, 0);
  const proteinGrams = breakdown.reduce((s, r) => s + r.proteinGrams, 0);
  const fatGrams = breakdown.reduce((s, r) => s + r.fatGrams, 0);
  const carbsGrams = breakdown.reduce((s, r) => s + r.carbsGrams, 0);

  return {
    source: 'usda',
    coverage: Math.round(coverage * 100) / 100,
    matchedIngredients: breakdown.length,
    totalIngredients: totalEligible,
    calories: Math.round(calories),
    macros: {
      proteinGrams: Math.round(proteinGrams * 10) / 10,
      fatGrams: Math.round(fatGrams * 10) / 10,
      carbsGrams: Math.round(carbsGrams * 10) / 10,
    },
    breakdown,
    matchedWeightGrams: Math.round(matchedWeight),
  };
}

export function isUsdaConfigured() {
  const key = process.env.USDA_API_KEY?.trim();
  return Boolean(key && key !== 'DEMO_KEY');
}
