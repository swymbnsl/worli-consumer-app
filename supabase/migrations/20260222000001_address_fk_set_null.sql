-- Migration: Change subscriptions.address_id FK to ON DELETE SET NULL
-- This allows deleting addresses that are referenced by non-active subscriptions.
-- Active subscriptions are protected by application-level checks.

ALTER TABLE subscriptions
  DROP CONSTRAINT subscriptions_address_id_fkey;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_address_id_fkey
  FOREIGN KEY (address_id)
  REFERENCES addresses(id)
  ON DELETE SET NULL;

-- Also update orders table FK for the same reason
ALTER TABLE orders
  DROP CONSTRAINT orders_address_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_address_id_fkey
  FOREIGN KEY (address_id)
  REFERENCES addresses(id)
  ON DELETE SET NULL;
