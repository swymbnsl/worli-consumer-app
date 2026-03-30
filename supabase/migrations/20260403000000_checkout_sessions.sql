-- ============================================================================
-- Migration: Checkout Sessions for Atomic Checkout Flow
-- Purpose: Create temporary session records that lock in prices and prevent
--          race conditions during checkout
-- ============================================================================

-- Create checkout_sessions table
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Server-calculated amounts (locked at initiation time)
  -- These are the source of truth - calculated from DB at session creation
  total_amount DECIMAL(10,2) NOT NULL,
  wallet_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  razorpay_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Razorpay details (if payment needed)
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  error_message TEXT,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  CONSTRAINT valid_amounts CHECK (total_amount = wallet_amount + razorpay_amount),
  CONSTRAINT positive_total CHECK (total_amount >= 0),
  CONSTRAINT non_negative_wallet CHECK (wallet_amount >= 0),
  CONSTRAINT non_negative_razorpay CHECK (razorpay_amount >= 0)
);

-- Indexes for performance
CREATE INDEX idx_checkout_sessions_user_id ON public.checkout_sessions (user_id);
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions (status);
CREATE INDEX idx_checkout_sessions_expires_at ON public.checkout_sessions (expires_at);
CREATE INDEX idx_checkout_sessions_razorpay_order ON public.checkout_sessions (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.checkout_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to sessions"
ON public.checkout_sessions FOR ALL
USING (current_setting('role') = 'service_role');

-- ============================================================================
-- Function: Cleanup expired sessions
-- Run periodically via cron job or manually to mark expired sessions
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE checkout_sessions
  SET status = 'expired',
      error_message = 'Session expired after 15 minutes'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.checkout_sessions IS 'Temporary records for atomic checkout flow. Prevents race conditions by locking in prices and amounts at initiation time.';
COMMENT ON COLUMN public.checkout_sessions.total_amount IS 'Total order amount calculated from DB product prices at session creation.';
COMMENT ON COLUMN public.checkout_sessions.wallet_amount IS 'Amount to be deducted from wallet (locked at session creation).';
COMMENT ON COLUMN public.checkout_sessions.razorpay_amount IS 'Amount to be paid via Razorpay gateway.';
COMMENT ON COLUMN public.checkout_sessions.status IS 'Session status: pending (in progress), completed (successful), expired (timeout), failed (error).';
COMMENT ON COLUMN public.checkout_sessions.expires_at IS 'Session expires 15 minutes after creation. User must complete checkout before this time.';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Marks expired pending sessions as expired. Returns number of sessions updated. Should be run periodically via cron.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO authenticated;
