-- LogistiHub Mobile App Migration
-- Run on EC2: mysql -u root -p logistics_os < migrations/001_mobile_tables.sql

-- 1. Saved Addresses
CREATE TABLE IF NOT EXISTS SAVED_ADDRESS (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id INT NOT NULL,
  label VARCHAR(50),
  full_name VARCHAR(100),
  phone VARCHAR(20),
  address VARCHAR(255),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, tenant_id)
);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS NOTIFICATION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_type ENUM('app_user','staff') DEFAULT 'app_user',
  tenant_id INT NOT NULL,
  title VARCHAR(255),
  message TEXT,
  type ENUM('Shipments','Payments','Account','System') DEFAULT 'Shipments',
  is_read BOOLEAN DEFAULT FALSE,
  related_tracking VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, tenant_id, is_read)
);

-- 3. Shipment History (timeline events)
CREATE TABLE IF NOT EXISTS SHIPMENT_HISTORY (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_number VARCHAR(30) NOT NULL,
  tenant_id INT NOT NULL,
  status VARCHAR(50),
  location VARCHAR(255),
  description VARCHAR(255),
  actor_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dn (delivery_number, tenant_id)
);

-- 4. Add sender_user_id to shipment (for mobile-created shipments)
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS sender_user_id INT NULL AFTER client_id;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(100) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS receiver_address VARCHAR(255) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS total_fee DECIMAL(10,2) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS estimated_arrival VARCHAR(100) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2) NULL;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS size VARCHAR(50) NULL;

-- 5. PayMongo columns on payment table
ALTER TABLE payment ADD COLUMN IF NOT EXISTS paymongo_checkout_id VARCHAR(100) NULL;
ALTER TABLE payment ADD COLUMN IF NOT EXISTS paymongo_payment_id VARCHAR(100) NULL;
ALTER TABLE payment ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;
ALTER TABLE payment ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL;
