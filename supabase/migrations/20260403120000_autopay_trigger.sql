-- Migration: Add auto-recharge trigger mechanism
-- This enables balance-based autopay charging via database triggers

-- 1. Add last_autopay_charge_at column to wallets table
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS last_autopay_charge_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN wallets.last_autopay_charge_at IS 'Timestamp of last successful autopay charge (for cooldown)';

-- 2. Create function to trigger autopay charge via Edge Function
CREATE OR REPLACE FUNCTION trigger_autopay_on_balance_drop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trigger_amount DECIMAL(10, 2);
  v_new_balance DECIMAL(10, 2);
BEGIN
  -- Only proceed if:
  -- 1. Balance decreased (not increased)
  -- 2. Auto-recharge is enabled
  -- 3. There's a valid subscription ID
  IF NEW.balance >= OLD.balance THEN
    RETURN NEW;
  END IF;

  IF NOT COALESCE(NEW.auto_recharge_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.razorpay_subscription_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_balance := COALESCE(NEW.balance, 0);
  v_trigger_amount := COALESCE(NEW.auto_recharge_trigger_amount, 0);

  -- Check if balance dropped below trigger threshold
  IF v_new_balance < v_trigger_amount THEN
    -- Log the trigger attempt
    RAISE NOTICE 'Autopay triggered for user_id=%: balance=%, trigger=%', 
      NEW.user_id, v_new_balance, v_trigger_amount;

    -- Call Edge Function asynchronously via pg_net (if available)
    -- Or use a scheduled job to process this
    -- For now, we'll use a simpler approach: insert into a queue table
    INSERT INTO autopay_queue (user_id, wallet_id, balance_at_trigger, created_at)
    VALUES (NEW.user_id, NEW.id, v_new_balance, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance_at_trigger = EXCLUDED.balance_at_trigger,
      created_at = EXCLUDED.created_at,
      processed = false;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_autopay_on_balance_drop IS 'Triggered when wallet balance drops below auto_recharge_trigger_amount';

-- 3. Create autopay queue table to track pending charges
CREATE TABLE IF NOT EXISTS autopay_queue (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  balance_at_trigger DECIMAL(10, 2) NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  error_message TEXT DEFAULT NULL
);

COMMENT ON TABLE autopay_queue IS 'Queue of pending autopay charges triggered by balance drops';

CREATE INDEX IF NOT EXISTS idx_autopay_queue_unprocessed 
ON autopay_queue(created_at) 
WHERE processed = false;

-- 4. Create trigger on wallets table
DROP TRIGGER IF EXISTS wallet_balance_autopay_trigger ON wallets;

CREATE TRIGGER wallet_balance_autopay_trigger
  AFTER UPDATE OF balance ON wallets
  FOR EACH ROW
  WHEN (NEW.balance < OLD.balance)
  EXECUTE FUNCTION trigger_autopay_on_balance_drop();

COMMENT ON TRIGGER wallet_balance_autopay_trigger ON wallets IS 'Triggers autopay when wallet balance drops below threshold';

-- 5. Create function to process autopay queue (called by cron or edge function webhook)
CREATE OR REPLACE FUNCTION process_autopay_queue()
RETURNS TABLE (
  user_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
  v_result RECORD;
BEGIN
  -- Process all unprocessed autopay requests
  FOR v_record IN 
    SELECT * FROM autopay_queue 
    WHERE processed = false 
    ORDER BY created_at ASC
    LIMIT 10 -- Process max 10 at a time
  LOOP
    -- Here you would call the Edge Function via HTTP
    -- For now, we'll just mark it as ready to be processed
    -- The actual processing will be done by a scheduled task or webhook
    
    user_id := v_record.user_id;
    success := false;
    message := 'Queued for processing';
    
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_autopay_queue IS 'Processes pending autopay charges from the queue';
