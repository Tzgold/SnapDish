import type { NutritionRecalcResponse, RecipeIngredient } from '@/src/types/recipe';

import { apiFetch } from '@/src/services/http';

export async function recalculateNutrition(
  ingredients: RecipeIngredient[],
  servings: number
): Promise<NutritionRecalcResponse | null> {
  if (ingredients.length === 0) return null;

  const res = await apiFetch('/api/recipe/nutrition', {
    method: 'POST',
    body: JSON.stringify({ ingredients, servings }),
  });

  if (!res.ok) {
    console.warn('Nutrition recalc failed', res.status);
    return null;
  }

  return (await res.json()) as NutritionRecalcResponse;
}
