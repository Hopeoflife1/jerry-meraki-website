-- Jerry Meraki Print: database schema, migrated from Floot (2026-10-13).
-- Idempotent: safe to run more than once. Applied by /api/migrate on first deploy.

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE job_status AS ENUM ('quote_requested', 'quoted', 'approved', 'artwork_check', 'in_production', 'ready', 'delivered', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE artwork_review AS ENUM ('pending', 'approved', 'changes_requested'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS user_passwords (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id serial PRIMARY KEY,
  email varchar NOT NULL,
  attempted_at timestamp DEFAULT CURRENT_TIMESTAMP,
  success boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS login_attempts_email_fail_idx ON login_attempts (lower((email)::text), attempted_at DESC) WHERE (success = false);
CREATE INDEX IF NOT EXISTS login_attempts_cleanup_idx ON login_attempts (attempted_at) WHERE (attempted_at IS NOT NULL);

CREATE TABLE IF NOT EXISTS product_categories (
  id serial PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Printer',
  from_price integer NOT NULL DEFAULT 0,
  unit_label text NOT NULL DEFAULT '',
  lead_time text NOT NULL DEFAULT '',
  sizes text[] NOT NULL DEFAULT '{}'::text[],
  stocks text[] NOT NULL DEFAULT '{}'::text[],
  finishes text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  category_id integer REFERENCES product_categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS jobs (
  id serial PRIMARY KEY,
  job_code text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product text NOT NULL,
  size text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  paper text NOT NULL,
  print_sides text NOT NULL,
  colour_mode text NOT NULL,
  finishing text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  needed_by date,
  delivery_method text NOT NULL DEFAULT 'pickup',
  delivery_address text,
  status job_status NOT NULL DEFAULT 'quote_requested',
  quoted_price numeric,
  cost_breakdown jsonb,
  quote_message text,
  artwork_url text,
  artwork_file_name text,
  artwork_checks jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  payment_claimed_at timestamptz,
  artwork_report jsonb,
  artwork_review artwork_review NOT NULL DEFAULT 'pending',
  artwork_review_note text,
  artwork_reviewed_at timestamptz,
  ready_by date,
  feedback_rating smallint CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment text,
  feedback_at timestamptz
);
CREATE INDEX IF NOT EXISTS jobs_customer_idx ON jobs (customer_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status);

CREATE TABLE IF NOT EXISTS job_events (
  id serial PRIMARY KEY,
  job_id integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status job_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_events_job_idx ON job_events (job_id);

CREATE TABLE IF NOT EXISTS job_messages (
  id serial PRIMARY KEY,
  job_id integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id integer NOT NULL REFERENCES users(id),
  is_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_messages_job_id_idx ON job_messages (job_id, created_at);

-- "Forgot password" links (added 2026-10-13). Only a SHA-256 of the emailed token is stored.
CREATE TABLE IF NOT EXISTS password_resets (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id, created_at);

-- Supabase exposes the public schema over its REST API; this app only talks to the database from the
-- server, so lock every table down for the anon/authenticated API roles.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
