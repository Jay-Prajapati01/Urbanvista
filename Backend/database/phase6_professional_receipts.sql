-- Phase 6: Professional maintenance receipt metadata
-- Safe to run multiple times

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS pdf_reference TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS block_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS house_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS resident_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS from_month VARCHAR(50),
  ADD COLUMN IF NOT EXISTS to_month VARCHAR(50),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS receipt_title VARCHAR(120) DEFAULT 'Maintenance Receipt';

CREATE INDEX IF NOT EXISTS idx_receipts_resident_id ON receipts(resident_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_status ON receipts(payment_status);
CREATE INDEX IF NOT EXISTS idx_receipts_generated_at ON receipts(generated_at);

NOTIFY pgrst, 'reload schema';
