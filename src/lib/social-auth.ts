import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { WebBrowserPresentationStyle } from 'expo-web-browser';

import { AUTH_BASE_URL } from '@/src/config/api';
import { authClient } from '@/src/lib/auth-client';

const LAN_OR_LOCAL = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i;

const webBrowserOptions = {
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

/** OAuth browser calls go through ngrok HTTPS — matches Google Cloud redirect URI. */
const oauthAuthClient = /^https:\/\//i.test(AUTH_BASE_URL)
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
          webBrowserOptions,
        }),
      ],
    })
  : null;

export function usesNgrokAuth(): boolean {
  return /ngrok/i.test(AUTH_BASE_URL);
}

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function googleSignInReadiness(): { ready: boolean; hint?: string; authUrl: string } {
  const authUrl = AUTH_BASE_URL;
  if (!/^https:\/\//i.test(authUrl)) {
    return {
      ready: false,
      authUrl,
      hint:
        'Google sign-in needs HTTPS. Add EXPO_PUBLIC_AUTH_URL=https://YOUR-NGROK.ngrok-free.dev to snapdish-app/.env and BETTER_AUTH_PUBLIC_URL to server/.env, then restart Expo and the server.',
    };
  }
  if (!oauthAuthClient) {
    return { ready: false, authUrl, hint: 'Google sign-in is not configured.' };
  }
  return { ready: true, authUrl };
}

function formatGoogleAuthError(message: string, authUrl: string): string {
  if (/cancel|dismiss/i.test(message)) {
    return 'Google sign-in was cancelled.';
  }
  if (/invalid_request|authorization error|oauth 2\.0 policy|access blocked/i.test(message)) {
    return `Google blocked the sign-in (redirect URI mismatch). In Google Cloud → Credentials → your OAuth client, confirm this exact redirect URI is listed:\n\n${authUrl}/api/auth/callback/google\n\nAlso add your email under OAuth consent screen → Test users.`;
  }
  if (/redirect_uri|invalid.*redirect|unauthorized|origin|insecure/i.test(message)) {
    return `Google rejected the callback URL. In Google Cloud → OAuth client → Authorized redirect URIs, add:\n\n${authUrl}/api/auth/callback/google`;
  }
  if (/offline|ngrok|3200|could not resolve|fetch|network|timeout|failed to connect/i.test(message)) {
    return 'Cannot reach the sign-in server. Start ngrok (ngrok http 4000), restart the API server, then try again.';
  }
  return message;
}

/**
 * Browser OAuth via ngrok — uses the redirect URI already registered in Google Cloud.
 * Required for Expo Go (native redirect URIs are not supported the same way).
 */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  const readiness = googleSignInReadiness();
  if (!readiness.ready || !oauthAuthClient) {
    return { ok: false, message: readiness.hint ?? 'Google sign-in is not configured.' };
  }

  const callbackURL = Linking.createURL('/(tabs)');

  const { error } = await oauthAuthClient.signIn.social({
    provider: 'google',
    callbackURL,
  });

  if (error) {
    return {
      ok: false,
      message: formatGoogleAuthError(error.message ?? 'Could not continue with Google.', readiness.authUrl),
    };
  }

  const session = await oauthAuthClient.getSession();
  if (!session.data?.session) {
    const sessionOnLan = await authClient.getSession();
    if (sessionOnLan.data?.session) {
      return { ok: true };
    }
    return {
      ok: false,
      message: usesNgrokAuth()
        ? 'Google sign-in did not finish. If you saw an ngrok page, tap Visit Site (do not cancel), pick your Google account, then return to SnapDish.'
        : 'Google sign-in did not finish. Try again.',
    };
  }

  return { ok: true };
}

export function isLocalApiUrl(): boolean {
  return LAN_OR_LOCAL.test(AUTH_BASE_URL);
}
