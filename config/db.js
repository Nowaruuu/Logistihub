'use strict';

const mysql = require('mysql2/promise');

// ─── Connection Pool ──────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  database:           process.env.DB_NAME     || 'logistics_os',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

// ─── Test connection on startup ───────────────────────────────────────────────
pool.getConnection()
  .then(async conn => {
    console.log('✅  MySQL connected:', process.env.DB_NAME);
    conn.release();

    // ── Auto-migrations: add missing columns safely ────────────────────────
    const migrations = [
      "ALTER TABLE STAFF ADD COLUMN must_change_password TINYINT(1) DEFAULT 0",
      "ALTER TABLE SUPERADMIN ADD COLUMN must_change_password TINYINT(1) DEFAULT 0",
      "ALTER TABLE vehicle ADD COLUMN ownership_doc LONGTEXT DEFAULT NULL",
      "ALTER TABLE TENANT ADD COLUMN available_vehicles VARCHAR(255) NULL DEFAULT 'motorcycle,sedan,van,truck,flatbed'",
      "ALTER TABLE STAFF ADD COLUMN license_url LONGTEXT DEFAULT NULL",
      "ALTER TABLE STAFF ADD COLUMN license_expiry DATE DEFAULT NULL",
      "ALTER TABLE STAFF ADD COLUMN license_status ENUM('not_uploaded','pending_review','verified','expired') DEFAULT 'not_uploaded'",
      "ALTER TABLE STAFF ADD COLUMN vehicle_plate VARCHAR(20) DEFAULT NULL",
      "ALTER TABLE STAFF ADD COLUMN vehicle_type VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE vehicle ADD COLUMN model VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE TENANT ADD COLUMN supported_package_categories VARCHAR(255) DEFAULT 'Package,Food,Document,Bulk,Vehicle'",
      `CREATE TABLE IF NOT EXISTS VEHICLE_REQUEST (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        vehicle_plate VARCHAR(20) NOT NULL,
        driver_id INT NOT NULL,
        request_type ENUM('driver_request','staff_assignment') NOT NULL DEFAULT 'driver_request',
        status ENUM('pending','approved','denied','refused') NOT NULL DEFAULT 'pending',
        refusal_reason TEXT DEFAULT NULL,
        initiated_by INT DEFAULT NULL,
        reviewed_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS proof_of_delivery (
        pod_id INT AUTO_INCREMENT PRIMARY KEY,
        delivery_number VARCHAR(100) NOT NULL,
        tenant_id INT NOT NULL,
        photo LONGTEXT DEFAULT NULL,
        signature LONGTEXT DEFAULT NULL,
        receiver_name VARCHAR(255) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        latitude DECIMAL(10,8) DEFAULT NULL,
        longitude DECIMAL(11,8) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      "ALTER TABLE shipment ADD COLUMN proof_photo_url LONGTEXT DEFAULT NULL",
      // Live GPS tracking columns
      "ALTER TABLE shipment ADD COLUMN driver_lat DECIMAL(10,8) DEFAULT NULL",
      "ALTER TABLE shipment ADD COLUMN driver_lng DECIMAL(11,8) DEFAULT NULL",
      "ALTER TABLE shipment ADD COLUMN driver_location_updated_at DATETIME DEFAULT NULL",
      `INSERT IGNORE INTO proof_of_delivery (delivery_number, tenant_id, photo, receiver_name, notes, created_at)
       SELECT s.delivery_number, s.tenant_id, s.proof_photo_url, s.receiver_name, 'Auto-backfilled', s.created_at
       FROM shipment s
       WHERE s.status = 'Delivered'
       AND NOT EXISTS (SELECT 1 FROM proof_of_delivery p WHERE p.delivery_number = s.delivery_number AND p.tenant_id = s.tenant_id)`,
      // ─── FOREIGN KEY CONSTRAINTS (ERD relationships) ──────────────────────
      "ALTER TABLE STAFF ADD CONSTRAINT fk_staff_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE APP_USER ADD CONSTRAINT fk_appuser_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE shipment ADD CONSTRAINT fk_shipment_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE shipment ADD CONSTRAINT fk_shipment_client FOREIGN KEY (client_id) REFERENCES client(client_id) ON DELETE SET NULL",
      "ALTER TABLE vehicle ADD CONSTRAINT fk_vehicle_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE route ADD CONSTRAINT fk_route_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE payment ADD CONSTRAINT fk_payment_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE client ADD CONSTRAINT fk_client_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE proof_of_delivery ADD CONSTRAINT fk_pod_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE DELIVERY_CHAT ADD CONSTRAINT fk_chat_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE NOTIFICATION ADD CONSTRAINT fk_notification_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE SAVED_ADDRESS ADD CONSTRAINT fk_savedaddr_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE SHIPMENT_HISTORY ADD CONSTRAINT fk_shiphistory_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE VEHICLE_REQUEST ADD CONSTRAINT fk_vreq_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE DELIVERY_RATING ADD CONSTRAINT fk_rating_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE decline_reasons ADD CONSTRAINT fk_decline_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      "ALTER TABLE SUBSCRIPTION_PAYMENT ADD CONSTRAINT fk_subpay_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE CASCADE",
      // Sub-tables → shipment
      "ALTER TABLE sub_package ADD CONSTRAINT fk_subpkg_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE",
      "ALTER TABLE sub_food ADD CONSTRAINT fk_subfood_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE",
      "ALTER TABLE sub_document ADD CONSTRAINT fk_subdoc_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE",
      "ALTER TABLE sub_vehicle ADD CONSTRAINT fk_subveh_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE",
      "ALTER TABLE sub_bulk ADD CONSTRAINT fk_subbulk_shipment FOREIGN KEY (delivery_number) REFERENCES shipment(delivery_number) ON DELETE CASCADE",

      // ─── PHASE 2: Defense Revisions ─────────────────────────────────────────
      // #5 — AUDIT_LOG FK to TENANT (via tenant_slug → slug)
      "ALTER TABLE AUDIT_LOG ADD COLUMN tenant_id INT DEFAULT NULL",
      "UPDATE AUDIT_LOG a JOIN TENANT t ON a.tenant_slug = t.slug SET a.tenant_id = t.tenant_id WHERE a.tenant_id IS NULL",
      "ALTER TABLE AUDIT_LOG ADD CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id) ON DELETE SET NULL",

      // #4 — Vehicle ownership type (company-owned vs employee-owned)
      "ALTER TABLE vehicle ADD COLUMN ownership_type ENUM('company','employee') DEFAULT 'company'",
      // #14 — Vehicle image
      "ALTER TABLE vehicle ADD COLUMN image_url LONGTEXT DEFAULT NULL",

      // #17 — Plan-based limits stored on TENANT
      "ALTER TABLE TENANT ADD COLUMN max_vehicles INT DEFAULT NULL",
      "ALTER TABLE TENANT ADD COLUMN max_distance_km INT DEFAULT 100",

      // #22 — Ensure driver accounts auto-activate (already 'Available' status on insert, this is a safety net)
      // Set any lingering 'pending' driver accounts to 'Available'
      "UPDATE STAFF SET status = 'Available' WHERE role = 'Driver' AND (status IS NULL OR status = 'pending' OR status = '')",

      // #6 — Driver's license required columns (already exist from previous migrations, adding OR/CR for staff)
      "ALTER TABLE STAFF ADD COLUMN or_cr_url LONGTEXT DEFAULT NULL",
    ];
    for (const sql of migrations) {
      try {
        await pool.execute(sql);
        console.log('  ✅ Migration applied:', sql.substring(0, 60) + '...');
      } catch (e) {
        // 1060 = Duplicate column, 1061 = Duplicate key name, 1022 = Duplicate key, 1826 = Duplicate FK, 1050 = Table exists, 1068 = Key exists
        if ([1060, 1061, 1022, 1826, 1050, 1068].includes(e.errno)) {
          // Already exists — skip silently
        } else {
          console.warn('  ⚠️  Migration skipped:', e.message);
        }
      }
    }
    console.log('  ✅ All migrations checked.');
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Execute a query with params.
 * Always returns [rows, fields].
 */
async function query(sql, params = []) {
  return pool.execute(sql, params);
}

/**
 * Tenant-scoped query helper.
 * EVERY query that touches tenant data MUST use this so tenant_id
 * is always appended — prevents accidental cross-tenant leakage.
 *
 * Usage:
 *   const rows = await tenantQuery(tenantId, 'SELECT * FROM SHIPMENT WHERE status = ?', ['Pending']);
 *   // Executes: SELECT * FROM SHIPMENT WHERE status = ? AND tenant_id = ?
 */
async function tenantQuery(tenantId, sql, params = []) {
  if (!tenantId) throw new Error('tenantQuery called without tenantId — isolation breach prevented');

  // Append AND tenant_id = ? to WHERE clause, or add WHERE if none exists
  let safeSql;
  const upperSql = sql.trim().toUpperCase();

  if (upperSql.includes('WHERE')) {
    safeSql = sql + ' AND tenant_id = ?';
  } else if (
    upperSql.startsWith('SELECT') ||
    upperSql.startsWith('UPDATE') ||
    upperSql.startsWith('DELETE')
  ) {
    safeSql = sql + ' WHERE tenant_id = ?';
  } else {
    // INSERT — caller must include tenant_id in the values
    safeSql = sql;
    return pool.execute(safeSql, [...params]);
  }

  return pool.execute(safeSql, [...params, tenantId]);
}

/**
 * Get a single row by primary key, scoped to tenant.
 */
async function findOne(table, conditions, tenantId) {
  const keys   = Object.keys(conditions);
  const values = Object.values(conditions);
  const where  = keys.map(k => `${k} = ?`).join(' AND ');
  const [rows] = await pool.execute(
    `SELECT * FROM \`${table}\` WHERE ${where} AND tenant_id = ? LIMIT 1`,
    [...values, tenantId]
  );
  return rows[0] || null;
}

/**
 * Get tenant record by slug (used on every page load for isolation check).
 */
async function getTenantBySlug(slug) {
  const [rows] = await pool.execute(
    'SELECT * FROM TENANT WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

/**
 * Get tenant record by id.
 */
async function getTenantById(tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM TENANT WHERE tenant_id = ? LIMIT 1',
    [tenantId]
  );
  return rows[0] || null;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 * @param {object} opts
 * @param {string} opts.actor        - email or identifier of who did it
 * @param {string} [opts.actor_type] - 'superadmin' | 'admin' | 'system'
 * @param {string} opts.action       - short description e.g. 'DELETE_TENANT'
 * @param {string} [opts.target]     - what was affected e.g. tenant name
 * @param {string} [opts.tenant_slug]- slug of the workspace
 * @param {string} [opts.ip_address] - request IP
 * @param {object} [opts.metadata]   - any extra JSON data
 */
async function logAudit({ actor, actor_type = 'superadmin', action, target, tenant_slug, ip_address, metadata } = {}) {
  try {
    await pool.execute(
      'INSERT INTO AUDIT_LOG (actor, actor_type, action, target, tenant_slug, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        actor       || 'system',
        actor_type  || 'superadmin',
        action      || 'UNKNOWN',
        target      || null,
        tenant_slug || null,
        ip_address  || null,
        metadata    ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (e) {
    console.error('[audit] Failed to write log:', e.message);
  }
}

module.exports = { pool, query, tenantQuery, findOne, getTenantBySlug, getTenantById, logAudit };

