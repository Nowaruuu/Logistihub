-- 005: Add proof of delivery photo column
ALTER TABLE shipment ADD COLUMN proof_photo_url TEXT DEFAULT NULL;
