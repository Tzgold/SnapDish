import { apiFetch } from '@/src/services/http';
import type { RecipeResult } from '@/src/types/recipe';

export type SavedRecipeItem = {
  id: string;
  recipe: RecipeResult;
  source: string | null;
  created_at: string;
  saved: boolean;
};

export async function fetchMyRecipes(): Promise<SavedRecipeItem[]> {
  const res = await apiFetch('/api/recipes');
  if (!res.ok) throw new Error('Could not load recipes');
  const data = (await res.json()) as { recipes: SavedRecipeItem[] };
  return data.recipes;
}

export async function saveRecipe(recipe: RecipeResult, source?: string): Promise<string> {
  const res = await apiFetch('/api/recipes', {
    method: 'POST',
    body: JSON.stringify({ recipe, source }),
  });
  if (!res.ok) throw new Error('Could not save recipe');
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function bookmarkRecipe(id: string): Promise<void> {
  const res = await apiFetch(`/api/recipes/${id}/save`, { method: 'POST' });
  if (!res.ok) throw new Error('Could not bookmark recipe');
}

export async function unbookmarkRecipe(id: string): Promise<void> {
  const res = await apiFetch(`/api/recipes/${id}/save`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Could not remove bookmark');
}
