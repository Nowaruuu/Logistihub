'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireUser } = require('../middleware/auth');
const { sendRegistrationEmail } = require('../config/mailer');

const router = express.Router({ mergeParams: true });

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG / MIGRATION (TEMPORARY)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/debug-db-migration', async (req, res) => {
  const results = [];
  const run = async (sql) => {
    try {
      await query(sql);
      results.push({ sql: sql.substring(0, 60) + '...', status: 'SUCCESS' });
    } catch (err) {
      if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
        results.push({ sql: sql.substring(0, 60) + '...', status: 'EXISTS' });
      } else {
        results.push({ sql: sql.substring(0, 60) + '...', status: 'ERROR', message: err.message });
      }
    }
  };

  // 1. Fix STAFF Table
  await run(`ALTER TABLE STAFF ADD COLUMN first_name VARCHAR(255)`);
  await run(`ALTER TABLE STAFF ADD COLUMN last_name VARCHAR(255)`);
  await run(`ALTER TABLE STAFF ADD COLUMN phone VARCHAR(100)`);
  await run(`ALTER TABLE STAFF ADD COLUMN employee_id VARCHAR(100)`);
  await run(`ALTER TABLE STAFF ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

  // 2. Fix APP_USER Table (ensure it has role and employee_id)
  await run(`CREATE TABLE IF NOT EXISTS APP_USER (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    password_hash VARCHAR(255),
    address VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES TENANT(tenant_id)
  )`);
  await run(`ALTER TABLE APP_USER ADD COLUMN role VARCHAR(100) DEFAULT 'Other'`);
  await run(`ALTER TABLE APP_USER ADD COLUMN employee_id VARCHAR(100)`);

  res.json({ 
    message: "Precise Migration completed based on provided schema.", 
    results,
    note: "Please restart the server after this succeeds." 
  });
});

router.get('/debug-env', (req, res) => {
  res.json({
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    NODE_ENV: process.env.NODE_ENV,
    CWD: process.cwd()
  });
});

router.get('/tenant-info', async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await query(
      'SELECT tenant_id, company_name, business_type, slug, plan, status FROM TENANT WHERE slug = ? AND status = "active" LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).json({ message: 'Workspace not found.' });
    res.json({ tenant: rows[0] });
  } catch (err) {
    console.error('tenant-info error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /staff/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/staff/register', async (req, res) => {
  const { slug } = req.params;
  console.log(`[STAFF REG] Starting for slug: ${slug}`, req.body);

  try {
    const [tenants] = await query("SELECT tenant_id, status FROM TENANT WHERE slug = ? LIMIT 1", [slug]);
    if (!tenants.length || tenants[0].status !== 'active') return res.status(404).json({ error: 'Workspace not found.' });
    const tenantId = tenants[0].tenant_id;

    const { first_name, last_name, email, phone, employee_id, role, password } = req.body;
    if (!first_name || !last_name || !email || !role || !password) return res.status(400).json({ error: 'Missing required fields.' });

    const [existing] = await query('SELECT staff_id FROM STAFF WHERE tenant_id = ? AND username = ? LIMIT 1', [tenantId, email]);
    if (existing.length > 0) return res.status(409).json({ error: 'This email is already registered as staff.' });

    const hash = await bcrypt.hash(password, 12);
    const fullName = `${first_name} ${last_name}`;

    const allowedRoles = ['Document Controller', 'Driver'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    console.log(`[STAFF REG] Params:`, [tenantId, fullName, first_name, last_name, role, email, hash, phone || null, employee_id || null]);
    const [result] = await query(
      `INSERT INTO STAFF (tenant_id, name, first_name, last_name, role, username, password_hash, status, phone, employee_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, NOW())`,
      [tenantId, fullName, first_name, last_name, role, email, hash, phone || null, employee_id || null]
    );
    console.log(`[STAFF REG] Insert success:`, result.insertId);

    const token = jwt.sign(
      { role, staff_id: result.insertId, tenant_id: tenantId, slug, name: fullName, email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('staff_token', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*3600*1000 });
    res.status(201).json({ ok:true, staff_id: result.insertId, name: fullName });

  } catch (err) {
    console.error('[STAFF REG] Critical Error:', err);
    res.status(500).json({ 
      error: 'Internal server error.', 
      details: err.message // Force details for immediate debugging
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /register (Customer)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { slug } = req.params;
  console.log(`[CUST REG] Starting for slug: ${slug}`, req.body);
  
  try {
    const [tenants] = await query("SELECT tenant_id, company_name, status FROM TENANT WHERE slug = ? LIMIT 1", [slug]);
    if (!tenants.length || tenants[0].status !== 'active') {
      console.warn(`[CUST REG] Workspace not found or inactive: ${slug}`);
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const tenantId = tenants[0].tenant_id;

    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      console.warn(`[CUST REG] Missing fields:`, { first_name, last_name, email, hasPassword: !!password });
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    console.log(`[CUST REG] Checking existing user for: ${email}`);
    const [existing] = await query('SELECT user_id FROM APP_USER WHERE tenant_id = ? AND email = ? LIMIT 1', [tenantId, email]);
    if (existing.length > 0) {
      console.warn(`[CUST REG] Conflict: Email already registered: ${email}`);
      return res.status(409).json({ error: 'Email already registered.' });
    }

    console.log(`[CUST REG] Hashing password...`);
    const hash = await bcrypt.hash(password, 12);
    
    console.log(`[CUST REG] Inserting into APP_USER table...`);
    const [result] = await query(
      `INSERT INTO APP_USER (tenant_id, first_name, last_name, email, phone, role, password_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Other', ?, 'active', NOW())`,
      [tenantId, first_name, last_name, email, phone||null, hash]
    );
    console.log(`[CUST REG] Insert success, ID:`, result.insertId);

    const token = jwt.sign(
      { role: 'user', user_id: result.insertId, tenant_id: tenantId, slug, name: `${first_name} ${last_name}`, email },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );

    res.cookie('user_token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict', 
      maxAge: 8*3600*1000 
    });

    // Non-blocking email
    console.log(`[CUST REG] Sending welcome email...`);
    sendRegistrationEmail(email, `${first_name} ${last_name}`, tenants[0].company_name, slug)
      .then(() => console.log(`[CUST REG] Email sent successfully to ${email}`))
      .catch(e => console.error(`[CUST REG] Async email error for ${email}: ${e.message}`));

    res.status(201).json({ ok: true, user_id: result.insertId, name: `${first_name} ${last_name}` });

  } catch (err) {
    console.error('[CUST REG] Critical Error:', err);
    // Returning 500 with message prevents 504 timeouts by closing the connection immediately
    res.status(500).json({ 
      error: 'Internal server error during customer registration.',
      details: err.message // Force details for immediate debugging
    });
  }
});

// Helper for debugging manual browser tests
router.get('/register', (req, res) => res.json({ message: 'Use POST to register a customer.' }));
router.get('/staff/register', (req, res) => res.json({ message: 'Use POST to register staff.' }));
router.get('/login', (req, res) => res.json({ message: 'Use POST to login.' }));
router.get('/staff-login', (req, res) => res.json({ message: 'Use POST for staff-login.' }));

// ─────────────────────────────────────────────────────────────────────────────
// POST /login (Customer)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { slug } = req.params;
  const { email, password } = req.body;

  const [tenants] = await query("SELECT tenant_id, status FROM TENANT WHERE slug = ? LIMIT 1", [slug]);
  if (!tenants.length || tenants[0].status !== 'active') return res.status(404).json({ error: 'Workspace not found.' });
  const tenantId = tenants[0].tenant_id;

  const [rows] = await query("SELECT * FROM APP_USER WHERE tenant_id = ? AND email = ? AND status = 'active' LIMIT 1", [tenantId, email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  const user = rows[0];

  if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { role: 'user', user_id: user.user_id, tenant_id: tenantId, slug, name: `${user.first_name} ${user.last_name}`, email },
    process.env.JWT_SECRET, { expiresIn: '8h' }
  );
  res.cookie('user_token', token, {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   8 * 3600 * 1000
});
res.json({
  ok:    true,
  token,
  user: {
    user_id:    user.user_id,
    first_name: user.first_name,
    last_name:  user.last_name,
    email:      user.email,
    phone:      user.phone || null,
    role:       user.role  || 'user',
    status:     user.status,
    tenant_id:  tenantId,
  }
});
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /staff-login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/staff-login', async (req, res) => {
  const { slug } = req.params;
  const { email, password } = req.body;

  const [tenants] = await query("SELECT tenant_id, status FROM TENANT WHERE slug = ? LIMIT 1", [slug]);
  if (!tenants.length || tenants[0].status !== 'active') return res.status(404).json({ error: 'Workspace not found.' });
  const tenantId = tenants[0].tenant_id;

  const [rows] = await query("SELECT * FROM STAFF WHERE tenant_id = ? AND username = ? AND (status = 'Available' OR status IS NULL) LIMIT 1", [tenantId, email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  
  const staff = rows[0];
  if (!await bcrypt.compare(password, staff.password_hash)) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { role: staff.role, staff_id: staff.staff_id, tenant_id: tenantId, slug, name: staff.name, email },
    process.env.JWT_SECRET, { expiresIn: '8h' }
  );

  const cookieName = staff.role === 'Admin' ? 'admin_token' : 'staff_token';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000,
  });

  res.json({ ok: true, name: staff.name, role: staff.role, slug, token });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /me  (PROTECTED)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireUser, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT user_id, tenant_id, first_name, last_name, email, phone, address, status, created_at
       FROM APP_USER WHERE user_id = ? AND tenant_id = ? LIMIT 1`,
      [req.user.user_id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('user_token');
  res.json({ ok: true });
});

module.exports = router;