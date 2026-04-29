-- LogistiHub Mobile App Migration (MySQL-compatible)
-- The CREATE TABLE IF NOT EXISTS statements already ran successfully.
-- This script handles the ALTER TABLE statements safely.

-- Add columns to shipment (ignore errors if they already exist)
-- Run each one separately in mysql CLI

ALTER TABLE shipment ADD COLUMN sender_user_id INT NULL;
ALTER TABLE shipment ADD COLUMN receiver_name VARCHAR(100) NULL;
ALTER TABLE shipment ADD COLUMN receiver_phone VARCHAR(20) NULL;
ALTER TABLE shipment ADD COLUMN receiver_address VARCHAR(255) NULL;
ALTER TABLE shipment ADD COLUMN shipping_method VARCHAR(50) NULL;
ALTER TABLE shipment ADD COLUMN total_fee DECIMAL(10,2) NULL;
ALTER TABLE shipment ADD COLUMN estimated_arrival VARCHAR(100) NULL;
ALTER TABLE shipment ADD COLUMN weight DECIMAL(10,2) NULL;
ALTER TABLE shipment ADD COLUMN size VARCHAR(50) NULL;

-- PayMongo columns on payment table
ALTER TABLE payment ADD COLUMN paymongo_checkout_id VARCHAR(100) NULL;
ALTER TABLE payment ADD COLUMN paymongo_payment_id VARCHAR(100) NULL;
ALTER TABLE payment ADD COLUMN payment_method VARCHAR(50) NULL;
ALTER TABLE payment ADD COLUMN paid_at TIMESTAMP NULL;
