import Constants from 'expo-constants';

const extraUrl =
  Constants.expoConfig?.extra &&
  typeof Constants.expoConfig.extra === 'object' &&
  'apiUrl' in Constants.expoConfig.extra &&
  typeof (Constants.expoConfig.extra as { apiUrl?: unknown }).apiUrl === 'string'
    ? (Constants.expoConfig.extra as { apiUrl: string }).apiUrl
    : undefined;

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || extraUrl || 'http://localhost:4000';

export const API_ROUTES = {
  analyzeRecipe: '/api/analyze-recipe',
  authBase: '/api/auth',
  me: '/api/me',
  recipes: '/api/recipes',
} as const;
