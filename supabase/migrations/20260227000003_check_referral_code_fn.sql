-- ============================================================
-- Migration: check_referral_code RPC function
-- Date: 2026-02-27
-- Description:
--   Lightweight read-only SECURITY DEFINER function that checks
--   whether a referral code is valid for the calling user,
--   without applying it.  Used for inline UI validation before
--   form submission.
-- ============================================================

DROP FUNCTION IF EXISTS check_referral_code(TEXT);

CREATE OR REPLACE FUNCTION check_referral_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Not authenticated.');
  END IF;

  -- Caller has already used a referral code
  IF EXISTS (
    SELECT 1 FROM users WHERE id = v_caller_id AND referred_by IS NOT NULL
  ) THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used a referral code.');
  END IF;

  -- Code must exist and must not belong to the caller (no self-referral)
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE UPPER(referral_code) = UPPER(TRIM(p_code))
      AND id != v_caller_id
  ) THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid referral code.');
  END IF;

  RETURN json_build_object('valid', true);
END;
$$;

COMMENT ON FUNCTION check_referral_code IS
  'Read-only check: returns { valid: true } if the code exists, is not the caller''s own code, '
  'and the caller has not already used a referral code. Does NOT apply the code.';
