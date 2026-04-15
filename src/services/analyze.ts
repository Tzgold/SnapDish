import { API_BASE_URL, API_ROUTES } from '@/src/config/api';
import { AnalyzeRecipeRequest, AnalyzeRecipeResponse } from '@/src/types/recipe';

export async function analyzeRecipe(
  payload: AnalyzeRecipeRequest
): Promise<AnalyzeRecipeResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ROUTES.analyzeRecipe}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to analyze recipe input.');
  }

  return (await response.json()) as AnalyzeRecipeResponse;
}

export function getMockRecipeResponse(): AnalyzeRecipeResponse {
  return {
    recipe: {
      recipeTitle: 'Crispy Garlic Butter Chicken Pasta',
      servings: 2,
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      totalTimeMinutes: 40,
      confidenceScore: 0.88,
      ingredients: [
        { name: 'Chicken breast', quantity: '250 g' },
        { name: 'Pasta', quantity: '200 g' },
        { name: 'Garlic cloves', quantity: '4 minced' },
        { name: 'Butter', quantity: '2 tbsp' },
        { name: 'Parmesan', quantity: '3 tbsp grated', optional: true },
      ],
      steps: [
        {
          order: 1,
          instruction: 'Boil pasta in salted water until al dente.',
          durationMinutes: 10,
        },
        {
          order: 2,
          instruction: 'Pan-sear seasoned chicken strips until golden and cooked through.',
          durationMinutes: 9,
        },
        {
          order: 3,
          instruction: 'Melt butter, add garlic, then toss cooked pasta and chicken.',
          durationMinutes: 6,
        },
        {
          order: 4,
          instruction: 'Top with parmesan and serve hot.',
          durationMinutes: 2,
        },
      ],
      notes: [
        'Use low heat while cooking garlic to avoid bitterness.',
        'Add 2-3 tbsp pasta water for a silkier sauce.',
      ],
    },
  };
}
