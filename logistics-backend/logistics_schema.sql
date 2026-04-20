-- ============================================================
-- LOGISTICS OS - CONSOLIDATED DATABASE SCHEMA
-- Standardized for AWS (Linux) with lowercase table names
-- ============================================================

CREATE DATABASE IF NOT EXISTS logistics_os;
USE logistics_os;

-- ============================================================
-- 1. TENANT
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant (
    tenant_id          INT          PRIMARY KEY AUTO_INCREMENT,
    company_name       VARCHAR(255) NOT NULL,
    business_type      VARCHAR(100),
    slug               VARCHAR(100) UNIQUE NOT NULL,
    plan               VARCHAR(50)  DEFAULT 'startup',
    status             VARCHAR(50)  DEFAULT 'active',
    -- Branding
    brand_color        VARCHAR(20)  DEFAULT '#3b82f6',
    logo_url           VARCHAR(500),
    bg_app_color       VARCHAR(20)  DEFAULT '#f1f5f9',
    bg_sidebar_color   VARCHAR(20)  DEFAULT '#0f2235',
    background_url     VARCHAR(500),
    -- App Config
    app_name           VARCHAR(100),
    app_download_url   VARCHAR(500),
    -- Limits
    max_users          INT          DEFAULT 50,
    storage_limit_mb   INT          DEFAULT 1024,
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. VEHICLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle (
    plate_number  VARCHAR(50)  PRIMARY KEY,
    tenant_id     INT          NOT NULL,
    vehicle_type  VARCHAR(100),
    capacity_tons DECIMAL(10,2),
    status        VARCHAR(50),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

-- ============================================================
-- 3. STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
    staff_id                INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id               INT          NOT NULL,
    name                    VARCHAR(255),
    first_name              VARCHAR(255),
    last_name               VARCHAR(255),
    role                    VARCHAR(100), -- 'Admin', 'Driver', 'Document Controller'
    username                VARCHAR(100), -- Used as email/login
    password_hash           VARCHAR(255),
    phone                   VARCHAR(100),
    employee_id             VARCHAR(100),
    license_expiration_date DATE,
    status                  VARCHAR(50)  DEFAULT 'Available',
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

-- ============================================================
-- 4. APP_USER (Customers/Clients registering via app)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_user (
    user_id       INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id     INT          NOT NULL,
    first_name    VARCHAR(255),
    last_name     VARCHAR(255),
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(100),
    address       VARCHAR(500),
    role          VARCHAR(100) DEFAULT 'user',
    employee_id   VARCHAR(100),
    password_hash VARCHAR(255),
    status        VARCHAR(50)  DEFAULT 'active',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    UNIQUE KEY (tenant_id, email)
);

-- ============================================================
-- 5. CLIENT (Legacy/B2B Clients - might be merged with app_user later)
-- ============================================================
CREATE TABLE IF NOT EXISTS client (
    client_id      INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id      INT          NOT NULL,
    company_name   VARCHAR(255),
    contact_person VARCHAR(255),
    phone_number   VARCHAR(50),
    username       VARCHAR(100),
    password_hash  VARCHAR(255),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

-- ============================================================
-- 6. ROUTE
-- ============================================================
CREATE TABLE IF NOT EXISTS route (
    route_id               INT         PRIMARY KEY AUTO_INCREMENT,
    tenant_id              INT         NOT NULL,
    route_name             VARCHAR(255),
    assigned_vehicle_plate VARCHAR(50),
    primary_driver_id      INT,
    FOREIGN KEY (tenant_id)              REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_vehicle_plate) REFERENCES vehicle(plate_number),
    FOREIGN KEY (primary_driver_id)      REFERENCES staff(staff_id)
);

-- ============================================================
-- 7. SHIPMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment (
    delivery_number        VARCHAR(100) PRIMARY KEY,
    tenant_id              INT          NOT NULL,
    airway_bill_number     VARCHAR(100),
    client_id              INT,
    route_id               INT,
    pickup_location        TEXT,
    dropoff_location       TEXT,
    pickup_lat             DECIMAL(10,7),
    pickup_lng             DECIMAL(10,7),
    dropoff_lat            DECIMAL(10,7),
    dropoff_lng            DECIMAL(10,7),
    distance_km            DECIMAL(10,2),
    status                 VARCHAR(50)  DEFAULT 'Pending',
    prohibited_check       BOOLEAN,
    offline_log            BOOLEAN,
    assigned_vehicle_plate VARCHAR(50),
    assigned_driver_id     INT,
    assigned_helper_id     INT,
    item_type_flag         VARCHAR(50), -- 'PACKAGE', 'VEHICLE', 'FOOD', 'DOC', 'BULK'
    created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id)              REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id)              REFERENCES client(client_id),
    FOREIGN KEY (route_id)               REFERENCES route(route_id),
    FOREIGN KEY (assigned_vehicle_plate) REFERENCES vehicle(plate_number),
    FOREIGN KEY (assigned_driver_id)     REFERENCES staff(staff_id),
    FOREIGN KEY (assigned_helper_id)     REFERENCES staff(staff_id)
);

-- ============================================================
-- 8. PAYMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS payment (
    invoice_id       INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id        INT          NOT NULL,
    delivery_number  VARCHAR(100),
    billing_date     DATE,
    total_amount     DECIMAL(10,2),
    payment_method   VARCHAR(100),
    reference_code   VARCHAR(100),
    admin_confirmed  BOOLEAN      DEFAULT FALSE,
    status           VARCHAR(50)  DEFAULT 'Pending',
    FOREIGN KEY (tenant_id)       REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 9. PROOF_OF_DELIVERY
-- ============================================================
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    pod_id               INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id            INT          NOT NULL,
    delivery_number      VARCHAR(100),
    capture_type         VARCHAR(100),
    media_url            VARCHAR(500),
    delivery_timestamp   TIMESTAMP,
    geolocation          VARCHAR(255),
    FOREIGN KEY (tenant_id)       REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 10. SUB TABLES FOR SHIPMENT TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_package (
    delivery_number     VARCHAR(100) PRIMARY KEY,
    length              DECIMAL(10,2),
    width               DECIMAL(10,2),
    height              DECIMAL(10,2),
    weight              DECIMAL(10,2),
    content_description TEXT,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sub_document (
    delivery_number       VARCHAR(100) PRIMARY KEY,
    confidentiality_level VARCHAR(100),
    recipient_id_required BOOLEAN,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sub_food (
    delivery_number            VARCHAR(100) PRIMARY KEY,
    temperature_required_celsius DECIMAL(5,2),
    product_expiration_date    DATE,
    handling_instructions      TEXT,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sub_bulk (
    delivery_number  VARCHAR(100) PRIMARY KEY,
    pallet_count     INT,
    stackable        BOOLEAN,
    forklift_required BOOLEAN,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sub_vehicle (
    delivery_number   VARCHAR(100) PRIMARY KEY,
    vin               VARCHAR(100),
    make_model        VARCHAR(255),
    running_condition BOOLEAN,
    condition_report  TEXT,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE
);

-- ============================================================
-- 11. PLATFORM ADMINISTRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS superadmin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_name VARCHAR(100) DEFAULT 'Logistics OS',
    support_email VARCHAR(100) DEFAULT 'support@logistics.com',
    base_domain VARCHAR(100) DEFAULT 'logistihub.ddns.net',
    default_tenant_max_users INT DEFAULT 50,
    default_tenant_storage_mb INT DEFAULT 1024,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_email VARCHAR(100),
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(50),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_log (
    backup_id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    status VARCHAR(20),
    size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
