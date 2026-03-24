-- Migration to securely deduct wallet balance via RPC

CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id TEXT;
BEGIN
  -- 1. Get current balance and lock the row
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- 2. Check if sufficient balance
  v_new_balance := v_current_balance - p_amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 3. Update wallet
  UPDATE wallets
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 4. Create transaction record
  v_transaction_id := 'TXN_' || extract(epoch from now())::text || '_' || floor(random() * 1000)::text;
  
  INSERT INTO transactions (
    transaction_id, user_id, wallet_id, type, amount, status, 
    description, balance_before, balance_after
  ) VALUES (
    v_transaction_id, p_user_id, v_wallet_id, 'debit', p_amount, 'completed',
    p_description, v_current_balance, v_new_balance
  );

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;
