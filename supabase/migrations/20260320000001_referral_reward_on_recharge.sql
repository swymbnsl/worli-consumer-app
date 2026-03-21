-- Reward both referrer and referee on referee's next successful wallet recharge.
-- This function is idempotent and safe to call multiple times.

DROP FUNCTION IF EXISTS public.payout_referral_on_recharge(UUID, TEXT, DECIMAL);

CREATE OR REPLACE FUNCTION public.payout_referral_on_recharge(
  p_referee_id UUID,
  p_recharge_payment_id TEXT,
  p_recharge_amount DECIMAL(10, 2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referrer_wallet wallets%ROWTYPE;
  v_referee_wallet wallets%ROWTYPE;
  v_referrer_new_balance DECIMAL(10, 2);
  v_referee_new_balance DECIMAL(10, 2);
  v_referrer_txn_id TEXT;
  v_referee_txn_id TEXT;
BEGIN
  -- Find the active pending referral for this referee and lock it.
  SELECT * INTO v_referral
  FROM referrals
  WHERE referee_id = p_referee_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at >= NOW())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  -- No pending referral means nothing to pay (already rewarded/expired/none).
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', true,
      'awarded', false,
      'reason', 'No pending eligible referral found.'
    );
  END IF;

  -- Lock both wallets for consistent balance updates.
  SELECT * INTO v_referee_wallet
  FROM wallets
  WHERE user_id = v_referral.referee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'awarded', false,
      'error', 'Referee wallet not found.'
    );
  END IF;

  SELECT * INTO v_referrer_wallet
  FROM wallets
  WHERE user_id = v_referral.referrer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'awarded', false,
      'error', 'Referrer wallet not found.'
    );
  END IF;

  v_referrer_txn_id := 'REF_BONUS_REFERRER_' || v_referral.id::TEXT;
  v_referee_txn_id := 'REF_BONUS_REFEREE_' || v_referral.id::TEXT;

  -- Idempotency guard: if any reward transaction exists, treat as already processed.
  IF EXISTS (
    SELECT 1
    FROM transactions
    WHERE transaction_id IN (v_referrer_txn_id, v_referee_txn_id)
  ) THEN
    RETURN json_build_object(
      'success', true,
      'awarded', false,
      'reason', 'Referral reward already processed.'
    );
  END IF;

  v_referrer_new_balance := COALESCE(v_referrer_wallet.balance, 0) + v_referral.referrer_reward_amount;
  v_referee_new_balance := COALESCE(v_referee_wallet.balance, 0) + v_referral.referee_reward_amount;

  -- Credit referrer wallet.
  UPDATE wallets
  SET balance = v_referrer_new_balance,
      updated_at = NOW()
  WHERE id = v_referrer_wallet.id;

  INSERT INTO transactions (
    transaction_id,
    user_id,
    wallet_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    payment_method,
    payment_gateway_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_referrer_txn_id,
    v_referral.referrer_id,
    v_referrer_wallet.id,
    'credit',
    v_referral.referrer_reward_amount,
    v_referrer_wallet.balance,
    v_referrer_new_balance,
    'Referral reward credited after referee wallet recharge',
    'referral_reward',
    p_recharge_payment_id,
    'completed',
    NOW(),
    NOW()
  );

  -- Credit referee wallet.
  UPDATE wallets
  SET balance = v_referee_new_balance,
      updated_at = NOW()
  WHERE id = v_referee_wallet.id;

  INSERT INTO transactions (
    transaction_id,
    user_id,
    wallet_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    payment_method,
    payment_gateway_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_referee_txn_id,
    v_referral.referee_id,
    v_referee_wallet.id,
    'credit',
    v_referral.referee_reward_amount,
    v_referee_wallet.balance,
    v_referee_new_balance,
    'Referral reward credited on your first wallet recharge',
    'referral_reward',
    p_recharge_payment_id,
    'completed',
    NOW(),
    NOW()
  );

  -- Mark referral as rewarded.
  UPDATE referrals
  SET status = 'rewarded',
      referrer_rewarded_at = NOW(),
      referee_rewarded_at = NOW(),
      qualifying_order_id = NULL
  WHERE id = v_referral.id;

  RETURN json_build_object(
    'success', true,
    'awarded', true,
    'referral_id', v_referral.id,
    'referrer_id', v_referral.referrer_id,
    'referee_id', v_referral.referee_id,
    'referrer_reward', v_referral.referrer_reward_amount,
    'referee_reward', v_referral.referee_reward_amount,
    'recharge_amount', p_recharge_amount
  );
END;
$$;

COMMENT ON FUNCTION public.payout_referral_on_recharge(UUID, TEXT, DECIMAL) IS
  'Pays referral reward to both users on referee first successful wallet recharge. Idempotent via deterministic transaction IDs.';
