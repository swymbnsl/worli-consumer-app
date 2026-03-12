INSERT INTO app_settings (setting_key, setting_value, description)
VALUES 
('min_wallet_recharge', '350', 'Minimum wallet recharge amount')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;
