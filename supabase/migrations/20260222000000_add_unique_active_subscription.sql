-- Migration: Add unique constraint on active subscriptions to prevent duplicates

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription
ON subscriptions (user_id, product_id, address_id)
WHERE status = 'active';
