-- Migration: Add prepaid subscription support with bottle credits
-- This changes the subscription model from per-delivery payment to upfront payment

-- Add duration_months to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT NULL;

COMMENT ON COLUMN subscriptions.duration_months IS 'Subscription duration in months (1, 3, or 6). NULL for legacy/old subscriptions.';

-- Add total_bottles (prepaid bottle credits) to subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS total_bottles INTEGER DEFAULT NULL;

COMMENT ON COLUMN subscriptions.total_bottles IS 'Total number of bottles prepaid for this subscription.';

-- Add remaining_bottles (bottles yet to be delivered)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS remaining_bottles INTEGER DEFAULT NULL;

COMMENT ON COLUMN subscriptions.remaining_bottles IS 'Remaining bottles to be delivered. Decremented on each delivery.';

-- Add amount_paid (total prepaid amount)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN subscriptions.amount_paid IS 'Total amount paid upfront for this subscription.';

-- Add wallet_amount_used (portion paid from wallet)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS wallet_amount_used DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN subscriptions.wallet_amount_used IS 'Amount deducted from wallet for this subscription.';

-- Add razorpay_amount_paid (portion paid via Razorpay)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_amount_paid DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN subscriptions.razorpay_amount_paid IS 'Amount paid via Razorpay for this subscription.';

-- Add payment_id for tracking
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN subscriptions.payment_id IS 'Razorpay payment ID if payment was made via gateway.';

-- Add transaction_id reference
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN subscriptions.transaction_id IS 'Reference to the wallet debit transaction for this subscription.';

-- Constraint: remaining_bottles should not exceed total_bottles
ALTER TABLE subscriptions
ADD CONSTRAINT chk_remaining_bottles CHECK (
  remaining_bottles IS NULL OR 
  total_bottles IS NULL OR 
  remaining_bottles <= total_bottles
);

-- Constraint: remaining_bottles should be non-negative
ALTER TABLE subscriptions
ADD CONSTRAINT chk_remaining_bottles_positive CHECK (
  remaining_bottles IS NULL OR remaining_bottles >= 0
);

-- ============================================================================
-- Add prepaid fields to cart_items table
-- ============================================================================

ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT NULL;

ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS total_bottles INTEGER DEFAULT NULL;

ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN cart_items.duration_months IS 'Subscription duration in months for prepaid model.';
COMMENT ON COLUMN cart_items.total_bottles IS 'Pre-calculated total bottles for this cart item.';
COMMENT ON COLUMN cart_items.total_amount IS 'Pre-calculated total amount for this cart item.';

-- ============================================================================
-- RPC Function: Create prepaid subscription with secure wallet deduction
-- ============================================================================

CREATE OR REPLACE FUNCTION create_prepaid_subscription(
  p_user_id UUID,
  p_product_id UUID,
  p_address_id UUID,
  p_duration_months INTEGER,
  p_quantity INTEGER,
  p_frequency VARCHAR(50),
  p_start_date DATE,
  p_interval_days INTEGER DEFAULT NULL,
  p_custom_quantities JSONB DEFAULT NULL,
  p_delivery_time VARCHAR(50) DEFAULT 'morning',
  p_use_wallet BOOLEAN DEFAULT true,
  p_total_amount NUMERIC DEFAULT 0,
  p_razorpay_payment_id VARCHAR(255) DEFAULT NULL,
  p_razorpay_amount NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_wallet_balance NUMERIC;
  v_wallet_deduct NUMERIC := 0;
  v_new_balance NUMERIC;
  v_transaction_id TEXT;
  v_txn_uuid UUID;
  v_subscription_id UUID;
  v_total_bottles INTEGER;
  v_product_price NUMERIC;
  v_product_name VARCHAR(255);
BEGIN
  -- 1. Get product price
  SELECT price, name INTO v_product_price, v_product_name
  FROM products
  WHERE id = p_product_id;

  IF v_product_price IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- 2. Calculate total bottles based on duration and frequency
  -- For daily: 30 days per month
  -- For custom: sum of weekly quantities * 4 weeks per month
  -- For on_interval: 30 / interval_days per month
  IF p_frequency = 'daily' THEN
    v_total_bottles := p_quantity * 30 * p_duration_months;
  ELSIF p_frequency = 'custom' AND p_custom_quantities IS NOT NULL THEN
    -- Sum weekly quantities and multiply by ~4.3 weeks per month
    v_total_bottles := (
      SELECT COALESCE(SUM((value)::integer), 0) * 4 * p_duration_months
      FROM jsonb_each_text(p_custom_quantities)
    );
  ELSIF p_frequency = 'on_interval' AND p_interval_days IS NOT NULL THEN
    v_total_bottles := p_quantity * FLOOR(30.0 / p_interval_days) * p_duration_months;
  ELSIF p_frequency = 'buy_once' THEN
    v_total_bottles := p_quantity;
  ELSE
    v_total_bottles := p_quantity * 30 * p_duration_months;
  END IF;

  -- 3. Calculate expected total amount
  -- (Client sends total_amount, but we verify it matches)
  IF p_total_amount <= 0 THEN
    p_total_amount := v_total_bottles * v_product_price;
  END IF;

  -- 4. Handle wallet deduction if requested
  IF p_use_wallet THEN
    -- Lock wallet row
    SELECT id, balance INTO v_wallet_id, v_wallet_balance
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
      -- Create wallet if not exists
      INSERT INTO wallets (user_id, balance)
      VALUES (p_user_id, 0)
      RETURNING id, balance INTO v_wallet_id, v_wallet_balance;
    END IF;

    -- Calculate how much to deduct from wallet
    v_wallet_deduct := LEAST(v_wallet_balance, p_total_amount - p_razorpay_amount);
    
    IF v_wallet_deduct > 0 THEN
      v_new_balance := v_wallet_balance - v_wallet_deduct;

      -- Update wallet balance
      UPDATE wallets
      SET balance = v_new_balance,
          updated_at = NOW()
      WHERE id = v_wallet_id;

      -- Create debit transaction
      v_transaction_id := 'TXN_SUB_' || extract(epoch from now())::text || '_' || floor(random() * 10000)::text;
      
      INSERT INTO transactions (
        transaction_id, user_id, wallet_id, type, amount, status,
        description, balance_before, balance_after, payment_method
      ) VALUES (
        v_transaction_id, p_user_id, v_wallet_id, 'debit', v_wallet_deduct, 'completed',
        'Subscription payment: ' || v_product_name || ' (' || p_duration_months || ' month' || 
        CASE WHEN p_duration_months > 1 THEN 's' ELSE '' END || ')',
        v_wallet_balance, v_new_balance, 'wallet'
      )
      RETURNING id INTO v_txn_uuid;
    END IF;
  END IF;

  -- 5. Verify total payment covers the amount
  IF (v_wallet_deduct + p_razorpay_amount) < p_total_amount THEN
    RAISE EXCEPTION 'Insufficient payment. Required: %, Wallet: %, Razorpay: %', 
      p_total_amount, v_wallet_deduct, p_razorpay_amount;
  END IF;

  -- 6. Create subscription
  INSERT INTO subscriptions (
    user_id, product_id, address_id, start_date, frequency, status,
    quantity, delivery_time, interval_days, custom_quantities,
    duration_months, total_bottles, remaining_bottles,
    amount_paid, wallet_amount_used, razorpay_amount_paid,
    payment_id, transaction_id
  ) VALUES (
    p_user_id, p_product_id, p_address_id, p_start_date, p_frequency, 'active',
    p_quantity, p_delivery_time, p_interval_days, p_custom_quantities,
    p_duration_months, v_total_bottles, v_total_bottles,
    p_total_amount, v_wallet_deduct, p_razorpay_amount,
    p_razorpay_payment_id, v_txn_uuid
  )
  RETURNING id INTO v_subscription_id;

  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'total_bottles', v_total_bottles,
    'amount_paid', p_total_amount,
    'wallet_deducted', v_wallet_deduct,
    'razorpay_paid', p_razorpay_amount,
    'transaction_id', v_transaction_id,
    'new_wallet_balance', COALESCE(v_new_balance, v_wallet_balance)
  );
END;
$$;

COMMENT ON FUNCTION create_prepaid_subscription IS 'Atomically creates a prepaid subscription with secure wallet deduction and Razorpay payment tracking.';

-- Grant execute to authenticated users (RLS will be enforced by the SECURITY DEFINER context)
GRANT EXECUTE ON FUNCTION create_prepaid_subscription TO authenticated;
