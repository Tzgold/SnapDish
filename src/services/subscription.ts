/**
 * Subscription & usage tracking.
 *
 * For signed-in users, source-of-truth is the server (/api/me/subscription).
 * For guests, we track locally in SecureStore.
 */
import { secureStorage } from '@/src/lib/secure-storage';
import { apiFetch } from '@/src/services/http';

export const FREE_INITIAL = 3;   // first N generations, no account needed
export const FREE_WEEKLY  = 1;   // after that, N per week for free users

const LOCAL_USAGE_KEY = 'snapdish.localUsage';

type LocalUsage = {
  totalGenerations: number;
  weekStartMs: number;
  weekGenerations: number;
};

export type SubStatus = 'active' | 'trialing' | 'free' | 'cancelled';

export type SubscriptionInfo = {
  /** subscription tier */
  status: SubStatus;
  /** can fire another generation right now? */
  canGenerate: boolean;
  /** how many left before hitting paywall (undefined = unlimited) */
  remaining: number | null;
  /** total ever */
  totalUsed: number;
  /** used this week */
  weekUsed: number;
  /** ISO string of when subscription ends, if subscribed */
  currentPeriodEnd: string | null;
};

function getWeekStartMs(): number {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun 1=Mon
  const diff = (day + 6) % 7;  // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.getTime();
}

async function getLocalUsage(): Promise<LocalUsage> {
  try {
    const raw = await secureStorage.getItemAsync(LOCAL_USAGE_KEY);
    if (!raw) return { totalGenerations: 0, weekStartMs: getWeekStartMs(), weekGenerations: 0 };
    const parsed = JSON.parse(raw) as LocalUsage;
    // Reset week counter if a new week has started
    const currentWeekStart = getWeekStartMs();
    if (parsed.weekStartMs < currentWeekStart) {
      return { ...parsed, weekStartMs: currentWeekStart, weekGenerations: 0 };
    }
    return parsed;
  } catch {
    return { totalGenerations: 0, weekStartMs: getWeekStartMs(), weekGenerations: 0 };
  }
}

async function saveLocalUsage(u: LocalUsage): Promise<void> {
  await secureStorage.setItemAsync(LOCAL_USAGE_KEY, JSON.stringify(u));
}

/** Record a generation locally (guest users or as fallback) */
export async function recordLocalGeneration(): Promise<void> {
  const u = await getLocalUsage();
  await saveLocalUsage({
    ...u,
    totalGenerations: u.totalGenerations + 1,
    weekGenerations: u.weekGenerations + 1,
  });
}

/** Local usage snapshot (for guests or when server is unreachable) */
export async function getLocalSubscriptionInfo(): Promise<SubscriptionInfo> {
  const u = await getLocalUsage();
  const total = u.totalGenerations;
  const week = u.weekGenerations;
  let canGenerate: boolean;
  let remaining: number | null;
  if (total < FREE_INITIAL) {
    canGenerate = true;
    remaining = FREE_INITIAL - total;
  } else if (week < FREE_WEEKLY) {
    canGenerate = true;
    remaining = FREE_WEEKLY - week;
  } else {
    canGenerate = false;
    remaining = 0;
  }
  return { status: 'free', canGenerate, remaining, totalUsed: total, weekUsed: week, currentPeriodEnd: null };
}

type ApiSubscription = {
  status: SubStatus;
  canGenerate: boolean;
  totalRecipes: number;
  weekRecipes: number;
  currentPeriodEnd: string | null;
};

function mapApiSubscription(data: ApiSubscription): SubscriptionInfo {
  const isUnlimited = data.status === 'active' || data.status === 'trialing';
  const total = data.totalRecipes;
  const week = data.weekRecipes;
  let remaining: number | null;
  if (isUnlimited) {
    remaining = null;
  } else if (total < FREE_INITIAL) {
    remaining = FREE_INITIAL - total;
  } else {
    remaining = Math.max(0, FREE_WEEKLY - week);
  }
  return {
    status: data.status,
    canGenerate: data.canGenerate,
    remaining,
    totalUsed: total,
    weekUsed: week,
    currentPeriodEnd: data.currentPeriodEnd,
  };
}

/** Server subscription info for signed-in users */
export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const res = await apiFetch('/api/me/subscription');
  if (!res.ok) throw new Error('Could not load subscription');
  const data = (await res.json()) as ApiSubscription;
  return mapApiSubscription(data);
}

/** After Stripe checkout — pull status from Stripe and unlock Pro in the app. */
export async function syncSubscription(sessionId?: string): Promise<SubscriptionInfo> {
  const res = await apiFetch('/api/stripe/sync-subscription', {
    method: 'POST',
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
  if (!res.ok) throw new Error('Could not sync subscription');
  const data = (await res.json()) as ApiSubscription;
  return mapApiSubscription(data);
}

export function isProStatus(status: SubStatus): boolean {
  return status === 'active' || status === 'trialing';
}

function parseCheckoutError(body: string): string {
  try {
    const data = JSON.parse(body) as { error?: string };
    if (typeof data.error === 'string') return data.error;
  } catch {
    /* plain text */
  }
  return body || 'Could not create checkout';
}

/** Start Stripe checkout — returns the checkout URL to open in browser */
export async function createCheckoutSession(): Promise<string> {
  const res = await apiFetch('/api/stripe/create-checkout', { method: 'POST' });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseCheckoutError(t));
  }
  const data = await res.json() as { url: string };
  return data.url;
}

/** Open Stripe billing portal — returns URL to open in browser */
export async function openBillingPortal(): Promise<string> {
  const res = await apiFetch('/api/stripe/portal', { method: 'POST' });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'Could not open portal');
  }
  const data = await res.json() as { url: string };
  return data.url;
}
