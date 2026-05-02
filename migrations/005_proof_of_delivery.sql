-- 005: Add proof of delivery photo column
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS proof_photo_url TEXT DEFAULT NULL;
