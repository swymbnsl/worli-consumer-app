-- Migration: Add unique constraint on address names per user (case-insensitive)
-- Prevents creating two addresses with the same name for the same user.

CREATE UNIQUE INDEX idx_unique_address_name_per_user
ON addresses (user_id, LOWER(name));
