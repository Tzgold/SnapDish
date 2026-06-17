import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL?.trim();

const needsPgSsl =
  process.env.DATABASE_SSL === 'true' ||
  /sslmode=require/i.test(databaseUrl || '') ||
  /\.supabase\.(co|com)/i.test(databaseUrl || '');

/** Shared pool for Better Auth and SnapDish app queries */
export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: needsPgSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    })
  : null;

const devTrusted = [
  'snapdishapp://',
  'snapdishapp://*',
  'exp://',
  'exp://**',
];

/** Public HTTPS URL for OAuth callbacks (ngrok). Falls back to BETTER_AUTH_URL. */
const authBaseURL =
  process.env.BETTER_AUTH_PUBLIC_URL?.trim() ||
  process.env.BETTER_AUTH_URL?.trim() ||
  'http://localhost:4000';

/** Set BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=true only when real email (SMTP) is configured. */
const requireEmailVerification =
  process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION === 'true';

export const auth = pool
  ? betterAuth({
      secret: process.env.BETTER_AUTH_SECRET || 'dev-only-change-me',
      baseURL: authBaseURL,
      database: pool,
      plugins: [expo()],
      socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              // No forced prompt — lets Google reuse Chrome session when already signed in.
            },
          }
        : undefined,
      ...(requireEmailVerification
        ? {
            emailVerification: {
              sendOnSignUp: true,
              sendOnSignIn: true,
              autoSignInAfterVerification: true,
              sendVerificationEmail: async ({ user, url }) => {
                console.log(`[auth] Verify email for ${user.email}: ${url}`);
              },
            },
          }
        : {}),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification,
        async sendResetPassword({ user, url, token }) {
          console.log(
            `\n[auth] Password reset for ${user.email}\n  Link: ${url}\n  Token: ${token}\n  (Open this link on the phone, or paste the token into the Reset password screen.)\n`,
          );
        },
      },
      trustedOrigins: [
        ...devTrusted,
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
        ...(authBaseURL.startsWith('https://') ? [authBaseURL] : []),
        ...(process.env.BETTER_AUTH_URL?.trim().startsWith('http')
          ? [process.env.BETTER_AUTH_URL.trim().replace(/\/+$/, '')]
          : []),
      ],
    })
  : null;

if (auth && process.env.GOOGLE_CLIENT_ID) {
  const isHttps = authBaseURL.startsWith('https://');
  if (!isHttps) {
    console.warn(
      '[auth] Google OAuth is configured but no HTTPS public URL is set.',
      '\n  Set BETTER_AUTH_PUBLIC_URL=https://YOUR-NGROK.ngrok-free.dev in server/.env',
      '\n  and EXPO_PUBLIC_AUTH_URL to the same URL in snapdish-app/.env, then restart both.',
      '\n  Google Cloud redirect URI: https://YOUR-NGROK.ngrok-free.dev/api/auth/callback/google',
    );
  } else {
    console.log('[auth] Google OAuth base URL:', authBaseURL);
    console.log('[auth] Google redirect URI:', `${authBaseURL.replace(/\/+$/, '')}/api/auth/callback/google`);
  }
}
