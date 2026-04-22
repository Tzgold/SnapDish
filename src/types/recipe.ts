export type RecipeIngredient = {
  name: string;
  quantity: string;
  optional?: boolean;
};

export type RecipeStep = {
  order: number;
  instruction: string;
  durationMinutes?: number;
};

export type RecipeResult = {
  recipeTitle: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  calories?: number;
  rating?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  confidenceScore: number;
  notes?: string[];
};

/** Send a dish name, a food photo (base64), or both. At least one must be set. */
export type AnalyzeRecipeRequest = {
  dishName?: string;
  imageBase64?: string;
  imageMimeType?: string;
};

export type AnalyzeRecipeResponse = {
  recipe: RecipeResult;
  meta?: {
    primaryModel?: string;
    fallbackModel?: string;
    preferencesApplied?: boolean;
  };
};
