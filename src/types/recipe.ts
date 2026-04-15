export type InputType = 'link' | 'image';

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
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  confidenceScore: number;
  notes?: string[];
};

export type AnalyzeRecipeRequest = {
  inputType: InputType;
  sourceUrl?: string;
  imageBase64?: string;
};

export type AnalyzeRecipeResponse = {
  recipe: RecipeResult;
};
