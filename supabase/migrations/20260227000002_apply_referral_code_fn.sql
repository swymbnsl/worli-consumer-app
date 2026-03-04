-- ============================================================
-- Migration: apply_referral_code RPC function
-- Date: 2026-02-27
-- Description:
--   Atomic SECURITY DEFINER function that validates a referral
--   code, updates users.referred_by, and inserts the referrals
--   event row in a single transaction.  Safe to call directly
--   from the app layer (anon/authenticated JWT).
-- ============================================================

-- Drop existing version if any (idempotent re-run)
DROP FUNCTION IF EXISTS apply_referral_code(TEXT);

CREATE OR REPLACE FUNCTION apply_referral_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_referrer_id UUID;
  v_reward      DECIMAL(10,2);
BEGIN
  -- Must be authenticated
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  -- Prevent double-use: current user already has a referrer
  IF EXISTS (
    SELECT 1 FROM users WHERE id = v_caller_id AND referred_by IS NOT NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You have already used a referral code.');
  END IF;

  -- Look up the referrer by code (case-insensitive, not self)
  SELECT id INTO v_referrer_id
  FROM users
  WHERE UPPER(referral_code) = UPPER(TRIM(p_code))
    AND id != v_caller_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code.');
  END IF;

  -- Read reward amount from app_settings (default 50 if missing)
  SELECT COALESCE(setting_value::DECIMAL, 50.00) INTO v_reward
  FROM app_settings
  WHERE setting_key = 'referral_reward_amount'
  LIMIT 1;

  v_reward := COALESCE(v_reward, 50.00);

  -- Atomically set referred_by on the current user
  UPDATE users
  SET referred_by = v_referrer_id
  WHERE id = v_caller_id;

  -- Insert the referral event row
  INSERT INTO referrals (
    referrer_id,
    referee_id,
    referrer_reward_amount,
    referee_reward_amount,
    expires_at
  ) VALUES (
    v_referrer_id,
    v_caller_id,
    v_reward,
    v_reward,
    NOW() + INTERVAL '30 days'
  );

  RETURN json_build_object(
    'success',      true,
    'referrer_id',  v_referrer_id,
    'reward_amount', v_reward
  );
END;
$$;

COMMENT ON FUNCTION apply_referral_code IS
  'Validates a referral code, sets users.referred_by, and inserts the referrals row atomically. '
  'SECURITY DEFINER bypasses RLS safely after internal auth.uid() checks. '
  'Returns JSON: { success, error? } on failure or { success, referrer_id, reward_amount } on success.';
