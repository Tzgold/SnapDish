import type { EditableIngredient, IngredientUserStatus, RecipeIngredient } from '@/src/types/recipe';

/** Photo-detected ingredients at or above this confidence auto-confirm; below → ask the user. */
export const INGREDIENT_CONFIRM_THRESHOLD = 0.9;

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
}

export function initialUserStatus(item: RecipeIngredient): IngredientUserStatus {
  if (item.detectedFromPhoto) {
    const c = item.confidence ?? 0.7;
    return c >= INGREDIENT_CONFIRM_THRESHOLD ? 'confirmed' : 'pending';
  }
  return 'confirmed';
}

export function toEditableIngredients(ingredients: RecipeIngredient[]): EditableIngredient[] {
  return ingredients.map((item, index) => ({
    ...item,
    id: `ing-${index}-${slug(item.name)}`,
    userStatus: initialUserStatus(item),
  }));
}

export function activeIngredients(rows: EditableIngredient[]): RecipeIngredient[] {
  return rows
    .filter((r) => r.userStatus === 'confirmed' || r.userStatus === 'added')
    .map(({ id, userStatus, ...rest }) => rest);
}

export function pendingCount(rows: EditableIngredient[]): number {
  return rows.filter((r) => r.userStatus === 'pending').length;
}

export function mergeNutritionIntoRows(
  rows: EditableIngredient[],
  enriched: RecipeIngredient[]
): EditableIngredient[] {
  const byName = new Map(enriched.map((i) => [i.name.toLowerCase(), i]));
  return rows.map((row) => {
    if (row.userStatus === 'rejected') return row;
    const match = byName.get(row.name.toLowerCase());
    if (!match) return { ...row, calories: undefined, proteinGrams: undefined, matchedFood: undefined };
    return {
      ...row,
      calories: match.calories,
      proteinGrams: match.proteinGrams,
      matchedFood: match.matchedFood,
    };
  });
}

export function newIngredientId(name: string) {
  return `ing-user-${Date.now()}-${slug(name)}`;
}
