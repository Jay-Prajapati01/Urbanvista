-- UrbanVista Database Schema for Supabase
-- Run this SQL in Supabase SQL Editor to create all required tables
-- IMPORTANT: After running this script, the PostgREST schema cache will refresh automatically

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- STEP 1: Create Tables (in dependency order)
-- ========================

-- Houses Table (no dependencies)
CREATE TABLE IF NOT EXISTS houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block VARCHAR(50) NOT NULL,
  house_number VARCHAR(50) NOT NULL,
  floor INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
  owner_name VARCHAR(255),
  owner_contact VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(block, house_number)
);

-- Members Table (depends on houses)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  house_number VARCHAR(50),
  role VARCHAR(20) DEFAULT 'Family' CHECK (role IN ('Owner', 'Tenant', 'Family')),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Users Table (no dependencies)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (name, email, password_hash)
VALUES ('Admin User', 'admin@urbanvista.com', '$2a$10$rQnXGT6dGx8Kc4M4xGqOXOJH9.z1pqWqC8kM6EXnVTXzEb3EzS6mu')
ON CONFLICT (email) DO NOTHING;

-- Vehicles Table (depends on houses)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_number VARCHAR(50) NOT NULL,
  type VARCHAR(20) DEFAULT 'Four Wheeler' CHECK (type IN ('Two Wheeler', 'Four Wheeler')),
  color VARCHAR(50),
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  house_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Records Table (depends on houses)
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  user_id UUID,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  house_number VARCHAR(50),
  owner_name VARCHAR(255),
  from_month VARCHAR(20),
  to_month VARCHAR(20),
  base_amount DECIMAL(10,2) DEFAULT 0,
  late_fee_per_day DECIMAL(10,2) DEFAULT 0,
  late_fee DECIMAL(10,2) DEFAULT 0,
  extra_charges DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'UPI' CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial', 'overdue', 'Paid', 'Pending', 'Overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenditures Table (supports optional house scoping)
CREATE TABLE IF NOT EXISTS expenditures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL DEFAULT 'Expense',
  category VARCHAR(50) DEFAULT 'Other' CHECK (category IN ('Utilities', 'Maintenance', 'Security', 'Cleaning', 'Admin', 'Other')),
  amount DECIMAL(10,2) NOT NULL,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  vendor VARCHAR(255),
  payment_mode VARCHAR(50) DEFAULT 'UPI' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenditures_house_id ON expenditures(house_id);

-- Users Table (Resident Accounts) - depends on houses and members
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

-- Payments Table (Razorpay Transactions) - depends on users and maintenance_records
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  order_id VARCHAR(255),
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

-- Receipts table (depends on users, maintenance_records, payments)
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  receipt_number VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- STEP 2: Enable Row Level Security (RLS)
-- ========================
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- ========================
-- STEP 3: Create RLS Policies
-- ========================
DROP POLICY IF EXISTS "Allow all for houses" ON houses;
DROP POLICY IF EXISTS "Allow all for members" ON members;
DROP POLICY IF EXISTS "Allow all for admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow all for vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow all for maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "Allow all for expenditures" ON expenditures;
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for payments" ON payments;
DROP POLICY IF EXISTS "Allow all for receipts" ON receipts;

CREATE POLICY "Allow all for houses" ON houses FOR ALL USING (true);
CREATE POLICY "Allow all for members" ON members FOR ALL USING (true);
CREATE POLICY "Allow all for admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all for vehicles" ON vehicles FOR ALL USING (true);
CREATE POLICY "Allow all for maintenance_records" ON maintenance_records FOR ALL USING (true);
CREATE POLICY "Allow all for expenditures" ON expenditures FOR ALL USING (true);
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for receipts" ON receipts FOR ALL USING (true);

-- ========================
-- STEP 4: Refresh PostgREST Schema Cache
-- This ensures the new tables are immediately available via the API
-- ========================
NOTIFY pgrst, 'reload schema';

-- ========================
-- STEP 5: Verify tables exist (for debugging)
-- ========================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ========================
-- Sample Data (Optional)
-- ========================
-- Uncomment below to add sample houses
/*
INSERT INTO houses (block, house_number, floor, status, owner_name, owner_contact) VALUES
  ('A', 'A-101', 1, 'occupied', 'John Doe', '+91 98765 43210'),
  ('A', 'A-102', 1, 'occupied', 'Jane Smith', '+91 98765 43211'),
  ('A', 'A-201', 2, 'vacant', NULL, NULL),
  ('B', 'B-101', 1, 'occupied', 'Bob Wilson', '+91 98765 43212'),
  ('B', 'B-102', 1, 'maintenance', 'Alice Brown', '+91 98765 43213');
*/
