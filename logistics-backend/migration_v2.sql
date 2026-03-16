-- Migration v2: Fix Registration Schema
USE logistics_os;

-- 1. Ensure STAFF table has necessary fields for registration
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);

-- 2. Create APP_USER table for general clients/customers
CREATE TABLE IF NOT EXISTS app_user (
    user_id       INT          PRIMARY KEY AUTO_INCREMENT,
    tenant_id     INT          NOT NULL,
    first_name    VARCHAR(255),
    last_name     VARCHAR(255),
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(50),
    employee_id   VARCHAR(100), -- for those who register via app
    role          VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    status        VARCHAR(50)  DEFAULT 'active',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    UNIQUE KEY (tenant_id, email)
);
