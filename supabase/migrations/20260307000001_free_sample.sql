-- ============================================
-- FREE SAMPLE FEATURE
-- ============================================

-- 1. free_sample_config table (single admin-configurable row)
CREATE TABLE free_sample_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_per_day INTEGER NOT NULL DEFAULT 1,
  trial_days INTEGER NOT NULL DEFAULT 3,
  delivery_time VARCHAR(50) NOT NULL DEFAULT 'morning',
  description TEXT,
  banner_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT positive_quantity CHECK (quantity_per_day > 0),
  CONSTRAINT positive_trial_days CHECK (trial_days > 0 AND trial_days <= 30)
);

COMMENT ON TABLE free_sample_config IS 'Single-row admin config for the free sample / trial feature.';

-- Auto-manage updated_at
CREATE TRIGGER update_free_sample_config_updated_at
  BEFORE UPDATE ON free_sample_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Add claimed_free_sample column to users
ALTER TABLE users
  ADD COLUMN claimed_free_sample BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.claimed_free_sample IS 'Set to true once the user has claimed their free sample. Enforced atomically by claim_free_sample().';

-- 3. RLS on free_sample_config: public read, no client writes
ALTER TABLE free_sample_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view free sample config"
  ON free_sample_config FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies → only service_role / SECURITY DEFINER can write.

-- 4. Seed a default config row (using the existing 500ml product)
INSERT INTO free_sample_config (is_enabled, product_id, quantity_per_day, trial_days, delivery_time, description)
SELECT
  true,
  p.id,
  1,
  3,
  'morning',
  'Try our farm-fresh milk free for 3 days! 1 bottle (500ml) delivered daily.'
FROM products p
WHERE p.name = 'Fresh Milk 500ml' AND p.is_active = true
LIMIT 1;

-- ============================================
-- CLAIM FREE SAMPLE — SECURITY DEFINER FUNCTION
-- ============================================
-- Called via supabase.rpc('claim_free_sample', { p_dates: ['2026-03-08', ...], p_address_id: '...' })
-- Atomically validates, creates orders, and marks the user as claimed.

CREATE OR REPLACE FUNCTION claim_free_sample(p_dates DATE[], p_address_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     UUID := auth.uid();
  v_config        free_sample_config%ROWTYPE;
  v_date          DATE;
  v_order_number  TEXT;
  v_orders        JSON[];
  v_address_id    UUID;
  v_random_chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code          TEXT;
  v_tomorrow      DATE := (CURRENT_DATE + INTERVAL '1 day')::DATE;
BEGIN
  -- ── Auth check ──────────────────────────────────────────────────────
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  -- ── Already claimed? ───────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM users WHERE id = v_caller_id AND claimed_free_sample = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You have already claimed your free sample.');
  END IF;

  -- ── Load config ────────────────────────────────────────────────────
  SELECT * INTO v_config
  FROM free_sample_config
  WHERE is_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Free samples are not available at this time.');
  END IF;

  -- ── Validate date count ────────────────────────────────────────────
  IF p_dates IS NULL OR array_length(p_dates, 1) IS NULL OR array_length(p_dates, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Please select at least one delivery date.');
  END IF;

  IF array_length(p_dates, 1) > v_config.trial_days THEN
    RETURN json_build_object(
      'success', false,
      'error', format('You can select up to %s delivery dates.', v_config.trial_days)
    );
  END IF;

  -- ── Validate each date ─────────────────────────────────────────────
  FOREACH v_date IN ARRAY p_dates LOOP
    IF v_date < v_tomorrow THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Delivery date %s must be tomorrow or later.', v_date)
      );
    END IF;
  END LOOP;

  -- Check for duplicate dates
  IF (SELECT COUNT(DISTINCT d) FROM unnest(p_dates) d) != array_length(p_dates, 1) THEN
    RETURN json_build_object('success', false, 'error', 'Duplicate delivery dates are not allowed.');
  END IF;

  -- ── Resolve delivery address ───────────────────────────────────────
  IF p_address_id IS NOT NULL THEN
    -- Verify the address belongs to the caller
    IF NOT EXISTS (SELECT 1 FROM addresses WHERE id = p_address_id AND user_id = v_caller_id) THEN
      RETURN json_build_object('success', false, 'error', 'Invalid delivery address.');
    END IF;
    v_address_id := p_address_id;
  ELSE
    -- Fallback to default address
    SELECT id INTO v_address_id
    FROM addresses
    WHERE user_id = v_caller_id
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;
  END IF;

  IF v_address_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Please add a delivery address before claiming your free sample.');
  END IF;

  -- ── Create orders ──────────────────────────────────────────────────
  v_orders := ARRAY[]::JSON[];

  FOREACH v_date IN ARRAY p_dates LOOP
    -- Generate unique order number: FS-<8 random chars>
    LOOP
      v_code := 'FS-';
      FOR i IN 1..8 LOOP
        v_code := v_code || substr(v_random_chars, floor(random() * length(v_random_chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE order_number = v_code);
    END LOOP;

    v_order_number := v_code;

    INSERT INTO orders (
      order_number,
      user_id,
      subscription_id,
      product_id,
      delivery_date,
      status,
      quantity,
      amount,
      address_id,
      delivery_notes
    ) VALUES (
      v_order_number,
      v_caller_id,
      NULL,          -- no subscription
      v_config.product_id,
      v_date,
      'scheduled',
      v_config.quantity_per_day,
      0.00,          -- free
      v_address_id,
      'Free sample delivery'
    );

    v_orders := v_orders || json_build_object(
      'order_number', v_order_number,
      'delivery_date', v_date,
      'quantity', v_config.quantity_per_day,
      'amount', 0.00
    )::JSON;
  END LOOP;

  -- ── Mark user as claimed ───────────────────────────────────────────
  UPDATE users
  SET claimed_free_sample = true
  WHERE id = v_caller_id;

  -- ── Return success ─────────────────────────────────────────────────
  RETURN json_build_object(
    'success', true,
    'orders', array_to_json(v_orders),
    'message', format('Successfully claimed %s free sample deliveries!', array_length(p_dates, 1))
  );
END;
$$;

COMMENT ON FUNCTION claim_free_sample IS
  'Atomic free-sample claim. Validates eligibility, creates ₹0 orders for the requested dates, '
  'and sets users.claimed_free_sample = true. SECURITY DEFINER bypasses RLS after internal auth checks.';
