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
  /\.supabase\.co/i.test(databaseUrl || '');

/** Shared pool for Better Auth and SnapDish app queries */
export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: needsPgSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null;

const devTrusted = [
  'snapdishapp://',
  'snapdishapp://*',
  'exp://',
  'exp://**',
];

export const auth = pool
  ? betterAuth({
      secret: process.env.BETTER_AUTH_SECRET || 'dev-only-change-me',
      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
      database: pool,
      plugins: [expo()],
      emailAndPassword: {
        enabled: true,
      },
      trustedOrigins: [
        ...devTrusted,
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
      ],
    })
  : null;
