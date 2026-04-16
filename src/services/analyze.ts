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
    let message = errorText || 'Unable to analyze recipe input.';
    try {
      const parsed = JSON.parse(errorText) as { error?: string };
      if (typeof parsed.error === 'string' && parsed.error.length > 0) {
        message = parsed.error;
      }
    } catch {
      /* plain text body */
    }
    throw new Error(message);
  }

  return (await response.json()) as AnalyzeRecipeResponse;
}

export function getMockRecipeResponse(): AnalyzeRecipeResponse {
  return {
    recipe: {
      recipeTitle: 'Chicken Curry',
      servings: 2,
      prepTimeMinutes: 12,
      cookTimeMinutes: 33,
      totalTimeMinutes: 45,
      calories: 425,
      rating: 4.5,
      confidenceScore: 0.88,
      ingredients: [
        { name: 'Chicken breast, diced', quantity: '16 oz' },
        { name: 'Basmati rice', quantity: '1 cup' },
        { name: 'Olive oil', quantity: '2 tbsp' },
        { name: 'Yellow onion, small-diced', quantity: '8 oz' },
        { name: 'Canned tomatoes', quantity: '16 oz' },
        { name: 'Garlic, minced', quantity: '2 cloves' },
        { name: 'Curry powder', quantity: '2 tsp' },
        { name: 'Fresh coriander', quantity: '2 tbsp', optional: true },
      ],
      steps: [
        {
          order: 1,
          instruction:
            'Heat olive oil in a medium pan. Add chicken and cook until lightly browned on all sides.',
          durationMinutes: 8,
        },
        {
          order: 2,
          instruction:
            'Add onion and garlic, then stir for 2-3 minutes. Mix in curry powder until fragrant.',
          durationMinutes: 6,
        },
        {
          order: 3,
          instruction:
            'Pour in canned tomatoes with a pinch of salt. Cover and simmer on low heat for 14 minutes.',
          durationMinutes: 14,
        },
        {
          order: 4,
          instruction:
            'Rinse and cook rice while curry simmers. Serve chicken curry over rice and top with coriander.',
          durationMinutes: 10,
        },
      ],
      notes: [
        'Taste and adjust salt before serving.',
        'Add coconut milk for a creamier curry variation.',
      ],
    },
  };
}
