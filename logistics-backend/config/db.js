'use strict';

const mysql = require('mysql2/promise');

// ─── Connection Pool ──────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  database:           process.env.DB_NAME     || 'logistics_os',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

// ─── Test connection on startup ───────────────────────────────────────────────
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected:', process.env.DB_NAME);
    conn.release();
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

module.exports = { pool, query, tenantQuery, findOne, getTenantBySlug, getTenantById };
