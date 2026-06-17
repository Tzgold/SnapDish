import type { RecipeIngredient, RecipeResult } from '@/src/types/recipe';

const FRACTION_MAP: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

function parseLeadingNumber(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  if (FRACTION_MAP[t] !== undefined) return FRACTION_MAP[t];
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    return den ? Number(frac[1]) / den : null;
  }
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const den = Number(mixed[3]);
    return den ? Number(mixed[1]) + Number(mixed[2]) / den : null;
  }
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: number): string {
  if (value <= 0) return '0';
  const rounded = Math.abs(value - Math.round(value)) < 0.08 ? Math.round(value) : Math.round(value * 100) / 100;
  if (rounded === Math.round(rounded)) return String(Math.round(rounded));
  return String(rounded);
}

/** Scale numeric quantities in strings like "2 cups", "1/2 tsp", "200 g". */
export function scaleIngredientQuantity(quantity: string, factor: number): string {
  const q = quantity.trim();
  if (!q || factor === 1) return quantity;
  const lower = q.toLowerCase();
  if (
    /to taste|as needed|pinch|dash|handful|optional|few|some\b/.test(lower) &&
    !/\d/.test(q)
  ) {
    return quantity;
  }

  const range = q.match(/^([\d.,\/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*[-–]\s*([\d.,\/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/);
  if (range) {
    const a = parseLeadingNumber(range[1]);
    const b = parseLeadingNumber(range[2]);
    const unit = range[3]?.trim() ?? '';
    if (a != null && b != null) {
      const unitSuffix = unit ? ` ${unit}` : '';
      return `${formatAmount(a * factor)}–${formatAmount(b * factor)}${unitSuffix}`;
    }
  }

  const match = q.match(/^([\d.,\/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/);
  if (!match) return quantity;
  const num = parseLeadingNumber(match[1]);
  if (num == null) return quantity;
  const rest = match[2]?.trim() ?? '';
  const scaled = formatAmount(num * factor);
  return rest ? `${scaled} ${rest}` : scaled;
}

/** Inverse of scaleIngredientQuantity — e.g. display servings → base recipe servings. */
export function unscaleIngredientQuantity(quantity: string, factor: number): string {
  if (!quantity.trim() || factor === 1 || factor <= 0) return quantity;
  return scaleIngredientQuantity(quantity, 1 / factor);
}

export function scaleIngredients(
  ingredients: RecipeIngredient[],
  baseServings: number,
  targetServings: number
): RecipeIngredient[] {
  const base = Math.max(1, baseServings);
  const target = Math.max(1, targetServings);
  const factor = target / base;
  if (factor === 1) return ingredients;
  return ingredients.map((item) => ({
    ...item,
    quantity: scaleIngredientQuantity(item.quantity, factor),
    calories: item.calories != null ? Math.round(item.calories * factor) : undefined,
    proteinGrams: item.proteinGrams != null ? Math.round(item.proteinGrams * factor * 10) / 10 : undefined,
  }));
}

/**
 * Home-cooking times rarely change when you double servings (same pan, same oven).
 * Ingredient amounts, per-ingredient calories, and total calories scale with servings.
 */
export function scaleRecipeForServings(recipe: RecipeResult, targetServings: number): RecipeResult {
  const base = Math.max(1, recipe.servings);
  const target = Math.max(1, targetServings);
  const factor = target / base;
  const calories =
    recipe.calories != null
      ? Math.round(recipe.calories * factor)
      : undefined;
  const macros = recipe.nutrition?.macros
    ? {
        proteinGrams: Math.round(recipe.nutrition.macros.proteinGrams * factor * 10) / 10,
        fatGrams: Math.round(recipe.nutrition.macros.fatGrams * factor * 10) / 10,
        carbsGrams: Math.round(recipe.nutrition.macros.carbsGrams * factor * 10) / 10,
      }
    : undefined;
  return {
    ...recipe,
    servings: target,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    totalTimeMinutes: recipe.totalTimeMinutes,
    calories,
    caloriesPerServing: calories != null ? Math.round(calories / target) : recipe.caloriesPerServing,
    nutrition: recipe.nutrition && macros ? { ...recipe.nutrition, macros } : recipe.nutrition,
    ingredients: scaleIngredients(recipe.ingredients, base, target),
  };
}

/** Sum calories for checked ingredients (uses USDA per-ingredient data when available). */
export function estimateSelectedCalories(
  ingredients: RecipeIngredient[],
  checkedNames: Set<string>,
  totalCalories: number
): number {
  const checked = ingredients.filter((item) => checkedNames.has(item.name));
  if (checked.length === 0) return 0;

  const withCalories = checked.filter((item) => item.calories != null && item.calories > 0);
  if (withCalories.length > 0) {
    return withCalories.reduce((s, item) => s + (item.calories ?? 0), 0);
  }

  if (totalCalories <= 0 || ingredients.length === 0) return 0;
  const weights = ingredients.map((item) => ({
    name: item.name,
    weight: item.optional ? 0.35 : 1,
  }));
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  if (totalWeight <= 0) return 0;
  let selectedWeight = 0;
  for (const w of weights) {
    if (checkedNames.has(w.name)) selectedWeight += w.weight;
  }
  return Math.round(totalCalories * (selectedWeight / totalWeight));
}
