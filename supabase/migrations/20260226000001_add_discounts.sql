-- ============================================
-- DISCOUNTS MIGRATION
-- Adds discount codes, usage tracking, and
-- applies discount reference to orders table.
-- ============================================

-- ============================================
-- 1. DISCOUNTS TABLE
-- Stores discount/promo code definitions.
-- Must be created before orders is altered.
-- ============================================

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Always stored UPPER CASE; unique index enforces case-insensitive uniqueness
  code VARCHAR(50) UNIQUE NOT NULL,

  description TEXT,

  -- 'percentage' | 'flat_amount'
  discount_type VARCHAR(20) NOT NULL,
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'flat_amount')),

  -- For 'percentage': 0-100. For 'flat_amount': rupee value.
  discount_value DECIMAL(10, 2) NOT NULL,
  CONSTRAINT positive_discount_value CHECK (discount_value > 0),

  -- Caps rupee savings for percentage codes (e.g. max ₹100 off even if 20% = ₹200)
  max_discount_amount DECIMAL(10, 2),
  CONSTRAINT positive_max_discount CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),

  -- Minimum cart/order amount required to apply this code
  min_order_amount DECIMAL(10, 2) DEFAULT 0.00,

  -- Scope: 'all' | 'subscription' | 'one_time' | 'wallet_recharge'
  applicable_to VARCHAR(20) DEFAULT 'all',
  CONSTRAINT valid_applicable_to CHECK (applicable_to IN ('all', 'subscription', 'one_time', 'wallet_recharge')),

  -- Optional: restrict to a single product
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- NULL = unlimited global uses
  max_uses INTEGER,
  CONSTRAINT positive_max_uses CHECK (max_uses IS NULL OR max_uses > 0),

  -- Denormalized counter maintained by trigger — avoids expensive COUNT() on every validation
  current_uses INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT non_negative_uses CHECK (current_uses >= 0),

  -- How many times a single user can redeem this code (1 = single-use per user)
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT positive_max_uses_per_user CHECK (max_uses_per_user > 0),

  -- Welcome offer flag
  is_first_order_only BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,

  -- NULL = no order-count limit. Set to e.g. 7 to apply discount to
  -- the first 7 deliveries of a subscription, then revert to full price.
  max_discount_orders INTEGER,
  CONSTRAINT positive_max_discount_orders CHECK (max_discount_orders IS NULL OR max_discount_orders > 0),

  valid_from  TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_validity_range CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),

  -- Flexible JSON for future extensions (campaign tags, A/B test group, etc.)
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE discounts IS 'Promo/discount code definitions administered through the backend.';
COMMENT ON COLUMN discounts.code IS 'Always stored and queried in UPPER CASE.';
COMMENT ON COLUMN discounts.current_uses IS 'Denormalized counter kept in sync by trigger on discount_usages.';
COMMENT ON COLUMN discounts.max_discount_amount IS 'Cap on rupee savings for percentage-type codes.';
COMMENT ON COLUMN discounts.metadata IS 'Arbitrary JSON for future use, e.g. campaign tags.';


-- ============================================
-- 2. ALTER ORDERS TABLE
-- Attach discount reference and saved amount.
-- ============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount   DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN orders.discount_code_id IS 'FK to the discount code applied at checkout.';
COMMENT ON COLUMN orders.discount_amount   IS 'Rupee value discounted on this order.';

-- ============================================
-- 2b. ALTER SUBSCRIPTIONS TABLE
-- Store the discount applied at subscription
-- creation time (the source of truth).
-- ============================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount   DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_orders_remaining INTEGER
    CONSTRAINT non_negative_discount_orders CHECK (discount_orders_remaining IS NULL OR discount_orders_remaining >= 0);

COMMENT ON COLUMN subscriptions.discount_code_id IS 'Discount code applied at the time of subscription creation.';
COMMENT ON COLUMN subscriptions.discount_amount IS 'Rupee value discounted at checkout for this subscription.';
COMMENT ON COLUMN subscriptions.discount_orders_remaining IS 'Countdown of discounted deliveries remaining. NULL = no order-count limit. Decremented by the order generation job each time a discounted order is created.';


-- ============================================
-- 3. DISCOUNT_USAGES TABLE
-- One row per redemption; full audit history.
-- Created after orders so order_id FK resolves.
-- ============================================

CREATE TABLE IF NOT EXISTS discount_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE RESTRICT,
  user_id     UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,

  -- NULL for wallet-recharge redemptions
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Actual rupee value saved (may differ from discount_value after caps/rounding)
  discount_amount_applied DECIMAL(10, 2) NOT NULL,
  CONSTRAINT positive_discount_applied CHECK (discount_amount_applied >= 0),

  original_amount DECIMAL(10, 2) NOT NULL,
  final_amount    DECIMAL(10, 2) NOT NULL,

  -- 'applied' → normal; 'reversed' → order cancelled, usage slot released
  status VARCHAR(20) NOT NULL DEFAULT 'applied',
  CONSTRAINT valid_usage_status CHECK (status IN ('applied', 'reversed')),

  applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reversed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE discount_usages IS 'Immutable audit log of every discount code redemption.';
COMMENT ON COLUMN discount_usages.status IS 'Set to "reversed" on order cancellation to release the usage slot.';


-- ============================================
-- 4. INDEXES
-- ============================================

-- Fast case-insensitive lookup during checkout
CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_code         ON discounts(UPPER(code));
CREATE        INDEX IF NOT EXISTS idx_discounts_active_valid ON discounts(is_active, valid_from, valid_until)
  WHERE is_active = true;

-- Usage queries
CREATE INDEX IF NOT EXISTS idx_discount_usages_discount_id ON discount_usages(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_usages_user_id     ON discount_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_usages_order_id    ON discount_usages(order_id);

-- Prevents double-redemption on the same order
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_usage_per_order
  ON discount_usages(order_id)
  WHERE order_id IS NOT NULL AND status = 'applied';

-- Per-user usage count (used inside validate_discount_code)
CREATE INDEX IF NOT EXISTS idx_discount_usages_user_discount
  ON discount_usages(discount_id, user_id)
  WHERE status = 'applied';

-- Quick join from orders back to discounts
CREATE INDEX IF NOT EXISTS idx_orders_discount_code ON orders(discount_code_id)
  WHERE discount_code_id IS NOT NULL;


-- ============================================
-- 5. TRIGGERS
-- ============================================

-- updated_at maintenance
CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_usages_updated_at
  BEFORE UPDATE ON discount_usages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment current_uses when a usage row is inserted
CREATE OR REPLACE FUNCTION increment_discount_uses()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discounts
  SET current_uses = current_uses + 1
  WHERE id = NEW.discount_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_discount_uses
  AFTER INSERT ON discount_usages
  FOR EACH ROW EXECUTE FUNCTION increment_discount_uses();

-- Decrement current_uses when a usage is reversed (order cancelled)
CREATE OR REPLACE FUNCTION decrement_discount_uses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'reversed' AND OLD.status != 'reversed' THEN
    UPDATE discounts
    SET current_uses = GREATEST(current_uses - 1, 0)
    WHERE id = NEW.discount_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_discount_uses
  AFTER UPDATE ON discount_usages
  FOR EACH ROW EXECUTE FUNCTION decrement_discount_uses();


-- ============================================
-- 6. VALIDATION FUNCTION
-- Call from app code before applying a discount.
-- Returns JSON: { valid, error?, discount_id,
--   discount_type, discount_value,
--   discount_amount, final_amount }
-- ============================================

CREATE OR REPLACE FUNCTION validate_discount_code(
  p_code          VARCHAR,
  p_user_id       UUID,
  p_order_amount  DECIMAL,
  p_applicable_to VARCHAR DEFAULT 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- runs with definer rights so RLS doesn't block reads
AS $$
DECLARE
  v_discount     discounts%ROWTYPE;
  v_user_uses    INTEGER;
  v_discount_amt DECIMAL(10, 2);
BEGIN
  -- 1. Find active, in-window discount
  SELECT * INTO v_discount
  FROM discounts
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from  IS NULL OR valid_from  <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired discount code.');
  END IF;

  -- 2. Global usage cap
  IF v_discount.max_uses IS NOT NULL
     AND v_discount.current_uses >= v_discount.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'This discount code has reached its usage limit.');
  END IF;

  -- 3. Per-user usage cap
  SELECT COUNT(*) INTO v_user_uses
  FROM discount_usages
  WHERE discount_id = v_discount.id
    AND user_id     = p_user_id
    AND status      = 'applied';

  IF v_user_uses >= v_discount.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used this discount code.');
  END IF;

  -- 4. Minimum order amount
  IF p_order_amount < v_discount.min_order_amount THEN
    RETURN json_build_object(
      'valid', false,
      'error', format('A minimum order amount of ₹%s is required to use this code.', v_discount.min_order_amount)
    );
  END IF;

  -- 5. Applicability scope
  IF v_discount.applicable_to != 'all'
     AND v_discount.applicable_to != p_applicable_to THEN
    RETURN json_build_object('valid', false, 'error', 'This discount code is not applicable for this order type.');
  END IF;

  -- 6. First-order-only restriction
  IF v_discount.is_first_order_only THEN
    IF EXISTS (
      SELECT 1 FROM orders
      WHERE user_id = p_user_id
        AND status NOT IN ('cancelled', 'failed')
      LIMIT 1
    ) THEN
      RETURN json_build_object('valid', false, 'error', 'This discount code is only valid on your first order.');
    END IF;
  END IF;

  -- 7. Calculate actual discount amount
  IF v_discount.discount_type = 'percentage' THEN
    v_discount_amt := ROUND(p_order_amount * v_discount.discount_value / 100.0, 2);
    IF v_discount.max_discount_amount IS NOT NULL THEN
      v_discount_amt := LEAST(v_discount_amt, v_discount.max_discount_amount);
    END IF;
  ELSE -- flat_amount: cannot discount more than the order itself
    v_discount_amt := LEAST(v_discount.discount_value, p_order_amount);
  END IF;

  RETURN json_build_object(
    'valid',                true,
    'discount_id',          v_discount.id,
    'discount_type',        v_discount.discount_type,
    'discount_value',       v_discount.discount_value,
    'discount_amount',      v_discount_amt,
    'final_amount',         ROUND(p_order_amount - v_discount_amt, 2),
    'max_discount_orders',  v_discount.max_discount_orders
  );
END;
$$;

COMMENT ON FUNCTION validate_discount_code IS
  'Validates a promo code for a given user and order amount. Returns JSON. Safe to call from the app layer before inserting a discount_usage row.';


-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE discounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usages ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active codes (needed for checkout UI)
CREATE POLICY "Anyone can view active discounts"
  ON discounts FOR SELECT
  USING (is_active = true);

-- Writes to discounts are intentionally NOT granted to regular users.
-- Use Supabase service-role key in your admin dashboard / backend Edge Functions.

-- Users can only see their own redemptions
CREATE POLICY "Users can view own discount usages"
  ON discount_usages FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Insert is controlled by the app via service-role after validate_discount_code succeeds.
-- No direct INSERT policy for regular users prevents client-side abuse.
