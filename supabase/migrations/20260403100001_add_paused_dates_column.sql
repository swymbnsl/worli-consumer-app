-- ============================================
-- ADD PAUSED_DATES COLUMN TO SUBSCRIPTIONS
-- Allows users to pause delivery on specific dates
-- ============================================

-- Add paused_dates column as TEXT array
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS paused_dates TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.paused_dates IS 'Array of ISO date strings (YYYY-MM-DD) when delivery is paused by the user';

-- Create index for efficient querying of paused dates
CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_dates 
  ON subscriptions USING GIN (paused_dates);
