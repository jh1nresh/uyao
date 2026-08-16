CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 160),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 160),
  timezone text NOT NULL DEFAULT 'Asia/Taipei',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  password_hash text NOT NULL CHECK (password_hash ~ '^scrypt\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{32,}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_users_email_lower_idx
  ON store_users (lower(email));

CREATE TABLE IF NOT EXISTS pharmacy_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES store_users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, user_id)
);

CREATE INDEX IF NOT EXISTS pharmacy_memberships_user_idx
  ON pharmacy_memberships (user_id, status);

CREATE TABLE IF NOT EXISTS pharmacy_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by text NOT NULL DEFAULT 'store_admin_api',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (NOT (consumed_at IS NOT NULL AND revoked_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS pharmacy_invites_lookup_idx
  ON pharmacy_invites (pharmacy_id, lower(email), expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
