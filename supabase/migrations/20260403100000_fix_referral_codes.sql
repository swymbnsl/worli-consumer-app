-- ============================================
-- FIX REFERRAL CODES MIGRATION
-- Changes referral code generation to be:
-- - Always 8 characters (uniform length)
-- - Purely random (no name-based codes)
-- - Alphanumeric with unambiguous characters
-- - Generated once at INSERT, never regenerated
-- ============================================

-- ============================================
-- 1. DROP OLD TRIGGERS
-- Remove the name-based regeneration trigger
-- since we no longer want codes to change
-- ============================================

DROP TRIGGER IF EXISTS trg_regenerate_referral_code_on_name ON users;
DROP FUNCTION IF EXISTS regenerate_referral_code_on_name();


-- ============================================
-- 2. UPDATE REFERRAL CODE GENERATOR
-- New format: 8 random alphanumeric characters
-- Uses unambiguous character set (no 0/O, 1/I/L)
-- Example: K7N3P2XQ, A4B8C9D2
-- ============================================

DROP TRIGGER IF EXISTS trg_generate_referral_code ON users;
DROP FUNCTION IF EXISTS generate_referral_code();

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  -- Unambiguous uppercase alphanumeric set (no 0/O, 1/I/L)
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
BEGIN
  -- Only generate if not already set
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    -- Generate 8 random characters
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Exit when unique
    EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = code);
  END LOOP;

  NEW.referral_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();


-- ============================================
-- 3. UPDATE EXISTING CODES (OPTIONAL)
-- This will update all existing variable-length
-- codes to 8-character format.
-- Comment out if you want to keep existing codes.
-- ============================================

-- Update codes that are not exactly 8 characters
DO $$
DECLARE
  user_row RECORD;
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
BEGIN
  FOR user_row IN 
    SELECT id FROM users 
    WHERE LENGTH(referral_code) != 8 OR referral_code IS NULL
  LOOP
    LOOP
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = new_code);
    END LOOP;
    
    UPDATE users SET referral_code = new_code WHERE id = user_row.id;
  END LOOP;
END $$;


-- ============================================
-- 4. UPDATE INDEX TO EXACT LENGTH CHECK
-- Add constraint to ensure all codes are 8 chars
-- ============================================

ALTER TABLE users 
  ADD CONSTRAINT chk_referral_code_length 
  CHECK (referral_code IS NULL OR LENGTH(referral_code) = 8);
