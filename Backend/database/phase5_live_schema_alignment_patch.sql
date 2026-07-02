-- Phase 5: Live Supabase schema alignment patch
-- Purpose: patch currently missing objects/columns detected by verify:schema
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES houses(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  receipt_number VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for receipts" ON receipts;
CREATE POLICY "Allow all for receipts" ON receipts FOR ALL USING (true);

ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE SET NULL;

ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS vendor VARCHAR(255);

ALTER TABLE expenditures
  ALTER COLUMN title SET DEFAULT 'Expense';

CREATE INDEX IF NOT EXISTS idx_payments_maintenance_id ON payments(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_maintenance_id ON receipts(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_expenditures_house_id ON expenditures(house_id);

NOTIFY pgrst, 'reload schema';
