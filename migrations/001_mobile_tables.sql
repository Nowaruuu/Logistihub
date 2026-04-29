-- LogistiHub Mobile App Migration
-- Creates new tables only (safe to re-run)

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
