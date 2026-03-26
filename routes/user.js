'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireUser } = require('../middleware/auth');
const { sendRegistrationEmail } = require('../config/mailer');

const router = express.Router({ mergeParams: true });

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG / MIGRATION
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
  // Add status column to CLIENT if missing
  await run(`ALTER TABLE CLIENT ADD COLUMN status VARCHAR(50) DEFAULT 'active'`);
  // Add app_download_url and app_name to TENANT if missing
  await run(`ALTER TABLE TENANT ADD COLUMN app_download_url VARCHAR(1000)`);
  await run(`ALTER TABLE TENANT ADD COLUMN app_name VARCHAR(255)`);
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

// ─────────────────────────────────────────────────────────────────────────────
// TENANT INFO (public)
// ─────────────────────────────────────────────────────────────────────────────
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
// STAFF REGISTER
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER REGISTER
// Creates APP_USER + syncs to CLIENT table so admin can see them
// ─────────────────────────────────────────────────────────────────────────────
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

    // Sync to CLIENT table so admin Client Directory shows them
    // CLIENT.company_name = full name, contact_person = full name
    const [existingClient] = await query(
      'SELECT client_id FROM CLIENT WHERE tenant_id = ? AND username = ? LIMIT 1',
      [tenantId, email]
    );
    if (!existingClient.length) {
      await query(
        `INSERT INTO CLIENT (tenant_id, company_name, contact_person, phone_number, username, password_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [tenantId, fullName, fullName, phone || null, email, hash]
      );
    } else {
      // Update existing CLIENT record to keep in sync
      await query(
        `UPDATE CLIENT SET company_name = ?, contact_person = ?, phone_number = ?, status = 'active' WHERE tenant_id = ? AND username = ?`,
        [fullName, fullName, phone || null, tenantId, email]
      );
    }

    // Generate JWT token
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

    // 10-minute QR token (for page scan)
    const qrToken = jwt.sign(
      { slug, tenant_id: tenantId, type: 'app_download' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Permanent email token (no expiry)
    const emailToken = jwt.sign(
      { slug, tenant_id: tenantId, type: 'app_download' },
      process.env.JWT_SECRET
    );

    // Get tenant app info
    const [tenantData] = await query(
      'SELECT app_download_url, app_name FROM TENANT WHERE tenant_id = ? LIMIT 1',
      [tenantId]
    );
    const downloadUrl = tenantData[0]?.app_download_url || null;

    // Send email with permanent download link
    sendRegistrationEmail(
      email,
      fullName,
      companyName,
      slug,
      downloadUrl,
      emailToken
    ).catch(e => console.error('Email error:', e.message));

    res.status(201).json({
      ok:       true,
      user_id:  userId,
      name:     fullName,
      token,
      qr_token: qrToken,
    });

  } catch (err) {
    console.error('[CUST REG] Error:', err);
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
});

router.get('/register',       (req, res) => res.json({ message: 'Use POST to register a customer.' }));
router.get('/staff/register', (req, res) => res.json({ message: 'Use POST to register staff.' }));
router.get('/login',          (req, res) => res.json({ message: 'Use POST to login.' }));
router.get('/staff-login',    (req, res) => res.json({ message: 'Use POST for staff-login.' }));

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER LOGIN — returns { token, user } for mobile app
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// STAFF LOGIN
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
  res.cookie(cookieName, token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*3600*1000 });
  res.json({ ok: true, name: staff.name, role: staff.role, slug });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /me — returns logged-in user profile
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
// GET /my-shipments — shipments for logged-in client (mobile dashboard)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-shipments', requireUser, async (req, res) => {
  try {
    const { user_id, tenant_id } = req.user;

    // Find the CLIENT record linked to this APP_USER by email
    const [userRows] = await query(
      'SELECT email FROM APP_USER WHERE user_id = ? AND tenant_id = ? LIMIT 1',
      [user_id, tenant_id]
    );
    if (!userRows.length) return res.status(404).json({ error: 'User not found.' });

    const email = userRows[0].email;
    const [clientRows] = await query(
      'SELECT client_id FROM CLIENT WHERE tenant_id = ? AND username = ? LIMIT 1',
      [tenant_id, email]
    );

    if (!clientRows.length) {
      // No client record yet — return empty
      return res.json({ shipments: [], stats: { total: 0, pending: 0, in_transit: 0, delivered: 0 } });
    }

    const clientId = clientRows[0].client_id;

    const [shipments] = await query(
      `SELECT s.delivery_number, s.status, s.pickup_location, s.dropoff_location,
              s.item_type_flag, s.created_at,
              r.route_name,
              d.name AS driver_name
       FROM SHIPMENT s
       LEFT JOIN ROUTE r ON r.route_id = s.route_id
       LEFT JOIN STAFF d ON d.staff_id = s.assigned_driver_id
       WHERE s.tenant_id = ? AND s.client_id = ?
       ORDER BY s.created_at DESC`,
      [tenant_id, clientId]
    );

    const stats = {
      total:      shipments.length,
      pending:    shipments.filter(s => s.status === 'Pending').length,
      in_transit: shipments.filter(s => s.status === 'In-Transit').length,
      delivered:  shipments.filter(s => s.status === 'Delivered').length,
    };

    res.json({ shipments, stats });
  } catch (err) {
    console.error('my-shipments error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('user_token');
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /app-download — validates QR token, returns tenant-scoped APK URL
// ─────────────────────────────────────────────────────────────────────────────
router.get('/app-download', async (req, res) => {
  const { slug } = req.params;
  const { token } = req.query;

  try {
    // If token provided, validate it
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.type !== 'app_download' || payload.slug !== slug) {
        return res.status(401).json({ error: 'Invalid or expired QR code.' });
      }
    }

    const [rows] = await query(
      'SELECT app_download_url, app_name, company_name FROM TENANT WHERE slug = ? AND status = "active" LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found.' });

    const tenant = rows[0];
    if (!tenant.app_download_url) {
      return res.status(404).json({ error: 'App not available yet. Contact your admin.' });
    }

    res.json({
      download_url: tenant.app_download_url,
      // App name is tenant company name so it shows "Amogus" or "Geloop" etc.
      app_name:     tenant.app_name || tenant.company_name,
    });

  } catch (e) {
    return res.status(401).json({ error: 'QR code expired. Please re-register or request a new link.' });
  }
});

module.exports = router;