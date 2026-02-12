-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Addresses Table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'Home',
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  landmark VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_default BOOLEAN DEFAULT false,
  delivery_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  volume VARCHAR(50),
  price DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 0.00,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  address_id UUID REFERENCES addresses(id),
  start_date DATE NOT NULL,
  end_date DATE,
  frequency VARCHAR(50) DEFAULT 'daily',
  status VARCHAR(50) DEFAULT 'active',
  quantity INTEGER DEFAULT 1,
  delivery_time VARCHAR(50) DEFAULT 'morning',
  interval_days INTEGER,
  custom_quantities JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'custom', 'on_interval', 'buy_once')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'cancelled', 'completed'))
);

-- Add comments for documentation
COMMENT ON COLUMN subscriptions.interval_days IS 'For on_interval frequency mode: number of days between deliveries (2-30)';
COMMENT ON COLUMN subscriptions.custom_quantities IS 'For custom frequency mode: JSON object with per-day quantities, e.g. {"0": 2, "1": 1, "2": 0, ...} where keys are weekday indexes (0=Sunday, 6=Saturday)';

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  product_id UUID REFERENCES products(id),
  delivery_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  quantity INTEGER DEFAULT 1,
  amount DECIMAL(10, 2),
  address_id UUID REFERENCES addresses(id),
  delivery_notes TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'on_hold', 'cancelled', 'failed'))
);

-- Bottle Returns Table
CREATE TABLE bottle_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  return_date DATE,
  quantity INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending',
  collected_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'requested', 'collected', 'completed', 'cancelled'))
);

-- Wallets Table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  low_balance_threshold DECIMAL(10, 2) DEFAULT 100.00,
  auto_recharge_enabled BOOLEAN DEFAULT false,
  auto_recharge_amount DECIMAL(10, 2),
  auto_recharge_trigger_amount DECIMAL(10, 2),
  razorpay_customer_id VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id),
  order_id UUID REFERENCES orders(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  description TEXT,
  payment_method VARCHAR(50),
  payment_gateway_id VARCHAR(255),
  payment_gateway_response JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('credit', 'debit', 'refund', 'adjustment')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Offers/Creatives Table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  offer_type VARCHAR(50),
  discount_percentage DECIMAL(5, 2),
  discount_amount DECIMAL(10, 2),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_language CHECK (language IN ('en', 'hi', 'kn'))
);

-- Referrals Table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES users(id),
  reward_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  rewarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'expired', 'cancelled'))
);

-- Subscription Holds Table
CREATE TABLE subscription_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Delivery Preferences Table
CREATE TABLE delivery_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preference_type VARCHAR(100),
  ring_doorbell BOOLEAN DEFAULT true,
  leave_at_door BOOLEAN DEFAULT false,
  hand_delivery BOOLEAN DEFAULT false,
  special_instructions TEXT,
  preferred_delivery_time VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAQ Table
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Tickets Table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Settings Table (Global settings)
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for better query performance
-- ============================================

-- Users indexes
CREATE INDEX idx_users_phone ON users(phone_number);

-- Addresses indexes
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_default ON addresses(user_id, is_default);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id, status) WHERE status = 'active';

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_subscription_id ON orders(subscription_id);
CREATE INDEX idx_orders_user_delivery ON orders(user_id, delivery_date DESC);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type_status ON transactions(type, status);

-- Bottle Returns indexes
CREATE INDEX idx_bottle_returns_user_id ON bottle_returns(user_id);
CREATE INDEX idx_bottle_returns_status ON bottle_returns(status);
CREATE INDEX idx_bottle_returns_order_id ON bottle_returns(order_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Wallets indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bottle_returns_updated_at BEFORE UPDATE ON bottle_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_holds_updated_at BEFORE UPDATE ON subscription_holds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_preferences_updated_at BEFORE UPDATE ON delivery_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users: Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Addresses: Users can manage their own addresses
CREATE POLICY "Users can view own addresses" ON addresses FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own addresses" ON addresses FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own addresses" ON addresses FOR DELETE USING (auth.uid()::text = user_id::text);

-- Subscriptions: Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Orders: Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid()::text = user_id::text);

-- Bottle Returns: Users can manage their own returns
CREATE POLICY "Users can view own bottle returns" ON bottle_returns FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own bottle returns" ON bottle_returns FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own bottle returns" ON bottle_returns FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Wallets: Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own wallet" ON wallets FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid()::text = user_id::text);

-- User Preferences: Users can manage their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Delivery Preferences: Users can manage their own preferences
CREATE POLICY "Users can view own delivery preferences" ON delivery_preferences FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own delivery preferences" ON delivery_preferences FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own delivery preferences" ON delivery_preferences FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Support Tickets: Users can view and create their own tickets
CREATE POLICY "Users can view own support tickets" ON support_tickets FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own support tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Products and Offers: Public read access
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active offers" ON offers FOR SELECT USING (is_active = true);

-- FAQs: Public read access
CREATE POLICY "Anyone can view active FAQs" ON faqs FOR SELECT USING (is_active = true);

-- App Settings: Public read access
CREATE POLICY "Anyone can view app settings" ON app_settings FOR SELECT USING (true);

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default product (500ml milk bottle)
INSERT INTO products (name, description, volume, price, deposit_amount, image_url, is_active)
VALUES 
('Fresh Milk 500ml', 'Farm fresh organic milk delivered daily in glass bottles', '500ml', 30.00, 50.00, 'https://placeholder-url.com/milk-bottle.jpg', true);

-- Insert some app settings
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES 
('order_modification_cutoff_time', '19:00', 'Time after which orders cannot be modified for next day (24-hour format)'),
('min_wallet_balance', '100', 'Minimum wallet balance required'),
('max_unreturned_bottles', '5', 'Maximum number of unreturned bottles allowed'),
('referral_reward_amount', '50', 'Reward amount for successful referrals'),
('delivery_charge', '0', 'Delivery charge per order');

-- Insert sample FAQs
INSERT INTO faqs (question, answer, category, language, display_order, is_active)
VALUES 
('How do I pause my subscription?', 'You can pause your subscription from the Subscriptions tab. Go to your active subscription and select "Pause Subscription". Choose the dates you want to pause for.', 'Subscription', 'en', 1, true),
('What is the bottle deposit?', 'A refundable deposit of ₹50 is charged for each glass bottle. This will be refunded when you return the bottle.', 'Billing', 'en', 2, true),
('How do I add money to my wallet?', 'Go to the Wallet tab and click on "Recharge". You can add money using UPI, card, or net banking.', 'Wallet', 'en', 3, true),
('Can I change my delivery address?', 'Yes, you can change your delivery address from Account > Manage Addresses. Make sure to update it before 7 PM for next day delivery.', 'Delivery', 'en', 4, true);

-- Add missing INSERT policy for users table
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Add missing INSERT policy for wallets table  
CREATE POLICY "Users can insert own wallet" ON wallets FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);