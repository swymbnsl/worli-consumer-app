-- Migration: Remove end_date column from subscriptions table
-- Now using start_date + duration_months instead

-- Remove end_date column
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS end_date;

COMMENT ON TABLE subscriptions IS 'Subscription model now uses start_date + duration_months instead of end_date';
