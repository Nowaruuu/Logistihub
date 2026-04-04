-- ============================================================
-- LOGISTICS OS - DATABASE SCHEMA
-- Generated with correct FK dependency order
-- ============================================================

CREATE DATABASE IF NOT EXISTS logistics_os;
USE logistics_os;

-- ============================================================
-- 1. TENANT (no dependencies)
-- ============================================================
CREATE TABLE tenant (
    tenant_id     INT          PRIMARY KEY AUTO_INCREMENT,
    company_name  VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. VEHICLE (depends on: tenant)
-- ============================================================
CREATE TABLE vehicle (
    plate_number  VARCHAR(50)  PRIMARY KEY,
    tenant_id     INT          NOT NULL,
    vehicle_type  VARCHAR(100),
    capacity_tons DECIMAL(10,2),
    status        VARCHAR(50),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
);

-- ============================================================
-- 3. STAFF (depends on: tenant)
-- ============================================================
CREATE TABLE staff (
    staff_id                INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id               INT          NOT NULL,
    name                    VARCHAR(255),
    role                    VARCHAR(100),
    username                VARCHAR(100),
    password_hash           VARCHAR(255),
    license_expiration_date DATE,
    status                  VARCHAR(50),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
);

-- ============================================================
-- 4. CLIENT (depends on: tenant)
-- ============================================================
CREATE TABLE client (
    client_id      INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id      INT          NOT NULL,
    company_name   VARCHAR(255),
    contact_person VARCHAR(255),
    phone_number   VARCHAR(50),
    username       VARCHAR(100),
    password_hash  VARCHAR(255),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
);

-- ============================================================
-- 5. ROUTE (depends on: tenant, vehicle, staff)
-- ============================================================
CREATE TABLE route (
    route_id               INT         PRIMARY KEY AUTO_INCREMENT,
    tenant_id              INT         NOT NULL,
    route_name             VARCHAR(255),
    assigned_vehicle_plate VARCHAR(50),
    primary_driver_id      INT,
    FOREIGN KEY (tenant_id)              REFERENCES tenant(tenant_id),
    FOREIGN KEY (assigned_vehicle_plate) REFERENCES vehicle(plate_number),
    FOREIGN KEY (primary_driver_id)      REFERENCES staff(staff_id)
);

-- ============================================================
-- 6. SHIPMENT (depends on: tenant, client, route, vehicle, staff)
-- ============================================================
CREATE TABLE shipment (
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
    status                 VARCHAR(50),
    prohibited_check       BOOLEAN,
    offline_log            BOOLEAN,
    assigned_vehicle_plate VARCHAR(50),
    assigned_driver_id     INT,
    assigned_helper_id     INT,
    item_type_flag         VARCHAR(50),
    created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id)              REFERENCES tenant(tenant_id),
    FOREIGN KEY (client_id)              REFERENCES client(client_id),
    FOREIGN KEY (route_id)               REFERENCES route(route_id),
    FOREIGN KEY (assigned_vehicle_plate) REFERENCES vehicle(plate_number),
    FOREIGN KEY (assigned_driver_id)     REFERENCES staff(staff_id),
    FOREIGN KEY (assigned_helper_id)     REFERENCES staff(staff_id)
);

-- ============================================================
-- 7. DECLINE_REASONS (depends on: tenant, shipment, staff)
-- ============================================================
CREATE TABLE decline_reasons (
    id              INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id       INT          NOT NULL,
    delivery_number VARCHAR(100),
    reason          TEXT,
    declined_by     INT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id)       REFERENCES tenant(tenant_id),
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number),
    FOREIGN KEY (declined_by)     REFERENCES staff(staff_id)
);

-- ============================================================
-- 8. PAYMENT (depends on: tenant, shipment)
-- ============================================================
CREATE TABLE payment (
    invoice_id       INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id        INT          NOT NULL,
    delivery_number  VARCHAR(100),
    billing_date     DATE,
    total_amount     DECIMAL(10,2),
    payment_method   VARCHAR(100),
    reference_code   VARCHAR(100),
    admin_confirmed  BOOLEAN,
    status           VARCHAR(50),
    FOREIGN KEY (tenant_id)       REFERENCES tenant(tenant_id),
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 9. PROOF_OF_DELIVERY (depends on: tenant, shipment)
-- ============================================================
CREATE TABLE proof_of_delivery (
    pod_id               INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id            INT          NOT NULL,
    delivery_number      VARCHAR(100),
    capture_type         VARCHAR(100),
    media_url            VARCHAR(500),
    delivery_timestamp   TIMESTAMP,
    geolocation          VARCHAR(255),
    FOREIGN KEY (tenant_id)       REFERENCES tenant(tenant_id),
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 10. SUB_PACKAGE (depends on: shipment)
-- ============================================================
CREATE TABLE sub_package (
    delivery_number     VARCHAR(100) PRIMARY KEY,
    length              DECIMAL(10,2),
    width               DECIMAL(10,2),
    height              DECIMAL(10,2),
    weight              DECIMAL(10,2),
    content_description TEXT,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 11. SUB_DOCUMENT (depends on: shipment)
-- ============================================================
CREATE TABLE sub_document (
    delivery_number       VARCHAR(100) PRIMARY KEY,
    confidentiality_level VARCHAR(100),
    recipient_id_required BOOLEAN,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 12. SUB_FOOD (depends on: shipment)
-- ============================================================
CREATE TABLE sub_food (
    delivery_number            VARCHAR(100) PRIMARY KEY,
    temperature_required_celsius DECIMAL(5,2),
    product_expiration_date    DATE,
    handling_instructions      TEXT,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 13. SUB_BULK (depends on: shipment)
-- ============================================================
CREATE TABLE sub_bulk (
    delivery_number  VARCHAR(100) PRIMARY KEY,
    pallet_count     INT,
    stackable        BOOLEAN,
    forklift_required BOOLEAN,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- 14. SUB_VEHICLE (depends on: shipment)
-- ============================================================
CREATE TABLE sub_vehicle (
    delivery_number   VARCHAR(100) PRIMARY KEY,
    vin               VARCHAR(100),
    make_model        VARCHAR(255),
    running_condition BOOLEAN,
    condition_report  TEXT,
    FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number)
);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
