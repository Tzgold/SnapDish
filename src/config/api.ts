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

const rawAuthBase =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUTH_URL?.trim()) || rawBase;

export const API_BASE_URL = rawBase.replace(/\/+$/, '');
/** HTTPS URL for OAuth (Google). Falls back to API_BASE_URL when unset. */
export const AUTH_BASE_URL = rawAuthBase.replace(/\/+$/, '');

if (__DEV__) {
  if (/localhost|127\.0\.0\.1/i.test(API_BASE_URL)) {
    console.warn(
      '[SnapDish] API_BASE_URL uses localhost — phones cannot reach your PC. Set EXPO_PUBLIC_API_URL in .env to http://YOUR_LAN_IP:4000 and restart Expo.',
    );
  } else {
    console.log('[SnapDish] API_BASE_URL =', API_BASE_URL);
    if (AUTH_BASE_URL !== API_BASE_URL) {
      console.log('[SnapDish] AUTH_BASE_URL =', AUTH_BASE_URL);
    }
  }
}

export const API_ROUTES = {
  analyzeRecipe: '/api/analyze-recipe',
  authBase: '/api/auth',
  me: '/api/me',
  recipes: '/api/recipes',
} as const;
