import { computeUsdaNutrition, isUsdaConfigured } from './nutrition-usda.js';

/**
 * Rough home-cooking calorie estimates (kcal per 100 g/ml) — fallback when USDA unavailable.
 */
const KCAL_PER_100G = [
  [/chicken breast|chicken thigh|turkey breast/i, 165],
  [/ground beef|mince|beef steak/i, 250],
  [/pork|bacon|sausage|ham/i, 280],
  [/salmon|tuna|cod|fish fillet|shrimp|prawn/i, 140],
  [/egg(?!plant)/i, 155],
  [/tofu|tempeh/i, 120],
  [/olive oil|vegetable oil|canola|sunflower oil|butter|ghee/i, 884],
  [/rice\b|cooked rice/i, 130],
  [/pasta|spaghetti|penne|rigatoni|noodle/i, 131],
  [/bread|bun|tortilla|pita/i, 265],
  [/potato|sweet potato/i, 87],
  [/onion|garlic|shallot/i, 40],
  [/tomato|pepper|bell pepper|capsicum/i, 26],
  [/broccoli|spinach|kale|lettuce|peas|carrot|zucchini|courgette/i, 35],
  [/mushroom/i, 22],
  [/cheese|cheddar|mozzarella|parmesan|feta/i, 350],
  [/milk|cream|yogurt|yoghurt/i, 60],
  [/flour|all.purpose|plain flour/i, 364],
  [/sugar|honey|maple syrup/i, 380],
  [/avocado/i, 160],
  [/banana|apple|berry|berries|fruit/i, 55],
  [/lentil|chickpea|bean|black bean/i, 120],
  [/sauce|ketchup|mayo|mayonnaise/i, 200],
  [/coconut milk/i, 230],
];

const UNIT_TO_GRAMS = [
  [/^(\d+(?:\.\d+)?)\s*g(?:rams?)?\b/i, 1],
  [/^(\d+(?:\.\d+)?)\s*kg\b/i, 1000],
  [/^(\d+(?:\.\d+)?)\s*ml\b/i, 1],
  [/^(\d+(?:\.\d+)?)\s*l(?:iters?)?\b/i, 1000],
  [/^(\d+(?:\.\d+)?)\s*(?:cup|cups)\b/i, 240],
  [/^(\d+(?:\.\d+)?)\s*tbsp\b/i, 15],
  [/^(\d+(?:\.\d+)?)\s*tsp\b/i, 5],
  [/^(\d+(?:\.\d+)?)\s*oz\b/i, 28],
  [/^(\d+(?:\.\d+)?)\s*lb\b/i, 454],
  [/^(\d+(?:\.\d+)?)\s*(?:clove|cloves)\b/i, 5],
  [/^(\d+(?:\.\d+)?)\s*(?:slice|slices)\b/i, 30],
  [/^(\d+(?:\.\d+)?)\s*(?:medium|large|small)\b/i, 150],
];

export function parseQuantityGrams(quantity) {
  const q = String(quantity ?? '').trim().toLowerCase();
  if (!q || /to taste|as needed|pinch|dash|handful|optional|few\b/.test(q)) return null;

  for (const [re, mult] of UNIT_TO_GRAMS) {
    const m = q.match(re);
    if (m) return Number(m[1]) * mult;
  }

  const numOnly = q.match(/^(\d+(?:\.\d+)?)/);
  if (numOnly) return Number(numOnly[1]) * 50;
  return null;
}

function kcalPer100g(name) {
  for (const [re, kcal] of KCAL_PER_100G) {
    if (re.test(name)) return kcal;
  }
  return 80;
}

export function estimateCaloriesFromIngredients(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return null;

  let total = 0;
  let matched = 0;

  for (const item of ingredients) {
    if (item.optional) continue;
    const grams = parseQuantityGrams(item.quantity);
    if (grams == null) continue;
    matched += 1;
    total += (grams / 100) * kcalPer100g(item.name);
  }

  if (matched === 0) return null;
  return Math.round(total);
}

function applyLocalEstimate(ingredients) {
  const calories = estimateCaloriesFromIngredients(ingredients);
  if (calories == null) return null;
  return {
    source: 'estimate',
    coverage: 1,
    calories,
    macros: null,
    breakdown: [],
  };
}

/**
 * Primary nutrition pipeline: USDA FoodData Central → local estimate fallback.
 * @param {{ name: string; quantity: string; optional?: boolean }[]} ingredients
 */
export async function computeRecipeNutrition(ingredients) {
  try {
    const usda = await computeUsdaNutrition(ingredients, parseQuantityGrams);
    if (usda && usda.coverage >= 0.4) {
      return usda;
    }
    if (usda && usda.calories > 0) {
      const local = applyLocalEstimate(ingredients);
      if (local && local.calories > usda.calories * 1.5) {
        return { ...usda, source: 'hybrid', note: 'Partial USDA match; some ingredients estimated locally.' };
      }
      return usda;
    }
  } catch (err) {
    console.warn('[nutrition] USDA batch failed:', err instanceof Error ? err.message : err);
  }

  return applyLocalEstimate(ingredients);
}

/**
 * Merge computed nutrition into recipe + fix per-serving fields.
 */
export async function enrichRecipeNutrition(recipe) {
  const servings = Math.max(1, Math.min(12, Math.round(recipe.servings) || 1));
  const nutrition = await computeRecipeNutrition(recipe.ingredients ?? []);

  let calories = recipe.calories;
  let caloriesPerServing = recipe.caloriesPerServing;
  let nutritionMeta = recipe.nutrition ?? null;
  const notes = [...(recipe.notes ?? [])];

  if (nutrition?.calories) {
    const usdaStrong = nutrition.source === 'usda' && nutrition.coverage >= 0.5;
    const hybridOk = nutrition.source === 'hybrid' || nutrition.source === 'usda';

    if (usdaStrong || hybridOk || calories == null) {
      calories = nutrition.calories;
    } else if (calories != null) {
      const diff = Math.abs(calories - nutrition.calories) / nutrition.calories;
      calories = diff > 0.35 ? nutrition.calories : Math.round((calories + nutrition.calories) / 2);
    }

    caloriesPerServing = Math.round(calories / servings);
    nutritionMeta = {
      source: nutrition.source,
      coverage: nutrition.coverage,
      matchedIngredients: nutrition.matchedIngredients,
      totalIngredients: nutrition.totalIngredients,
      macros: nutrition.macros ?? undefined,
      breakdown: nutrition.breakdown ?? [],
      dataAttribution: nutrition.source === 'usda' || nutrition.source === 'hybrid'
        ? 'USDA FoodData Central'
        : 'SnapDish estimate',
    };

    if (nutrition.source === 'usda' && nutrition.coverage >= 0.5) {
      const pct = Math.round(nutrition.coverage * 100);
      notes.unshift(
        `Nutrition calculated from USDA database (${pct}% of ingredients matched by weight).`
      );
    } else if (nutrition.source === 'hybrid') {
      notes.unshift('Nutrition partly from USDA; unmatched ingredients use standard estimates.');
    }
  } else {
    const local = estimateCaloriesFromIngredients(recipe.ingredients);
    if (local != null && calories == null) {
      calories = local;
      caloriesPerServing = Math.round(local / servings);
    }
  }

  if (calories != null) {
    calories = Math.max(120, Math.min(8000, Math.round(calories)));
    caloriesPerServing = Math.max(80, Math.min(2000, Math.round(calories / servings)));
  }

  const ingredients = (recipe.ingredients ?? []).map((item) => {
    const row = nutritionMeta?.breakdown?.find(
      (b) => b.name.toLowerCase() === item.name.toLowerCase()
    );
    if (!row) return item;
    return {
      ...item,
      calories: row.calories,
      proteinGrams: row.proteinGrams,
      matchedFood: row.matchedAs,
    };
  });

  return {
    ...recipe,
    servings,
    calories,
    caloriesPerServing,
    ingredients,
    nutrition: nutritionMeta ?? undefined,
    notes: notes.length ? notes : undefined,
  };
}

/** @deprecated use enrichRecipeNutrition — kept for sync reconcile path */
export function reconcileNutrition(recipe) {
  const servings = Math.max(1, Math.min(12, Math.round(recipe.servings) || 1));
  let calories = recipe.calories;
  let caloriesPerServing = recipe.caloriesPerServing;
  const fromIngredients = estimateCaloriesFromIngredients(recipe.ingredients);

  if (calories == null && fromIngredients != null) {
    calories = fromIngredients;
  }
  if (calories != null && caloriesPerServing == null) {
    caloriesPerServing = Math.round(calories / servings);
  }

  return { ...recipe, servings, calories, caloriesPerServing };
}
