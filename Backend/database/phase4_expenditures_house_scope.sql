-- Add house-scoped expenditure support for secretary workflows
-- Run this migration against existing Supabase databases where expenditures.house_id is missing.

ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE SET NULL;

ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS vendor VARCHAR(255);

ALTER TABLE expenditures
  ALTER COLUMN title SET DEFAULT 'Expense';

CREATE INDEX IF NOT EXISTS idx_expenditures_house_id ON expenditures(house_id);

NOTIFY pgrst, 'reload schema';