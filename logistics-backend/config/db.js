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
  connectTimeout:     10000, 
  enableKeepAlive:    true,
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

pool.on('acquire', (connection) => {
  // console.log('Connection %d acquired', connection.threadId);
});

pool.on('enqueue', () => {
  console.warn('⚠️  Waiting for available connection slot');
});

pool.on('release', (connection) => {
  // console.log('Connection %d released', connection.threadId);
});

// ─── Telemetry Wrapper ────────────────────────────────────────────────────────

/**
 * Executes a SQL statement with telemetry (duration logging and error reporting).
 */
async function executeWithTelemetry(sql, params = []) {
  const start = Date.now();
  try {
    const res = await pool.execute(sql, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] ${duration}ms: ${sql.substring(0, 500)}`);
    }
    return res;
  } catch (err) {
    console.error(`[DB ERROR] ${err.message} (SQL: ${sql.substring(0, 500)})`);
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Execute a query with params.
 * Always returns [rows, fields].
 */
async function query(sql, params = []) {
  return executeWithTelemetry(sql, params);
}

/**
 * Tenant-scoped query helper.
 */
async function tenantQuery(tenantId, sql, params = []) {
  if (!tenantId) throw new Error('tenantQuery called without tenantId — isolation breach prevented');

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
    return executeWithTelemetry(safeSql, [...params]);
  }

  return executeWithTelemetry(safeSql, [...params, tenantId]);
}

/**
 * Get a single row by primary key, scoped to tenant.
 */
async function findOne(table, conditions, tenantId) {
  const keys   = Object.keys(conditions);
  const values = Object.values(conditions);
  const where  = keys.map(k => `${k} = ?`).join(' AND ');
  const [rows] = await executeWithTelemetry(
    `SELECT * FROM \`${table}\` WHERE ${where} AND tenant_id = ? LIMIT 1`,
    [...values, tenantId]
  );
  return rows[0] || null;
}

/**
 * Get tenant record by slug.
 */
async function getTenantBySlug(slug) {
  const [rows] = await executeWithTelemetry(
    'SELECT * FROM TENANT WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

/**
 * Get tenant record by id.
 */
async function getTenantById(tenantId) {
  const [rows] = await executeWithTelemetry(
    'SELECT * FROM TENANT WHERE tenant_id = ? LIMIT 1',
    [parseInt(tenantId)]
  );
  return rows[0] || null;
}

module.exports = { pool, query, tenantQuery, findOne, getTenantBySlug, getTenantById };
