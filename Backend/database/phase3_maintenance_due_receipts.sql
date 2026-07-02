-- Phase 3: Maintenance due-date billing + receipts
-- Safe to run multiple times

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS late_fee_per_day DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);

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

UPDATE maintenance_records
SET
  property_id = COALESCE(property_id, house_id),
  late_fee_per_day = COALESCE(late_fee_per_day, late_fee, 0),
  paid_amount = COALESCE(paid_amount, amount_paid, 0),
  due_amount = COALESCE(due_amount, GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0)),
  status = CASE
    WHEN LOWER(COALESCE(status, 'pending')) = 'paid' THEN 'paid'
    WHEN COALESCE(due_amount, GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0)) <= 0 THEN 'paid'
    WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
    ELSE 'pending'
  END;

CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_due_date ON maintenance_records(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_maintenance_id ON payments(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_maintenance_id ON receipts(maintenance_id);

NOTIFY pgrst, 'reload schema';
