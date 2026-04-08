-- ============================================================================
-- Migration: Bottle-Based Payment System
-- Run this SQL manually in Supabase SQL Editor
-- ============================================================================

-- 1. Add app_settings for bottle system
-- ============================================================================

-- Minimum bottles for regular recharge
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('min_bottles_recharge', '10', 'Minimum bottles for regular recharge')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '10';

-- Update min_wallet_recharge to be bottle-based (10 bottles × ₹30 = ₹300)
UPDATE app_settings 
SET setting_value = '300', description = 'Minimum wallet recharge amount (10 bottles × ₹30)'
WHERE setting_key = 'min_wallet_recharge';

-- Add cron secret for secure cron job calls
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('cron_secret', 'your-secure-cron-secret-here', 'Secret for authenticating cron job calls')
ON CONFLICT (setting_key) DO NOTHING;


-- 2. Setup pg_cron for daily order generation
-- ============================================================================
-- NOTE: pg_cron requires Supabase Pro plan
-- The cron runs at 12:01 AM IST (6:31 PM UTC) daily

-- First, enable the pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily order generation
-- Replace YOUR_SERVICE_ROLE_KEY with actual service role key
-- Replace YOUR_CRON_SECRET with your chosen secret

/*
SELECT cron.schedule(
  'generate-daily-orders',  -- job name
  '31 18 * * *',            -- 6:31 PM UTC = 12:01 AM IST
  $$
  SELECT net.http_post(
    url := 'https://mrbjduttwiciolhhabpa.supabase.co/functions/v1/generate-daily-orders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('secret', 'YOUR_CRON_SECRET')
  );
  $$
);
*/


-- 3. Add CRON_SECRET to edge function secrets
-- ============================================================================
-- Run this in terminal:
-- supabase secrets set CRON_SECRET=your-secure-cron-secret-here --project-ref mrbjduttwiciolhhabpa


-- 4. Verify existing tables have required columns
-- ============================================================================

-- Ensure orders table has all required columns
DO $$
BEGIN
  -- Add cancellation_reason if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;


-- 5. Create index for efficient order generation queries
-- ============================================================================

-- Index for finding active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_active 
ON subscriptions(status) 
WHERE status = 'active';

-- Index for finding orders by date
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date 
ON orders(delivery_date);

-- Index for finding orders by subscription and date
CREATE INDEX IF NOT EXISTS idx_orders_subscription_date 
ON orders(subscription_id, delivery_date);


-- 6. View to check cron job status (for monitoring)
-- ============================================================================

/*
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Check recent job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Unschedule if needed
SELECT cron.unschedule('generate-daily-orders');
*/


-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 
-- 1. After running this migration, deploy the edge functions:
--    supabase functions deploy wallet-recharge --no-verify-jwt --project-ref mrbjduttwiciolhhabpa
--    supabase functions deploy checkout --no-verify-jwt --project-ref mrbjduttwiciolhhabpa
--    supabase functions deploy generate-daily-orders --no-verify-jwt --project-ref mrbjduttwiciolhhabpa
--
-- 2. Set the CRON_SECRET environment variable:
--    supabase secrets set CRON_SECRET=your-secure-cron-secret-here --project-ref mrbjduttwiciolhhabpa
--
-- 3. The pg_cron schedule needs to be run separately with actual keys
--
-- 4. Test the generate-daily-orders function manually first:
--    curl -X POST https://mrbjduttwiciolhhabpa.supabase.co/functions/v1/generate-daily-orders \
--      -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--      -H "Content-Type: application/json" \
--      -d '{"secret": "YOUR_CRON_SECRET"}'
--
-- ============================================================================
