-- SnapDish app tables (Better Auth creates its own tables via `npx @better-auth/cli migrate`)
-- Run after Better Auth migrations against the same DATABASE_URL.

CREATE TABLE IF NOT EXISTS snapdish_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id text NOT NULL,
  recipe jsonb NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapdish_recipes_user_id_idx ON snapdish_recipes (user_id);

CREATE TABLE IF NOT EXISTS snapdish_saved (
  user_id text NOT NULL,
  recipe_id uuid NOT NULL REFERENCES snapdish_recipes (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now (),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS snapdish_pantry_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id text NOT NULL,
  recipe_id uuid NOT NULL REFERENCES snapdish_recipes (id) ON DELETE CASCADE,
  selected_keys jsonb NOT NULL,
  estimated_calories int,
  updated_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS snapdish_cook_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id text NOT NULL,
  recipe_id uuid NOT NULL REFERENCES snapdish_recipes (id) ON DELETE CASCADE,
  plan_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);
