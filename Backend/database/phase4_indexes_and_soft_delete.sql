-- Add indexes for common queries and soft-delete columns

-- Example: add deleted_at column for soft-delete on houses, members, maintenance
ALTER TABLE IF EXISTS houses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS members ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS maintenance ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Example indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_houses_deleted_at ON houses (deleted_at);
CREATE INDEX IF NOT EXISTS idx_members_deleted_at ON members (deleted_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_deleted_at ON maintenance (deleted_at);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_houses_active ON houses (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_active ON members (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_active ON maintenance (id) WHERE deleted_at IS NULL;

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs (created_at);

-- Add example foreign key indexes (adjust table/column names per schema)
CREATE INDEX IF NOT EXISTS idx_maintenance_house_id ON maintenance (house_id);
CREATE INDEX IF NOT EXISTS idx_members_house_id ON members (house_id);
