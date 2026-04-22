import Constants from 'expo-constants';

const extraUrl =
  Constants.expoConfig?.extra &&
  typeof Constants.expoConfig.extra === 'object' &&
  'apiUrl' in Constants.expoConfig.extra &&
  typeof (Constants.expoConfig.extra as { apiUrl?: unknown }).apiUrl === 'string'
    ? (Constants.expoConfig.extra as { apiUrl: string }).apiUrl
    : undefined;

const rawBase =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || extraUrl || 'http://localhost:4000';

export const API_BASE_URL = rawBase.replace(/\/+$/, '');

if (__DEV__ && /localhost|127\.0\.0\.1/i.test(API_BASE_URL)) {
  console.warn(
    '[SnapDish] API_BASE_URL uses localhost — phones and many emulators cannot reach your PC. Set EXPO_PUBLIC_API_URL in .env to http://YOUR_LAN_IP:4000 and restart Expo.',
  );
}

export const API_ROUTES = {
  analyzeRecipe: '/api/analyze-recipe',
  authBase: '/api/auth',
  me: '/api/me',
  recipes: '/api/recipes',
} as const;
