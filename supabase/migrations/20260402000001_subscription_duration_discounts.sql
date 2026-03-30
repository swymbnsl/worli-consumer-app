-- Migration: Add subscription duration discount settings

-- Create table for subscription duration discounts
CREATE TABLE IF NOT EXISTS subscription_duration_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duration_months INTEGER NOT NULL UNIQUE,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_label VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_duration CHECK (duration_months > 0),
  CONSTRAINT valid_discount CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

COMMENT ON TABLE subscription_duration_discounts IS 'Discount percentages for subscription duration (1, 3, 6 months)';

-- Insert default duration discounts
INSERT INTO subscription_duration_discounts (duration_months, discount_percent, display_label) VALUES
  (1, 0, '1 Month'),
  (3, 5, '3 Months'),
  (6, 10, '6 Months')
ON CONFLICT (duration_months) DO NOTHING;

-- Enable RLS
ALTER TABLE subscription_duration_discounts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
CREATE POLICY "Public read access for duration discounts"
ON subscription_duration_discounts FOR SELECT
USING (true);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to duration discounts"
ON subscription_duration_discounts FOR ALL
USING (current_setting('role') = 'service_role');

-- Auto-update updated_at trigger
CREATE TRIGGER update_subscription_duration_discounts_updated_at
BEFORE UPDATE ON subscription_duration_discounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
