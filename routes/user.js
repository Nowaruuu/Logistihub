'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireUser } = require('../middleware/auth');
const { sendRegistrationEmail } = require('../config/mailer');

const router = express.Router({ mergeParams: true });

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
  await run(`ALTER TABLE STAFF ADD COLUMN first_name VARCHAR(255)`);
  await run(`ALTER TABLE STAFF ADD COLUMN last_name VARCHAR(255)`);
  await run(`ALTER TABLE STAFF ADD COLUMN phone VARCHAR(100)`);
  await run(`ALTER TABLE STAFF ADD COLUMN employee_id VARCHAR(100)`);
  await run(`ALTER TABLE STAFF ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
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
  res.json({ message: "Migration completed.", results });
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

router.post('/staff/register', async (req, res) => {
  const { slug } = req.params;
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
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role selected.' });
    const [result] = await query(
      `INSERT INTO STAFF (tenant_id, name, first_name, last_name, role, username, password_hash, status, phone, employee_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, NOW())`,
      [tenantId, fullName, first_name, last_name, role, email, hash, phone || null, employee_id || null]
    );
    const token = jwt.sign(
      { role, staff_id: result.insertId, tenant_id: tenantId, slug, name: fullName, email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('staff_token', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*3600*1000 });
    res.status(201).json({ ok:true, staff_id: result.insertId, name: fullName });
  } catch (err) {
    console.error('[STAFF REG] Error:', err);
    res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

router.post('/register', async (req, res) => {
  const { slug } = req.params;
  console.log(`[CUST REG] Starting for slug: ${slug}`, req.body);

  try {
    const [tenants] = await query(
      "SELECT tenant_id, company_name, status FROM TENANT WHERE slug = ? LIMIT 1",
      [slug]
    );
    if (!tenants.length || tenants[0].status !== 'active') {
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const tenantId    = tenants[0].tenant_id;
    const companyName = tenants[0].company_name;

    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Check existing APP_USER
    const [existing] = await query(
      'SELECT user_id FROM APP_USER WHERE tenant_id = ? AND email = ? LIMIT 1',
      [tenantId, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hash     = await bcrypt.hash(password, 12);
    const fullName = `${first_name} ${last_name}`;

    // Insert APP_USER
    const [result] = await query(
      `INSERT INTO APP_USER (tenant_id, first_name, last_name, email, phone, role, password_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Other', ?, 'active', NOW())`,
      [tenantId, first_name, last_name, email, phone || null, hash]
    );
    const userId = result.insertId;

    // Also create/update CLIENT record so admin can see them and assign shipments
    const [existingClient] = await query(
      'SELECT client_id FROM CLIENT WHERE tenant_id = ? AND username = ? LIMIT 1',
      [tenantId, email]
    );
    if (!existingClient.length) {
      await query(
        `INSERT INTO CLIENT (tenant_id, company_name, contact_person, phone_number, username, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, fullName, fullName, phone || null, email, hash]
      );
    }

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { role: 'user', user_id: userId, tenant_id: tenantId, slug, name: fullName, email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('user_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   8 * 3600 * 1000
    });

    // Generate a 10-minute QR token
    const qrToken = jwt.sign(
      { slug, tenant_id: tenantId, type: 'app_download' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Generate permanent email token (no expiry)
    const emailToken = jwt.sign(
      { slug, tenant_id: tenantId, type: 'app_download' },
      process.env.JWT_SECRET
    );

    // Get app download URL from tenant
    const [tenantData] = await query(
      'SELECT app_download_url, app_name FROM TENANT WHERE tenant_id = ? LIMIT 1',
      [tenantId]
    );
    const downloadUrl = tenantData[0]?.app_download_url || null;

    // Send registration email with permanent download link
    sendRegistrationEmail(
      email,
      fullName,
      companyName,
      slug,
      downloadUrl,
      emailToken
    ).catch(e => console.error('Email error:', e.message));

    res.status(201).json({
      ok:        true,
      user_id:   userId,
      name:      fullName,
      token,
      qr_token:  qrToken,  // 10-minute token for page QR
    });

  } catch (err) {
    console.error('[CUST REG] Error:', err);
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
});

router.get('/register', (req, res) => res.json({ message: 'Use POST to register a customer.' }));
router.get('/staff/register', (req, res) => res.json({ message: 'Use POST to register staff.' }));
router.get('/login', (req, res) => res.json({ message: 'Use POST to login.' }));
router.get('/staff-login', (req, res) => res.json({ message: 'Use POST for staff-login.' }));

router.post('/login', async (req, res) => {
  const { slug } = req.params;
  const { email, password } = req.body;
  try {
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
    res.cookie('user_token', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*3600*1000 });
    res.json({
      token,
      user: {
        user_id:    user.user_id,
        tenant_id:  user.tenant_id,
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        phone:      user.phone,
        address:    user.address,
        status:     user.status,
        created_at: user.created_at,
      }
    });
  } catch (err) {
    console.error('[LOGIN] Error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

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
  res.cookie(cookieName, token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*3600*1000 });
  res.json({ ok: true, name: staff.name, role: staff.role, slug });
});

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

router.post('/logout', (req, res) => {
  res.clearCookie('user_token');
  res.json({ ok: true });
});

// GET /:slug/api/app-download — validates QR token and returns APK URL
router.get('/app-download', async (req, res) => {
  const { slug } = req.params;
  const { token } = req.query;

  try {
    // If token provided, validate it (10-min expiry for page QR)
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.type !== 'app_download' || payload.slug !== slug) {
        return res.status(401).json({ error: 'Invalid or expired QR code.' });
      }
    }

    const [rows] = await query(
      'SELECT app_download_url, app_name, company_name FROM TENANT WHERE slug = ? AND status = ? LIMIT 1',
      [slug, 'active']
    );
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found.' });

    const tenant = rows[0];
    if (!tenant.app_download_url) {
      return res.status(404).json({ error: 'App not available yet.' });
    }

    res.json({
      download_url: tenant.app_download_url,
      app_name:     tenant.app_name || tenant.company_name,
    });

  } catch (e) {
    return res.status(401).json({ error: 'QR code expired. Please re-register or request a new link.' });
  }
});

// GET /:slug/api/app-download — validates QR token and returns APK URL
router.get('/app-download', async (req, res) => {
  const { slug } = req.params;
  const { token } = req.query;

  try {
    // If token provided, validate it (10-min expiry for page QR)
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.type !== 'app_download' || payload.slug !== slug) {
        return res.status(401).json({ error: 'Invalid or expired QR code.' });
      }
    }

    const [rows] = await query(
      'SELECT app_download_url, app_name, company_name FROM TENANT WHERE slug = ? AND status = ? LIMIT 1',
      [slug, 'active']
    );
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found.' });

    const tenant = rows[0];
    if (!tenant.app_download_url) {
      return res.status(404).json({ error: 'App not available yet.' });
    }

    res.json({
      download_url: tenant.app_download_url,
      app_name:     tenant.app_name || tenant.company_name,
    });

  } catch (e) {
    return res.status(401).json({ error: 'QR code expired. Please re-register or request a new link.' });
  }
});

module.exports = router;