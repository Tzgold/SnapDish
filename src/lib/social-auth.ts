import { API_BASE_URL } from '@/src/config/api';
import { authClient } from '@/src/lib/auth-client';

const LAN_OR_LOCAL = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i;

export function googleSignInReadiness(): { ready: boolean; hint?: string } {
  if (!/^https:\/\//i.test(API_BASE_URL)) {
    return {
      ready: false,
      hint:
        'Google sign-in needs a public HTTPS API URL (e.g. ngrok). Set EXPO_PUBLIC_API_URL and server BETTER_AUTH_URL to the same https://… address, add …/api/auth/callback/google in Google Cloud, then restart Expo and the server. Email + password still works on your Wi‑Fi IP.',
    };
  }
  return { ready: true };
}

export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  const readiness = googleSignInReadiness();
  if (!readiness.ready) {
    return { ok: false, message: readiness.hint ?? 'Google sign-in is not configured.' };
  }

  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/profile',
  });

  if (error) {
    const msg = error.message ?? 'Could not continue with Google.';
    if (/redirect_uri|invalid.*redirect|unauthorized|origin|insecure/i.test(msg)) {
      return {
        ok: false,
        message:
          'Google rejected the callback URL. In Google Cloud → OAuth client, add Authorized redirect URI: YOUR_API_URL/api/auth/callback/google (must match BETTER_AUTH_URL exactly).',
      };
    }
    return { ok: false, message: msg };
  }

  const session = await authClient.getSession();
  if (!session.data?.session) {
    return {
      ok: false,
      message: 'Google sign-in was cancelled or did not finish. Try again, or use email and password.',
    };
  }

  return { ok: true };
}

/** True when API is LAN-only (email auth OK, Google OAuth will not work). */
export function isLocalApiUrl(): boolean {
  return LAN_OR_LOCAL.test(API_BASE_URL);
}
