import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import Stripe from 'stripe';
import { z } from 'zod';

import { auth, pool } from './auth.js';
import {
  AnalyzeBodySchema,
  recipeFromDishName,
  recipeFromImage,
} from './recipe-ai.js';
import { createLlmClient } from './llm-client.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })
  : null;

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const APP_SCHEME = process.env.APP_SCHEME ?? 'snapdishapp';

/** Free tier limits */
const FREE_INITIAL = 3;   // first N generations ever, no account needed
const FREE_WEEKLY  = 1;   // after that, N per week for free users

const llm = createLlmClient();
const { client: openai, apiKey: llmApiKey, provider: llmProvider, models } = llm;
const { primary: primaryModel, fallback: fallbackModel } = models;

if (!llmApiKey) {
  console.warn(
    'Warning: set OPENROUTER_API_KEY (https://openrouter.ai) or OPENAI_API_KEY. POST /api/analyze-recipe will fail.'
  );
} else {
  console.log(`LLM provider: ${llmProvider} (primary: ${primaryModel})`);
}

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Cookie', 'Authorization'],
  })
);

if (auth) {
  app.all('/api/auth/*', toNodeHandler(auth));
} else {
  app.all('/api/auth/*', (_req, res) => {
    res.status(503).json({
      error: 'Authentication is not configured. Set DATABASE_URL and run Better Auth migrations.',
    });
  });
}

app.use(express.json({ limit: '12mb' }));

async function ensureSnapdishTables() {
  if (!pool) return;
  // One statement per query — safer with Supabase pooler / some pg drivers.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapdish_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      recipe jsonb NOT NULL,
      source text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS snapdish_recipes_user_id_idx ON snapdish_recipes (user_id)`
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapdish_saved (
      user_id text NOT NULL,
      recipe_id uuid NOT NULL REFERENCES snapdish_recipes (id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, recipe_id)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapdish_pantry_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      recipe_id uuid NOT NULL REFERENCES snapdish_recipes (id) ON DELETE CASCADE,
      selected_keys jsonb NOT NULL,
      estimated_calories int,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, recipe_id)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapdish_cook_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      recipe_id uuid NOT NULL REFERENCES snapdish_recipes (id) ON DELETE CASCADE,
      plan_json jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapdish_user_preferences (
      user_id text PRIMARY KEY,
      goal text NOT NULL,
      skill text NOT NULL,
      time_pref text NOT NULL,
      diet text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapdish_subscriptions (
      user_id text PRIMARY KEY,
      stripe_customer_id text,
      stripe_subscription_id text,
      status text NOT NULL DEFAULT 'free',
      current_period_end timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
}

async function requireSession(req, res, next) {
  if (!auth) {
    return res.status(503).json({ error: 'Auth not configured' });
  }
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  req.snapUser = session.user;
  next();
}

function requireDb(req, res, next) {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  next();
}

/** Returns true if user has an active subscription */
async function hasActiveSubscription(userId) {
  if (!pool) return false;
  const r = await pool.query(
    `SELECT status, current_period_end FROM snapdish_subscriptions WHERE user_id = $1`,
    [userId]
  );
  if (r.rowCount === 0) return false;
  const { status, current_period_end } = r.rows[0];
  if (status === 'active' || status === 'trialing') {
    if (!current_period_end) return true;
    return new Date(current_period_end) > new Date();
  }
  return false;
}

/** Returns recipe count for current week (Mon 00:00 UTC) */
async function weeklyRecipeCount(userId) {
  if (!pool) return 0;
  const r = await pool.query(
    `SELECT COUNT(*) AS cnt FROM snapdish_recipes
     WHERE user_id = $1
       AND created_at >= date_trunc('week', now() AT TIME ZONE 'UTC')`,
    [userId]
  );
  return Number(r.rows[0]?.cnt ?? 0);
}

/** Loads saved onboarding/cooking preferences when the request has a valid session (optional for analyze). */
async function loadOptionalUserPreferences(req) {
  if (!auth || !pool) {
    return null;
  }
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user?.id) {
    return null;
  }
  const r = await pool.query(
    `SELECT goal, skill, time_pref AS time, diet
     FROM snapdish_user_preferences
     WHERE user_id = $1`,
    [session.user.id]
  );
  if (r.rowCount === 0) {
    return null;
  }
  return r.rows[0];
}

app.get('/', (_req, res) => {
  res.type('html');
  res.send(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SnapDish API</title></head><body>` +
      `<p><strong>SnapDish API</strong> is running.</p>` +
      `<p>This URL is the backend; there is no web app here. Use the Expo app, or open ` +
      `<a href="/health">/health</a> for a JSON check.</p>` +
      `</body></html>`
  );
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'snapdish-api' });
});

app.get('/health/ready', async (_req, res) => {
  const needsDb = Boolean(process.env.DATABASE_URL);
  const checks = {
    llm: Boolean(llmApiKey),
    llmProvider,
    database: false,
    auth: Boolean(auth && pool),
  };
  try {
    if (pool) {
      await pool.query('select 1');
      checks.database = true;
    }
  } catch (e) {
    console.error('ready check db', e);
  }
  const ok = checks.llm && (!needsDb || (checks.database && checks.auth));
  res.status(ok ? 200 : 503).json({ ok, checks, needsDatabase: needsDb });
});

app.get('/api/me', async (req, res) => {
  if (!auth) {
    return res.status(503).json({ error: 'Auth not configured' });
  }
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

const PreferencesBody = z.object({
  goal: z.enum(['learn', 'quick', 'healthy', 'budget']),
  skill: z.enum(['beginner', 'intermediate', 'advanced']),
  time: z.enum(['10-15', '30', '60+']),
  diet: z.enum(['vegetarian', 'vegan', 'halal', 'none']).optional(),
});

app.get('/api/me/preferences', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const r = await pool.query(
      `SELECT goal, skill, time_pref AS time, diet, updated_at
       FROM snapdish_user_preferences
       WHERE user_id = $1`,
      [userId]
    );
    if (r.rowCount === 0) {
      return res.json({ preferences: null });
    }
    return res.json({ preferences: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load preferences' });
  }
});

app.post('/api/me/preferences', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const body = PreferencesBody.parse(req.body);
    await pool.query(
      `INSERT INTO snapdish_user_preferences (user_id, goal, skill, time_pref, diet)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         goal = EXCLUDED.goal,
         skill = EXCLUDED.skill,
         time_pref = EXCLUDED.time_pref,
         diet = EXCLUDED.diet,
         updated_at = now()`,
      [userId, body.goal, body.skill, body.time, body.diet ?? null]
    );
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid body', details: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: 'Could not save preferences' });
  }
});

const SaveRecipeBody = z.object({
  recipe: z.unknown(),
  source: z.string().optional(),
});

app.post('/api/recipes', requireDb, requireSession, async (req, res) => {
  try {
    const body = SaveRecipeBody.parse(req.body);
    const userId = req.snapUser.id;
    const r = await pool.query(
      `INSERT INTO snapdish_recipes (user_id, recipe, source)
       VALUES ($1, $2::jsonb, $3)
       RETURNING id, created_at`,
      [userId, JSON.stringify(body.recipe), body.source ?? null]
    );
    return res.json({ id: r.rows[0].id, createdAt: r.rows[0].created_at });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid body', details: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Save failed' });
  }
});

app.get('/api/recipes', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const r = await pool.query(
      `SELECT id, recipe, source, created_at,
        EXISTS (SELECT 1 FROM snapdish_saved s WHERE s.user_id = $1 AND s.recipe_id = snapdish_recipes.id) AS saved
       FROM snapdish_recipes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return res.json({ recipes: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'List failed' });
  }
});

app.post('/api/recipes/:id/save', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const { id } = req.params;
    const own = await pool.query(
      `SELECT 1 FROM snapdish_recipes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (own.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    await pool.query(
      `INSERT INTO snapdish_saved (user_id, recipe_id) VALUES ($1, $2)
       ON CONFLICT (user_id, recipe_id) DO NOTHING`,
      [userId, id]
    );
    return res.json({ saved: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Save failed' });
  }
});

app.delete('/api/recipes/:id/save', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const { id } = req.params;
    await pool.query(`DELETE FROM snapdish_saved WHERE user_id = $1 AND recipe_id = $2`, [userId, id]);
    return res.json({ saved: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unsave failed' });
  }
});

const PantryBody = z.object({
  selectedKeys: z.array(z.string()),
  estimatedCalories: z.number().optional(),
});

app.post('/api/recipes/:id/pantry', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const { id } = req.params;
    const body = PantryBody.parse(req.body);
    const own = await pool.query(
      `SELECT 1 FROM snapdish_recipes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (own.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    await pool.query(
      `INSERT INTO snapdish_pantry_sessions (user_id, recipe_id, selected_keys, estimated_calories)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (user_id, recipe_id) DO UPDATE SET
         selected_keys = EXCLUDED.selected_keys,
         estimated_calories = EXCLUDED.estimated_calories,
         updated_at = now()`,
      [userId, id, JSON.stringify(body.selectedKeys), body.estimatedCalories ?? null]
    );
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid body', details: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: 'Pantry save failed' });
  }
});

const CookBody = z.object({
  plan: z.unknown(),
});

app.post('/api/recipes/:id/cook-session', requireDb, requireSession, async (req, res) => {
  try {
    const userId = req.snapUser.id;
    const { id } = req.params;
    const body = CookBody.parse(req.body);
    const own = await pool.query(
      `SELECT 1 FROM snapdish_recipes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (own.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    const r = await pool.query(
      `INSERT INTO snapdish_cook_sessions (user_id, recipe_id, plan_json)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, created_at`,
      [userId, id, JSON.stringify(body.plan)]
    );
    return res.json({ id: r.rows[0].id, createdAt: r.rows[0].created_at });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid body', details: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: 'Cook session failed' });
  }
});

/* ── Subscription endpoints ─────────────────────────────────────────── */

async function upsertStripeSubscription(userId, customerId, stripeSub) {
  const periodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : null;
  await pool.query(
    `INSERT INTO snapdish_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = now()`,
    [userId, customerId, stripeSub.id, stripeSub.status, periodEnd]
  );
}

async function subscriptionPayloadForUser(userId) {
  const totalR = await pool.query(
    `SELECT COUNT(*) AS cnt FROM snapdish_recipes WHERE user_id = $1`,
    [userId]
  );
  const total = Number(totalR.rows[0]?.cnt ?? 0);
  const weekCount = await weeklyRecipeCount(userId);
  const subR = await pool.query(
    `SELECT status, current_period_end FROM snapdish_subscriptions WHERE user_id = $1`,
    [userId]
  );
  const sub = subR.rows[0] ?? null;
  const active =
    sub?.status === 'active' || sub?.status === 'trialing'
      ? !sub.current_period_end || new Date(sub.current_period_end) > new Date()
      : false;
  return {
    status: active ? sub.status : 'free',
    totalRecipes: total,
    weekRecipes: weekCount,
    freeInitial: FREE_INITIAL,
    freeWeekly: FREE_WEEKLY,
    canGenerate: active || total < FREE_INITIAL || weekCount < FREE_WEEKLY,
    currentPeriodEnd: sub?.current_period_end ?? null,
  };
}

app.get('/api/me/subscription', requireDb, requireSession, async (req, res) => {
  try {
    return res.json(await subscriptionPayloadForUser(req.snapUser.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load subscription' });
  }
});

/** Pull latest subscription from Stripe (used after checkout when webhook/deep link may lag). */
app.post('/api/stripe/sync-subscription', requireDb, requireSession, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured.' });
  }
  try {
    const userId = req.snapUser.id;
    const sessionId =
      typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';

    const row = await pool.query(
      `SELECT stripe_customer_id FROM snapdish_subscriptions WHERE user_id = $1`,
      [userId]
    );
    let customerId = row.rows[0]?.stripe_customer_id ?? null;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.customer) {
        customerId =
          typeof session.customer === 'string' ? session.customer : session.customer.id;
        await pool.query(
          `INSERT INTO snapdish_subscriptions (user_id, stripe_customer_id, status)
           VALUES ($1, $2, 'free')
           ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id`,
          [userId, customerId]
        );
      }
      if (session.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        await upsertStripeSubscription(userId, customerId, stripeSub);
        return res.json({
          ...(await subscriptionPayloadForUser(userId)),
          synced: true,
        });
      }
    }

    if (!customerId) {
      return res.json({
        ...(await subscriptionPayloadForUser(userId)),
        synced: false,
      });
    }

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
    const active = subs.data.find((s) => s.status === 'active' || s.status === 'trialing');
    if (active) {
      await upsertStripeSubscription(userId, customerId, active);
    }

    return res.json({
      ...(await subscriptionPayloadForUser(userId)),
      synced: Boolean(active),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not sync subscription' });
  }
});

app.post('/api/stripe/create-checkout', requireDb, requireSession, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) {
    return res.status(503).json({ error: 'Stripe is not configured on this server.' });
  }
  try {
    const userId = req.snapUser.id;
    const email = req.snapUser.email;
    const subR = await pool.query(
      `SELECT stripe_customer_id FROM snapdish_subscriptions WHERE user_id = $1`,
      [userId]
    );
    let customerId = subR.rows[0]?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { snapdish_user_id: userId } });
      customerId = customer.id;
      await pool.query(
        `INSERT INTO snapdish_subscriptions (user_id, stripe_customer_id, status)
         VALUES ($1, $2, 'free')
         ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id`,
        [userId, customerId]
      );
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      metadata: { snapdish_user_id: userId },
      success_url: `${APP_SCHEME}://subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_SCHEME}://subscription-cancel`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    const raw = err instanceof Error ? err.message : 'Checkout failed';
    let error = raw;
    if (/business name|account name/i.test(raw)) {
      error =
        'Stripe needs a business name on your account. Open dashboard.stripe.com/settings/account, fill in Public business name, then try Subscribe again.';
    }
    return res.status(500).json({ error });
  }
});

app.post('/api/stripe/portal', requireDb, requireSession, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured.' });
  try {
    const userId = req.snapUser.id;
    const subR = await pool.query(
      `SELECT stripe_customer_id FROM snapdish_subscriptions WHERE user_id = $1`,
      [userId]
    );
    const customerId = subR.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No billing account found.' });
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_SCHEME}://profile`,
    });
    return res.json({ url: portal.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not open billing portal.' });
  }
});

// Stripe webhook — must be raw body before express.json parses it
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Stripe webhook signature failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    const object = event.data.object;
    try {
      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        const customerId =
          typeof object.customer === 'string' ? object.customer : object.customer?.id;
        if (pool && customerId) {
          const cust = await stripe.customers.retrieve(customerId);
          const userId = cust.metadata?.snapdish_user_id;
          if (userId) {
            await upsertStripeSubscription(userId, customerId, object);
          } else {
            await pool.query(
              `UPDATE snapdish_subscriptions
               SET stripe_subscription_id = $1, status = $2, current_period_end = $3, updated_at = now()
               WHERE stripe_customer_id = $4`,
              [
                object.id,
                object.status,
                object.current_period_end ? new Date(object.current_period_end * 1000) : null,
                customerId,
              ]
            );
          }
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const customerId =
          typeof object.customer === 'string' ? object.customer : object.customer?.id;
        if (pool && customerId) {
          await pool.query(
            `UPDATE snapdish_subscriptions
             SET status = 'cancelled', stripe_subscription_id = NULL, updated_at = now()
             WHERE stripe_customer_id = $1`,
            [customerId]
          );
        }
      } else if (event.type === 'checkout.session.completed' && pool) {
        const session = object;
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer.id;
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          const cust = await stripe.customers.retrieve(customerId);
          const userId = cust.metadata?.snapdish_user_id;
          if (userId) {
            await upsertStripeSubscription(userId, customerId, stripeSub);
          }
        }
      }
    } catch (err) {
      console.error('Stripe webhook handler error:', err);
    }
    return res.json({ received: true });
  }
);

/* ── Recipe analysis ────────────────────────────────────────────────── */

app.post('/api/analyze-recipe', async (req, res) => {
  try {
    if (!llmApiKey) {
      return res.status(500).json({
        error: 'Server missing OPENROUTER_API_KEY or OPENAI_API_KEY',
      });
    }

    const body = AnalyzeBodySchema.parse(req.body);
    const name = typeof body.dishName === 'string' ? body.dishName.trim() : '';
    const recipeDetails =
      typeof body.recipeDetails === 'string' ? body.recipeDetails.trim() : '';
    const cookingStyle =
      typeof body.cookingStyle === 'string' ? body.cookingStyle.trim() : '';
    const hasName = name.length > 0;
    const cleanB64 = body.imageBase64
      ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '').trim()
      : '';
    const hasImage = cleanB64.length > 0;

    // ── Subscription gate ─────────────────────────────────────────────
    if (pool && auth) {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (session?.user?.id) {
        const userId = session.user.id;
        const subscribed = await hasActiveSubscription(userId);
        if (!subscribed) {
          const totalR = await pool.query(
            `SELECT COUNT(*) AS cnt FROM snapdish_recipes WHERE user_id = $1`, [userId]
          );
          const total = Number(totalR.rows[0]?.cnt ?? 0);
          if (total >= FREE_INITIAL) {
            const weekCount = await weeklyRecipeCount(userId);
            if (weekCount >= FREE_WEEKLY) {
              return res.status(402).json({
                error: 'subscription_required',
                message: 'Free limit reached. Subscribe to SnapDish Pro for unlimited recipes.',
                totalUsed: total,
                weekUsed: weekCount,
              });
            }
          }
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────

    let preferences = null;
    try {
      preferences = await loadOptionalUserPreferences(req);
    } catch (prefErr) {
      console.warn('analyze-recipe: could not load user preferences', prefErr);
    }

    let recipe;
    if (hasImage) {
      recipe = await recipeFromImage(
        openai,
        models,
        cleanB64,
        body.imageMimeType,
        hasName ? name : '',
        recipeDetails,
        cookingStyle,
        preferences
      );
    } else {
      recipe = await recipeFromDishName(
        openai,
        models,
        name,
        recipeDetails,
        cookingStyle,
        preferences
      );
    }

    return res.json({
      recipe,
      meta: {
        provider: llmProvider,
        primaryModel,
        fallbackModel,
        preferencesApplied: Boolean(preferences),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.flatten() });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return res.status(500).json({ error: message });
  }
});

app.listen(port, '0.0.0.0', async () => {
  try {
    await ensureSnapdishTables();
  } catch (e) {
    console.error('ensureSnapdishTables failed', e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/tenant\/user.*not found/i.test(msg)) {
      console.error(
        'Supabase DB: project may be paused or DATABASE_URL is wrong. Dashboard → Project Settings → Database → copy the Session pooler URI (port 5432) and replace DATABASE_URL.'
      );
    }
  }
  console.log(`SnapDish API listening on http://0.0.0.0:${port} (reachable from your LAN at http://<this-pc-ip>:${port})`);
});
