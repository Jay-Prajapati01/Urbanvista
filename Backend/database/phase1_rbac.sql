-- UrbanVista Phase 1 RBAC migration
-- Run this after schema.sql in Supabase SQL editor

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('admin', 'secretary');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active', 'disabled', 'locked');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
    CREATE TYPE assignment_type AS ENUM ('flat', 'block');
  END IF;
END$$;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS assigned_blocks TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username_unique ON admin_users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_users_role_status ON admin_users(role, status);
CREATE INDEX IF NOT EXISTS idx_admin_users_assigned_blocks_gin ON admin_users USING GIN (assigned_blocks);

UPDATE admin_users SET role = 'admin' WHERE role IS NULL;
UPDATE admin_users SET status = 'active' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS secretary_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secretary_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(20) NOT NULL,
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  block VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  assigned_by_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_secretary_assignments_user_active
  ON secretary_assignments(secretary_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_secretary_assignments_house_active
  ON secretary_assignments(house_id, is_active);
CREATE INDEX IF NOT EXISTS idx_secretary_assignments_block_active
  ON secretary_assignments(block, is_active);

UPDATE secretary_assignments sa
SET
  assignment_type = 'block',
  block = h.block,
  house_id = NULL
FROM houses h
WHERE sa.assignment_type = 'flat'
  AND sa.house_id = h.id
  AND h.block IS NOT NULL;

UPDATE admin_users au
SET assigned_blocks = COALESCE(src.blocks, '{}'::TEXT[])
FROM (
  SELECT
    secretary_user_id,
    ARRAY_AGG(DISTINCT UPPER(TRIM(block))) FILTER (WHERE block IS NOT NULL AND TRIM(block) <> '') AS blocks
  FROM secretary_assignments
  WHERE is_active = true
  GROUP BY secretary_user_id
) src
WHERE au.id = src.secretary_user_id;

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  device_fingerprint TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_role VARCHAR(20),
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id UUID,
  before_state JSONB,
  after_state JSONB,
  scope_context JSONB,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_time ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource_time ON audit_logs(resource_type, resource_id, created_at DESC);

CREATE TABLE IF NOT EXISTS settlement_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_type VARCHAR(20) NOT NULL,
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  block VARCHAR(50),
  period_start DATE,
  period_end DATE,
  title TEXT,
  notes TEXT,
  collected_amount NUMERIC(14, 2) DEFAULT 0,
  expended_amount NUMERIC(14, 2) DEFAULT 0,
  handover_amount NUMERIC(14, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  submitted_by_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_by_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_batches_scope_status
  ON settlement_batches(scope_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_house_period
  ON settlement_batches(house_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_block_period
  ON settlement_batches(block, period_start, period_end);

CREATE TABLE IF NOT EXISTS settlement_batch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_batch_id UUID NOT NULL REFERENCES settlement_batches(id) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL,
  reference_table VARCHAR(80),
  reference_id UUID,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  amount NUMERIC(14, 2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_batch_items_batch
  ON settlement_batch_items(settlement_batch_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_settlement_batch_items_house
  ON settlement_batch_items(house_id);

ALTER TABLE settlement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_batch_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for settlement_batches" ON settlement_batches;
DROP POLICY IF EXISTS "Allow all for settlement_batch_items" ON settlement_batch_items;

CREATE POLICY "Allow all for settlement_batches" ON settlement_batches FOR ALL USING (true);
CREATE POLICY "Allow all for settlement_batch_items" ON settlement_batch_items FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  username_or_email VARCHAR(255),
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretary_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for secretary_assignments" ON secretary_assignments;
DROP POLICY IF EXISTS "Allow all for auth_refresh_tokens" ON auth_refresh_tokens;
DROP POLICY IF EXISTS "Allow all for audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow all for login_attempts" ON login_attempts;

CREATE POLICY "Allow all for secretary_assignments" ON secretary_assignments FOR ALL USING (true);
CREATE POLICY "Allow all for auth_refresh_tokens" ON auth_refresh_tokens FOR ALL USING (true);
CREATE POLICY "Allow all for audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all for login_attempts" ON login_attempts FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
