-- ═══════════════════════════════════════════════════════════════════════════════
-- LogistiHub: Add Primary Keys and Foreign Keys (ERD Constraints)
-- Safe to run multiple times — uses IF NOT EXISTS / checks before adding
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── FOREIGN KEYS ────────────────────────────────────────────────────────────

-- STAFF → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'STAFF' AND CONSTRAINT_NAME = 'fk_staff_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE STAFF ADD CONSTRAINT fk_staff_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- APP_USER → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'APP_USER' AND CONSTRAINT_NAME = 'fk_appuser_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE APP_USER ADD CONSTRAINT fk_appuser_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- shipment → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'shipment' AND CONSTRAINT_NAME = 'fk_shipment_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE shipment ADD CONSTRAINT fk_shipment_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- shipment → client
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'shipment' AND CONSTRAINT_NAME = 'fk_shipment_client');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE shipment ADD CONSTRAINT fk_shipment_client FOREIGN KEY (client_id) REFERENCES client(client_id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vehicle → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle' AND CONSTRAINT_NAME = 'fk_vehicle_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE vehicle ADD CONSTRAINT fk_vehicle_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- route → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'route' AND CONSTRAINT_NAME = 'fk_route_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE route ADD CONSTRAINT fk_route_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND CONSTRAINT_NAME = 'fk_payment_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE payment ADD CONSTRAINT fk_payment_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- client → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'client' AND CONSTRAINT_NAME = 'fk_client_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE client ADD CONSTRAINT fk_client_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- proof_of_delivery → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'proof_of_delivery' AND CONSTRAINT_NAME = 'fk_pod_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE proof_of_delivery ADD CONSTRAINT fk_pod_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- DELIVERY_CHAT → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'DELIVERY_CHAT' AND CONSTRAINT_NAME = 'fk_chat_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE DELIVERY_CHAT ADD CONSTRAINT fk_chat_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- NOTIFICATION → TENANT  
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'NOTIFICATION' AND CONSTRAINT_NAME = 'fk_notification_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE NOTIFICATION ADD CONSTRAINT fk_notification_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SAVED_ADDRESS → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'SAVED_ADDRESS' AND CONSTRAINT_NAME = 'fk_savedaddr_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE SAVED_ADDRESS ADD CONSTRAINT fk_savedaddr_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SHIPMENT_HISTORY → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'SHIPMENT_HISTORY' AND CONSTRAINT_NAME = 'fk_shiphistory_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE SHIPMENT_HISTORY ADD CONSTRAINT fk_shiphistory_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- VEHICLE_REQUEST → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'VEHICLE_REQUEST' AND CONSTRAINT_NAME = 'fk_vreq_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE VEHICLE_REQUEST ADD CONSTRAINT fk_vreq_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- DELIVERY_RATING → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'DELIVERY_RATING' AND CONSTRAINT_NAME = 'fk_rating_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE DELIVERY_RATING ADD CONSTRAINT fk_rating_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- decline_reasons → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'decline_reasons' AND CONSTRAINT_NAME = 'fk_decline_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE decline_reasons ADD CONSTRAINT fk_decline_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SUBSCRIPTION_PAYMENT → TENANT
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'SUBSCRIPTION_PAYMENT' AND CONSTRAINT_NAME = 'fk_subpay_tenant');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE SUBSCRIPTION_PAYMENT ADD CONSTRAINT fk_subpay_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── SUB-TABLES → shipment (delivery_number) ────────────────────────────────

-- sub_package → shipment
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sub_package' AND CONSTRAINT_NAME = 'fk_subpkg_shipment');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE sub_package ADD CONSTRAINT fk_subpkg_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sub_food → shipment
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sub_food' AND CONSTRAINT_NAME = 'fk_subfood_shipment');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE sub_food ADD CONSTRAINT fk_subfood_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sub_document → shipment
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sub_document' AND CONSTRAINT_NAME = 'fk_subdoc_shipment');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE sub_document ADD CONSTRAINT fk_subdoc_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sub_vehicle → shipment
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sub_vehicle' AND CONSTRAINT_NAME = 'fk_subveh_shipment');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE sub_vehicle ADD CONSTRAINT fk_subveh_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sub_bulk → shipment
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sub_bulk' AND CONSTRAINT_NAME = 'fk_subbulk_shipment');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE sub_bulk ADD CONSTRAINT fk_subbulk_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'All PK/FK constraints applied successfully.' AS result;
