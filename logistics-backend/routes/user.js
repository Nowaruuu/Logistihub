'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /:slug/api/staff/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:slug/api/staff/register', async (req, res) => {
  const { slug } = req.params;
  const start = Date.now();
  console.log(`[STAFF REG] Starting for slug: ${slug}`);

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

    const [result] = await query(
      `INSERT INTO STAFF (tenant_id, name, role, username, password_hash, status, phone, employee_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'Available', ?, ?, NOW())`,
      [tenantId, fullName, role, email, hash, phone || null, employee_id || null]
    );

    console.log(`[STAFF REG] Completed in ${Date.now() - start}ms`);

    const token = jwt.sign(
      { role, staff_id: result.insertId, tenant_id: tenantId, slug, name: fullName, email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('staff_token', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*3600*1000 });
    res.status(201).json({ ok:true, staff_id: result.insertId, name: fullName });

  } catch (err) {
    console.error(`[STAFF REG ERROR] ${err.message}`, err);
    // Explicitly check for "Unknown column" as it's the most likely cause of 500 here
    if (err.message.includes('Unknown column')) {
      return res.status(500).json({
        error: 'Database schema mismatch. Please ensure migration_v2.sql has been applied.',
        details: err.message
      });
    }
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /:slug/api/register (General Client Registration)
// Called when a user submits the registration form on the tenant's private page.
// The tenant_id is resolved from the slug — the user never supplies it.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:slug/api/register', async (req, res) => {
  const { slug } = req.params;

  // Resolve tenant from slug — ISOLATION: the tenant_id is derived server-side
  const [tenants] = await query(
    "SELECT tenant_id, company_name, status FROM TENANT WHERE slug = ? LIMIT 1",
    [slug]
  );
  if (!tenants.length || tenants[0].status !== 'active') {
    return res.status(404).json({ error: 'This registration page is not available.' });
  }
  const tenant = tenants[0];
  const tenantId = tenant.tenant_id;

  const { first_name, last_name, email, phone, employee_id, role, password } = req.body;

  // Basic validation
  if (!first_name || !last_name || !email || !role || !password) {
    return res.status(400).json({ error: 'first_name, last_name, email, role, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const validRoles = ['Driver','Helper','Dispatcher','Warehouse Staff','Supervisor','Other'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  // Check email uniqueness within this tenant only
  const [existing] = await query(
    'SELECT user_id FROM APP_USER WHERE tenant_id = ? AND email = ? LIMIT 1',
    [tenantId, email]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists for this company.' });
  }

  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

  const [result] = await query(
    `INSERT INTO APP_USER
       (tenant_id, first_name, last_name, email, phone, employee_id, role, password_hash, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,'active',NOW())`,
    [tenantId, first_name, last_name, email, phone||null, employee_id||null, role, hash]
  );

  // Build JWT for immediate use
  const token = jwt.sign(
    { role: 'user', user_id: result.insertId, tenant_id: tenantId, slug, name: `${first_name} ${last_name}`, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.cookie('user_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000,
  });

  res.status(201).json({
    ok:           true,
    user_id:      result.insertId,
    name:         `${first_name} ${last_name}`,
    email,
    role,
    company_name: tenant.company_name,
    message:      'Account created. Please download the app to get started.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /:slug/api/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:slug/api/login', async (req, res) => {
  const { slug } = req.params;
  const { email, password } = req.body;

  const [tenants] = await query(
    "SELECT tenant_id, status FROM TENANT WHERE slug = ? LIMIT 1",
    [slug]
  );
  if (!tenants.length || tenants[0].status !== 'active') {
    return res.status(404).json({ error: 'Workspace not found.' });
  }
  const tenantId = tenants[0].tenant_id;

  const [rows] = await query(
    "SELECT * FROM APP_USER WHERE tenant_id = ? AND email = ? AND status = 'active' LIMIT 1",
    [tenantId, email]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  const user = rows[0];

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { role: 'user', user_id: user.user_id, tenant_id: tenantId, slug, name: `${user.first_name} ${user.last_name}`, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.cookie('user_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000,
  });

  res.json({ ok: true, name: user.first_name, slug });
});

// POST /:slug/api/staff-login
router.post('/:slug/api/staff-login', async (req, res) => {
  const { slug } = req.params;
  const { email, password } = req.body;
  const [tenants] = await query(
    "SELECT tenant_id, status FROM TENANT WHERE slug = ? LIMIT 1",
    [slug]
  );
  if (!tenants.length || tenants[0].status !== 'active') {
    return res.status(404).json({ error: 'Workspace not found.' });
  }
  const tenantId = tenants[0].tenant_id;
  const [rows] = await query(
    "SELECT * FROM STAFF WHERE tenant_id = ? AND username = ? AND status = 'Available' LIMIT 1",
    [tenantId, email]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  const staff = rows[0];
  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
  const token = jwt.sign(
    { role: staff.role, staff_id: staff.staff_id, tenant_id: tenantId, slug, name: staff.name, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  const cookieName = staff.role === 'Admin' ? 'admin_token' : 'staff_token';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.json({ ok: true, name: staff.name, role: staff.role, slug });
});

module.exports = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /:slug/api/me  — get current user's profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/me', requireUser, async (req, res) => {
  const [rows] = await query(
    'SELECT user_id, first_name, last_name, email, phone, role, status, created_at FROM APP_USER WHERE user_id = ? AND tenant_id = ? LIMIT 1',
    [req.user.user_id, req.tenantId]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found.' });
  res.json(rows[0]);
});

// POST /:slug/api/logout
router.post('/:slug/api/logout', (req, res) => {
  res.clearCookie('user_token');
  res.json({ ok: true });
});

module.exports = router;
