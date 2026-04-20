import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { z } from 'zod';

import { auth, pool } from './auth.js';
import {
  AnalyzeBodySchema,
  recipeFromDishName,
  recipeFromImage,
} from './recipe-ai.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.warn('Warning: OPENAI_API_KEY is not set. POST /api/analyze-recipe will fail.');
}

const primaryModel = process.env.OPENAI_MODEL_PRIMARY || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const fallbackModel = process.env.OPENAI_MODEL_FALLBACK || primaryModel;
const models = { primary: primaryModel, fallback: fallbackModel };

const openai = new OpenAI({
  apiKey: openaiKey || 'missing',
  timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 120_000,
});

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

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'snapdish-api' });
});

app.get('/health/ready', async (_req, res) => {
  const needsDb = Boolean(process.env.DATABASE_URL);
  const checks = {
    openai: Boolean(openaiKey),
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
  const ok = checks.openai && (!needsDb || (checks.database && checks.auth));
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

app.post('/api/analyze-recipe', async (req, res) => {
  try {
    if (!openaiKey) {
      return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
    }

    const body = AnalyzeBodySchema.parse(req.body);
    const name = typeof body.dishName === 'string' ? body.dishName.trim() : '';
    const hasName = name.length > 0;
    const cleanB64 = body.imageBase64
      ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '').trim()
      : '';
    const hasImage = cleanB64.length > 0;

    let recipe;
    if (hasImage && hasName) {
      recipe = await recipeFromImage(openai, models, cleanB64, body.imageMimeType, name);
    } else if (hasImage) {
      recipe = await recipeFromImage(openai, models, cleanB64, body.imageMimeType, '');
    } else {
      recipe = await recipeFromDishName(openai, models, name);
    }

    return res.json({ recipe, meta: { primaryModel, fallbackModel } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.flatten() });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return res.status(500).json({ error: message });
  }
});

app.listen(port, async () => {
  try {
    await ensureSnapdishTables();
  } catch (e) {
    console.error('ensureSnapdishTables failed', e);
  }
  console.log(`SnapDish API listening on http://localhost:${port}`);
});
