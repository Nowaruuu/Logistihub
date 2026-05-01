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
    ];
    for (const sql of migrations) {
      try {
        await pool.execute(sql);
        console.log('  ✅ Migration applied:', sql.substring(0, 60) + '...');
      } catch (e) {
        // Error 1060 = "Duplicate column name" — column already exists, safe to skip
        if (e.errno === 1060) {
          // Column already exists — skip silently
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

