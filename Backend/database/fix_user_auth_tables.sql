-- Fix for resident signup/login error:
-- "Could not find the table 'public.users' in the schema cache"
--
-- Run this entire script in Supabase SQL Editor for your active project.
-- If your project is brand new, run Backend/database/schema.sql first.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(50),
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(512),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for payments" ON payments;

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for payments" ON payments FOR ALL USING (true);

-- Refresh PostgREST schema cache so new tables are visible immediately.
NOTIFY pgrst, 'reload schema';

-- Optional verification:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'payments');
