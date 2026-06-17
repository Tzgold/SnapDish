export type IngredientUserStatus = 'pending' | 'confirmed' | 'rejected' | 'added';

export type RecipeIngredient = {
  name: string;
  quantity: string;
  optional?: boolean;
  calories?: number;
  proteinGrams?: number;
  matchedFood?: string;
  /** 0–1 model confidence (photo-detected ingredients) */
  confidence?: number;
  detectedFromPhoto?: boolean;
  possibleAlternative?: string;
};

export type EditableIngredient = RecipeIngredient & {
  id: string;
  userStatus: IngredientUserStatus;
};

export type RecipeStep = {
  order: number;
  instruction: string;
  durationMinutes?: number;
};

export type RecipeNutrition = {
  source: 'usda' | 'hybrid' | 'estimate';
  coverage?: number;
  matchedIngredients?: number;
  totalIngredients?: number;
  dataAttribution?: string;
  macros?: {
    proteinGrams: number;
    fatGrams: number;
    carbsGrams: number;
  };
};

export type RecipeResult = {
  recipeTitle: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  calories?: number;
  caloriesPerServing?: number;
  rating?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  confidenceScore: number;
  visualAnalysis?: string;
  nutrition?: RecipeNutrition;
  notes?: string[];
};

export type NutritionRecalcResponse = {
  servings: number;
  calories?: number;
  caloriesPerServing?: number;
  nutrition?: RecipeNutrition;
  ingredients: RecipeIngredient[];
};

export type AnalyzeRecipeRequest = {
  dishName?: string;
  recipeDetails?: string;
  cookingStyle?: string;
  imageBase64?: string;
  imageMimeType?: string;
};

export type AnalyzeRecipeResponse = {
  recipe: RecipeResult;
  meta?: {
    primaryModel?: string;
    fallbackModel?: string;
    preferencesApplied?: boolean;
    nutritionSource?: 'usda' | 'hybrid' | 'estimate';
    nutritionCoverage?: number;
  };
};
