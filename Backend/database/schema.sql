-- UrbanVista Database Schema for Supabase
-- Run this SQL in Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- Admin Users Table
-- ========================
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

-- ========================
-- Houses Table
-- ========================
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

-- ========================
-- Members Table
-- ========================
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

-- ========================
-- Vehicles Table
-- ========================
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

-- ========================
-- Maintenance Records Table
-- ========================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  house_number VARCHAR(50),
  owner_name VARCHAR(255),
  from_month VARCHAR(20),
  to_month VARCHAR(20),
  base_amount DECIMAL(10,2) DEFAULT 0,
  late_fee DECIMAL(10,2) DEFAULT 0,
  extra_charges DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'UPI' CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'Overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- Expenditures Table
-- ========================
CREATE TABLE IF NOT EXISTS expenditures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'Other' CHECK (category IN ('Utilities', 'Maintenance', 'Security', 'Cleaning', 'Admin', 'Other')),
  amount DECIMAL(10,2) NOT NULL,
  payment_mode VARCHAR(50) DEFAULT 'UPI' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- Enable Row Level Security (RLS)
-- ========================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenditures ENABLE ROW LEVEL SECURITY;

-- ========================
-- RLS Policies (Allow all for authenticated users via service key)
-- For production, you'd want more restrictive policies
-- ========================
CREATE POLICY "Allow all for admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all for houses" ON houses FOR ALL USING (true);
CREATE POLICY "Allow all for members" ON members FOR ALL USING (true);
CREATE POLICY "Allow all for vehicles" ON vehicles FOR ALL USING (true);
CREATE POLICY "Allow all for maintenance_records" ON maintenance_records FOR ALL USING (true);
CREATE POLICY "Allow all for expenditures" ON expenditures FOR ALL USING (true);

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
