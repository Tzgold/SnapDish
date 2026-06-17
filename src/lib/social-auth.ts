import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { WebBrowserPresentationStyle } from 'expo-web-browser';

import { AUTH_BASE_URL, API_BASE_URL } from '@/src/config/api';
import { authClient } from '@/src/lib/auth-client';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const LAN_OR_LOCAL = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i;

export function usesNgrokAuth(): boolean {
  return /ngrok/i.test(AUTH_BASE_URL);
}

export function googleSignInReadiness(): { ready: boolean; hint?: string; authUrl: string; redirectUri?: string } {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const redirectUri = makeRedirectUri({ scheme: 'snapdishapp', path: 'oauth' });
  if (clientId) {
    return { ready: true, authUrl: AUTH_BASE_URL, redirectUri };
  }
  const authUrl = AUTH_BASE_URL;
  if (!/^https:\/\//i.test(authUrl)) {
    return {
      ready: false,
      authUrl,
      hint:
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (same as server GOOGLE_CLIENT_ID) to snapdish-app/.env for Google sign-in, then restart Expo.',
    };
  }
  return { ready: true, authUrl };
}

function formatGoogleAuthError(message: string, authUrl: string): string {
  if (/state_mismatch/i.test(message)) {
    return 'Your sign-in session expired. Please try again.';
  }
  if (/redirect_uri|invalid.*redirect|unauthorized|origin|insecure/i.test(message)) {
    const redirectHint = makeRedirectUri({ scheme: 'snapdishapp', path: 'oauth' });
    return `Google rejected the redirect. In Google Cloud → OAuth client → Authorized redirect URIs, add:\n\n${redirectHint}\n\nand (browser fallback):\n${authUrl}/api/auth/callback/google`;
  }
  if (/offline|ngrok|3200|could not resolve|fetch|network|timeout|failed to connect/i.test(message)) {
    return 'Cannot reach the sign-in server. Check Wi‑Fi and that the API server is running, then try again.';
  }
  if (/cancel|dismiss/i.test(message)) {
    return 'Google sign-in was cancelled.';
  }
  return message;
}

async function googleBrowserOptions() {
  return {
    preferEphemeralSession: false,
    createTask: true,
    showInRecents: true,
    showTitle: true,
    enableBarCollapsing: false,
    toolbarColor: '#FFFFFF',
    ...(Platform.OS === 'ios'
      ? {
          presentationStyle: WebBrowserPresentationStyle.FULL_SCREEN,
          dismissButtonStyle: 'close' as const,
        }
      : {}),
  };
}

/** Opens Google directly (not ngrok) and returns an ID token — no "Visit Site" page. */
async function fetchGoogleIdToken(): Promise<string | null> {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) return null;

  const redirectUri = makeRedirectUri({ scheme: 'snapdishapp', path: 'oauth' });

  if (__DEV__) {
    console.log('[SnapDish] Google OAuth redirect URI:', redirectUri);
  }

  const request = new AuthRequest({
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
  });

  if (Platform.OS === 'android') {
    try {
      await WebBrowser.dismissAuthSession();
    } catch {
      /* ignore */
    }
  }

  const result = await request.promptAsync(GOOGLE_DISCOVERY, await googleBrowserOptions());
  if (result.type !== 'success' || !result.params.code) {
    return null;
  }

  const tokens = await exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    GOOGLE_DISCOVERY,
  );

  return tokens.idToken ?? null;
}

/** Fallback browser OAuth via ngrok — only used when idToken flow is unavailable. */
const ngrokAuthClient =
  AUTH_BASE_URL !== API_BASE_URL && /^https:\/\//i.test(AUTH_BASE_URL)
    ? createAuthClient({
        baseURL: AUTH_BASE_URL,
        fetchOptions: {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        },
        plugins: [
          expoClient({
            scheme: 'snapdishapp',
            storagePrefix: 'snapdish',
            storage: SecureStore,
            cookiePrefix: 'better-auth',
          }),
        ],
      })
    : null;

/** Fallback: Better Auth browser flow via ngrok (shows interstitial on free ngrok). */
async function signInWithGoogleBrowser(): Promise<{ ok: true } | { ok: false; message: string }> {
  const readiness = googleSignInReadiness();
  const callbackURL = Linking.createURL('/(tabs)');
  const client = ngrokAuthClient ?? authClient;

  const { error } = await client.signIn.social({
    provider: 'google',
    callbackURL,
  });

  if (error) {
    return {
      ok: false,
      message: formatGoogleAuthError(error.message ?? 'Could not continue with Google.', readiness.authUrl),
    };
  }

  const session = await client.getSession();
  if (!session.data?.session) {
    return { ok: false, message: 'Google sign-in did not finish. Try again.' };
  }
  return { ok: true };
}

/**
 * Preferred: native Google OAuth → ID token → LAN API (no ngrok browser page).
 */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  const readiness = googleSignInReadiness();
  if (!readiness.ready) {
    return { ok: false, message: readiness.hint ?? 'Google sign-in is not configured.' };
  }

  const callbackURL = Linking.createURL('/(tabs)');

  try {
    const idToken = await fetchGoogleIdToken();
    if (!idToken) {
      return { ok: false, message: 'Google sign-in was cancelled.' };
    }

    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
      idToken: { token: idToken },
    });

    if (error) {
      return {
        ok: false,
        message: formatGoogleAuthError(error.message ?? 'Could not verify Google sign-in.', readiness.authUrl),
      };
    }

    const session = await authClient.getSession();
    if (!session.data?.session) {
      return { ok: false, message: 'Sign-in succeeded but no session was saved. Try again.' };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not continue with Google.';
    if (/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID|clientId/i.test(msg)) {
      return signInWithGoogleBrowser();
    }
    return { ok: false, message: formatGoogleAuthError(msg, readiness.authUrl) };
  }
}

export function isLocalApiUrl(): boolean {
  return LAN_OR_LOCAL.test(AUTH_BASE_URL);
}
