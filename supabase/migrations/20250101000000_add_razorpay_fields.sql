-- ========================================
-- Migration: Add Razorpay fields to wallets table
-- ========================================

-- Add Razorpay customer and subscription IDs for autopay mandate tracking
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

-- Update valid_status constraint on transactions to include 'success' status
-- (used by existing code for completed payments)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE transactions ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'processing', 'completed', 'success', 'failed', 'cancelled'));

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_transactions_payment_gateway_id 
  ON transactions(payment_gateway_id);
