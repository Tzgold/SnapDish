/**
 * Entry point for `npx @better-auth/cli migrate`.
 * The CLI uses c12, which omits null exports — so `export const auth = null` in auth.js
 * does not count as an `auth` export. This module always exports a real `auth` when
 * DATABASE_URL is set, or exits with a clear error.
 */
import { auth, pool } from './auth.js';

if (!pool || !auth) {
  console.error(
    '[snapdish] DATABASE_URL must be set in server/.env (Postgres connection string) before running migrations.',
  );
  process.exit(1);
}

export { auth };
export default auth;
