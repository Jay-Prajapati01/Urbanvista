-- Activity Tracking Tables for UrbanVista
-- Run this SQL in Supabase SQL Editor to create activity tracking functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- Activity Logs Table (tracks all CRUD operations)
-- ========================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_role VARCHAR(50) DEFAULT 'admin',
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(100),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ========================
-- Login History Table (tracks login/logout activity)
-- ========================
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_role VARCHAR(50) DEFAULT 'admin',
  block VARCHAR(50),
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_time TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(100),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
  failure_reason VARCHAR(255),
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status);
CREATE INDEX IF NOT EXISTS idx_login_history_block ON login_history(block);

-- ========================
-- Payment Transactions Table (tracks all payment activity per secretary)
-- ========================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  secretary_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  secretary_name VARCHAR(255),
  maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  house_number VARCHAR(50),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(512),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_secretary_id ON payment_transactions(secretary_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_house_id ON payment_transactions(house_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- ========================
-- Notifications Table (for real-time notifications)
-- ========================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'payment', 'login', 'crud')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ========================
-- Secretary Activity Summary (aggregated stats per secretary)
-- ========================
CREATE TABLE IF NOT EXISTS secretary_activity_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secretary_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_logins INTEGER DEFAULT 0,
  total_logouts INTEGER DEFAULT 0,
  total_houses_managed INTEGER DEFAULT 0,
  total_members_added INTEGER DEFAULT 0,
  total_members_updated INTEGER DEFAULT 0,
  total_members_deleted INTEGER DEFAULT 0,
  total_vehicles_added INTEGER DEFAULT 0,
  total_maintenance_created INTEGER DEFAULT 0,
  total_maintenance_updated INTEGER DEFAULT 0,
  total_payments_collected INTEGER DEFAULT 0,
  total_payment_amount DECIMAL(12,2) DEFAULT 0,
  total_expenditures_added INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(secretary_id, date)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_secretary_activity_secretary_id ON secretary_activity_summary(secretary_id);
CREATE INDEX IF NOT EXISTS idx_secretary_activity_date ON secretary_activity_summary(date DESC);

-- ========================
-- Enable Row Level Security
-- ========================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretary_activity_summary ENABLE ROW LEVEL SECURITY;

-- ========================
-- Create RLS Policies (admin gets full access)
-- ========================
DROP POLICY IF EXISTS "Admin full access to activity_logs" ON activity_logs;
CREATE POLICY "Admin full access to activity_logs" ON activity_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access to login_history" ON login_history;
CREATE POLICY "Admin full access to login_history" ON login_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access to payment_transactions" ON payment_transactions;
CREATE POLICY "Admin full access to payment_transactions" ON payment_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access to notifications" ON notifications;
CREATE POLICY "Admin full access to notifications" ON notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access to secretary_activity_summary" ON secretary_activity_summary;
CREATE POLICY "Admin full access to secretary_activity_summary" ON secretary_activity_summary FOR ALL USING (true);

-- ========================
-- Refresh PostgREST Schema Cache
-- ========================
NOTIFY pgrst, 'reload schema';

-- ========================
-- Trigger function to update secretary_activity_summary
-- ========================
CREATE OR REPLACE FUNCTION update_secretary_activity_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_date DATE;
  v_action_category TEXT;
BEGIN
  v_date := CURRENT_DATE;
  
  -- Determine action category based on action name
  v_action_category := SPLIT_PART(TG_TABLE_NAME, '_', 1);
  
  -- Insert or update summary
  INSERT INTO secretary_activity_summary (
    secretary_id, date,
    total_logins, total_logouts,
    total_members_added, total_members_updated, total_members_deleted,
    total_vehicles_added,
    total_maintenance_created, total_maintenance_updated,
    total_payments_collected, total_payment_amount,
    total_expenditures_added
  )
  VALUES (
    NEW.user_id, v_date,
    CASE WHEN NEW.action = 'login_success' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'logout' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'member.create' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'member.update' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'member.delete' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'vehicle.create' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'maintenance.create' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'maintenance.update' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'payment.success' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'payment.success' THEN (NEW.new_value->>'amount')::DECIMAL ELSE 0 END,
    CASE WHEN NEW.action = 'expenditure.create' THEN 1 ELSE 0 END
  )
  ON CONFLICT (secretary_id, date) DO UPDATE SET
    total_logins = secretary_activity_summary.total_logins + EXCLUDED.total_logins,
    total_logouts = secretary_activity_summary.total_logouts + EXCLUDED.total_logouts,
    total_members_added = secretary_activity_summary.total_members_added + EXCLUDED.total_members_added,
    total_members_updated = secretary_activity_summary.total_members_updated + EXCLUDED.total_members_updated,
    total_members_deleted = secretary_activity_summary.total_members_deleted + EXCLUDED.total_members_deleted,
    total_vehicles_added = secretary_activity_summary.total_vehicles_added + EXCLUDED.total_vehicles_added,
    total_maintenance_created = secretary_activity_summary.total_maintenance_created + EXCLUDED.total_maintenance_created,
    total_maintenance_updated = secretary_activity_summary.total_maintenance_updated + EXCLUDED.total_maintenance_updated,
    total_payments_collected = secretary_activity_summary.total_payments_collected + EXCLUDED.total_payments_collected,
    total_payment_amount = secretary_activity_summary.total_payment_amount + EXCLUDED.total_payment_amount,
    total_expenditures_added = secretary_activity_summary.total_expenditures_added + EXCLUDED.total_expenditures_added,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- Trigger for activity_logs to update secretary_activity_summary
-- ========================
DROP TRIGGER IF EXISTS trg_activity_logs_update_summary ON activity_logs;
CREATE TRIGGER trg_activity_logs_update_summary
AFTER INSERT ON activity_logs
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL AND NEW.user_role = 'secretary')
EXECUTE FUNCTION update_secretary_activity_summary();

-- ========================
-- Sample Queries for Testing
-- ========================
-- SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM login_history ORDER BY login_time DESC LIMIT 10;
-- SELECT * FROM notifications WHERE is_read = false ORDER BY created_at DESC;
-- SELECT * FROM secretary_activity_summary ORDER BY date DESC;
