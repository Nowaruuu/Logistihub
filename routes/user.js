'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, logAudit } = require('../config/db');
const { requireUser } = require('../middleware/auth');
const { sendRegistrationEmail, sendForgotCredentialsEmail, sendPasswordResetEmail, sendRegistrationOtpEmail } = require('../config/mailer');

const router = express.Router({ mergeParams: true });

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
      'SELECT tenant_id, company_name, business_type, slug, plan, status, logo_url FROM TENANT WHERE slug = ? AND status = "active" LIMIT 1',
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

    const [result] = await query(
      `INSERT INTO STAFF (tenant_id, name, first_name, last_name, role, username, password_hash, status, phone, employee_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, NOW())`,
      [tenantId, fullName, first_name, last_name, role, email, hash, phone || null, employee_id || null]
    );

    const token = jwt.sign(
      { role, staff_id: result.insertId, tenant_id: tenantId, slug, name: fullName, email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie(`staff_token_${req.params.slug}`, token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', maxAge:30*24*3600*1000 });
    res.status(201).json({ ok:true, staff_id: result.insertId, name: fullName, token });

  } catch (err) {
    console.error('[STAFF REG] Critical Error:', err);
    res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /register (Customer) - 2 Step OTP Flow
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const pendingRegistrations = new Map();

router.post('/register', async (req, res) => {
  const { slug } = req.params;
  
  try {
    const [tenants] = await query(
      "SELECT tenant_id, company_name, status FROM TENANT WHERE slug = ? LIMIT 1",
      [slug]
    );
    if (!tenants.length || tenants[0].status !== 'active') {
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const tenantId      = tenants[0].tenant_id;
    const companyName   = tenants[0].company_name;

    const { first_name, last_name, email, username, phone, password, otp } = req.body;
    if (!first_name || !last_name || !email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const loginEmail = `${safeUsername}@${slug}.com`;

    // ── Step 2: Verify OTP and Create Account ──
    if (otp) {
      const pending = pendingRegistrations.get(email);
      if (!pending || pending.expires < Date.now()) {
        return res.status(400).json({ error: 'OTP expired or invalid. Please request a new one.' });
      }
      if (pending.otp !== otp) {
        return res.status(400).json({ error: 'Incorrect OTP.' });
      }

      const [existing] = await query(
        'SELECT user_id FROM APP_USER WHERE tenant_id = ? AND email = ? LIMIT 1',
        [tenantId, loginEmail]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'That username is already taken. Choose another.' });
      }

      // Dynamically add contact_email column if it doesn't exist
      try {
        await query('ALTER TABLE APP_USER ADD COLUMN contact_email VARCHAR(255)');
      } catch (e) { /* Column probably already exists */ }

      const hash = await bcrypt.hash(password, 12);
      const [result] = await query(
        `INSERT INTO APP_USER (tenant_id, first_name, last_name, email, contact_email, phone, role, password_hash, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'user', ?, 'active', NOW())`,
        [tenantId, first_name, last_name, loginEmail, email, phone || null, hash]
      );

      pendingRegistrations.delete(email);

      const token = jwt.sign(
        { role: 'user', user_id: result.insertId, tenant_id: tenantId, slug, name: `${first_name} ${last_name}`, email: loginEmail },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const BASE_URL = process.env.BASE_URL || 'https://logistichub.ddns.net';
      const permanentLink = `${BASE_URL}/${slug}/get-app`;

      // Send Welcome & Credentials Email
      sendRegistrationEmail(email, `${first_name} ${last_name}`, companyName, slug, permanentLink)
        .catch(e => console.error(`[CUST REG] Async email error: ${e.message}`));

      return res.status(201).json({
        ok:           true,
        token:        token,
        login_email:  loginEmail,
        user: {
          user_id:    result.insertId,
          uid:        result.insertId,
          first_name, last_name,
          fullName:   `${first_name} ${last_name}`,
          email:      loginEmail,
          phone:      phone || null,
          role:       'user',
          status:     'active',
          tenant_id:  tenantId,
        }
      });
    }

    // ── Step 1: Generate OTP and send email ──
    // Check if username already exists before sending OTP
    const [existing] = await query(
      'SELECT user_id FROM APP_USER WHERE tenant_id = ? AND email = ? LIMIT 1',
      [tenantId, loginEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'That username is already taken. Choose another.' });
    }

    const generatedOtp = crypto.randomInt(100000, 999999).toString();
    pendingRegistrations.set(email, {
      otp: generatedOtp,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Using password reset template as a quick OTP email template
    await sendRegistrationOtpEmail(email, generatedOtp, companyName);

    res.json({ ok: true, message: 'OTP sent successfully to ' + email, require_otp: true, login_email: loginEmail });
    
  } catch (err) {
    console.error('[CUST REG] Critical Error:', err);
    res.status(500).json({ error: 'Internal server error.', details: err.message });
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
    process.env.JWT_SECRET, { expiresIn: '30d' }
  );
  res.cookie('user_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 3600 * 1000
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

  const [rows] = await query("SELECT * FROM STAFF WHERE tenant_id = ? AND username = ? LIMIT 1", [tenantId, email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  
  const staff = rows[0];
  if (staff.status === 'suspended') return res.status(403).json({ error: 'Account is suspended. Please contact your administrator.' });
  if (staff.status !== 'active' && staff.status !== 'Available' && staff.status !== null) return res.status(401).json({ error: 'Account is not active.' });
  
  if (!await bcrypt.compare(password, staff.password_hash)) return res.status(401).json({ error: 'Invalid credentials.' });

  // Keep original role for non-driver roles so frontend routing works
  const isDriver = (staff.role === 'Driver' || staff.role === 'driver');
  const tokenRole = isDriver ? 'driver' : (staff.role || 'driver');
  const returnRole = staff.role || 'driver'; // preserve exact DB value for routing

  const token = jwt.sign(
    { role: tokenRole, staff_id: staff.staff_id, tenant_id: tenantId, slug, name: staff.name, email },
    process.env.JWT_SECRET, { expiresIn: '30d' }
  );

  // Set appropriate cookie per role
  let cookieName = `staff_token_${req.params.slug}`;
  if (staff.role === 'Admin')   cookieName = `admin_token_${req.params.slug}`;
  if (staff.role === 'Manager') cookieName = 'manager_token';

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000,
  });

  // Log login event for audit trail
  const auditType = staff.role === 'Admin' ? 'admin' : staff.role === 'Manager' ? 'manager' : 'staff';
  const auditTarget = staff.role === 'Admin' ? 'Admin Dashboard' : staff.role === 'Manager' ? 'Manager Dashboard' : 'Staff App';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const realIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unknown';
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  logAudit({ actor: email, actor_type: auditType, action: 'LOGIN', target: auditTarget, tenant_slug: slug, ip_address: realIp, metadata: { user_agent: userAgent, ip: realIp, session_id: sessionId } });

  res.json({ ok: true, name: staff.name, role: returnRole, slug, token, must_change_password: !!staff.must_change_password, session_id: sessionId });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /change-password  — force change from temp password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { slug } = req.params;
  const { username, current_password, new_password } = req.body;
  if (!username || !current_password || !new_password) return res.status(400).json({ error: 'All fields are required.' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const [tenants] = await query("SELECT tenant_id FROM TENANT WHERE slug = ? LIMIT 1", [slug]);
  if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
  const tenantId = tenants[0].tenant_id;

  const [rows] = await query("SELECT * FROM STAFF WHERE tenant_id = ? AND username = ? LIMIT 1", [tenantId, username]);
  if (!rows.length) return res.status(401).json({ error: 'User not found.' });
  const staff = rows[0];

  if (!await bcrypt.compare(current_password, staff.password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
  if (current_password === new_password) return res.status(400).json({ error: 'New password must be different from the temporary password.' });

  const newHash = await bcrypt.hash(new_password, 10);
  await query('UPDATE STAFF SET password_hash = ?, must_change_password = 0 WHERE staff_id = ?', [newHash, staff.staff_id]);

  logAudit({ actor: username, actor_type: staff.role === 'Admin' ? 'admin' : 'staff', action: 'CHANGE_PASSWORD', target: 'Password Changed', tenant_slug: slug, ip_address: req.ip });
  res.json({ ok: true, message: 'Password changed successfully. Please sign in again.' });
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /me  (PROTECTED)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  // Accept both user_token (APP_USER) and staff_token (STAFF/drivers)
  const token = req.cookies?.user_token ||
                req.cookies?.[`staff_token_${req.params.slug}`] ||
                req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  let payload;
  try {
    payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  try {
    // STAFF (drivers, document controllers)
    if (payload.staff_id) {
      const [rows] = await query(
        `SELECT * FROM STAFF WHERE staff_id = ? AND tenant_id = ? LIMIT 1`,
        [payload.staff_id, payload.tenant_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Staff not found.' });
      const s = rows[0];
      const roleLower = (s.role || payload.role || 'driver').toLowerCase();

      // Fetch real rating + delivery count for drivers
      let avgRating = 0;
      let totalDeliveries = 0;
      if (roleLower === 'driver') {
        try {
          // Auto-create table if missing
          await query(`CREATE TABLE IF NOT EXISTS DELIVERY_RATING (
            rating_id INT AUTO_INCREMENT PRIMARY KEY,
            delivery_number VARCHAR(50) NOT NULL,
            tenant_id INT NOT NULL,
            user_id INT NOT NULL,
            driver_staff_id INT DEFAULT NULL,
            rating TINYINT NOT NULL,
            comment TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_delivery_rating (delivery_number, tenant_id)
          )`);
          const [rr] = await query(
            'SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM DELIVERY_RATING WHERE driver_staff_id = ? AND tenant_id = ?',
            [payload.staff_id, payload.tenant_id]
          );
          console.log('[/me] driver rating query:', { staff_id: payload.staff_id, tenant_id: payload.tenant_id, result: rr[0] });
          if (rr.length && rr[0].avg_rating) avgRating = parseFloat(Number(rr[0].avg_rating).toFixed(1));
        } catch (err) { console.error('[/me] rating query error:', err.message); }
        try {
          const [dr] = await query(
            "SELECT COUNT(*) AS cnt FROM shipment WHERE assigned_driver_id = ? AND tenant_id = ? AND status = 'Delivered'",
            [payload.staff_id, payload.tenant_id]
          );
          if (dr.length) totalDeliveries = dr[0].cnt || 0;
        } catch {}
      }

      return res.json({
        user: {
          uid:       s.staff_id,
          fullName:  s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          email:     s.username,
          phone:     s.phone || null,
          role:      roleLower,
          tier:      'Bronze',
          status:    s.status,
          tenant_id: s.tenant_id,
          createdAt: s.created_at || s.createdAt || null,
          vehicle_type:  s.vehicle_type || null,
          plate_number:  s.vehicle_plate || s.plate_number || null,
          rating:           avgRating,
          total_deliveries: totalDeliveries,
        }
      });
    }

    // APP_USER (customers)
    if (!payload.user_id) return res.status(403).json({ error: 'Forbidden.' });
    const [rows] = await query(
      `SELECT user_id, tenant_id, first_name, last_name, email, phone, status, created_at
       FROM APP_USER WHERE user_id = ? AND tenant_id = ? LIMIT 1`,
      [payload.user_id, payload.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    const u = rows[0];
    return res.json({
      user: {
        uid:       u.user_id,
        fullName:  `${u.first_name} ${u.last_name}`.trim(),
        email:     u.email,
        phone:     u.phone || null,
        role:      payload.role || 'user',
        tier:      'Bronze',
        status:    u.status,
        tenant_id: u.tenant_id,
        createdAt: u.created_at,
        user_id:   u.user_id,
      }
    });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /logout  (mounted at /:slug/api, so this handles /:slug/api/logout)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const slug = req.params.slug; // available via mergeParams:true on the parent mount

  // Parse the Cookie header directly — avoids any cookie-parser ordering issues
  const parseCookies = (header) => {
    const obj = {};
    (header || '').split(';').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx < 0) return;
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key) obj[key] = val;          // no decodeURIComponent — JWT values are plain base64url
    });
    return obj;
  };
  const cookies  = parseCookies(req.headers.cookie);
  const rawToken = cookies[`admin_token_${req.params.slug}`] || cookies.manager_token || cookies[`staff_token_${req.params.slug}`];

  if (rawToken) {
    try {
      const d = jwt.decode(rawToken);   // decode without verify — just need to know who is logging out
      if (d) {
        const actorType = d.role === 'Admin' ? 'admin' : d.role === 'Manager' ? 'manager' : 'staff';
        const target    = actorType === 'admin' ? 'Admin Dashboard' : actorType === 'manager' ? 'Manager Dashboard' : 'Staff App';
        logAudit({ actor: d.email || d.name || 'unknown', actor_type: actorType, action: 'LOGOUT', target, tenant_slug: slug, ip_address: req.ip });
      }
    } catch (e) { /* ignore */ }
  }

  res.clearCookie(`admin_token_${req.params.slug}`);
  res.clearCookie('manager_token');
  res.clearCookie(`staff_token_${req.params.slug}`);
  res.clearCookie('dc_token');
  res.clearCookie('user_token');
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /app-download-v2
// token required — either the 10-min QR token or the permanent email token
// ─────────────────────────────────────────────────────────────────────────────
router.get('/app-download-v2', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const { slug } = req.params;
  const { token } = req.query;

  try {
    // Optional token verification
    if (token) {
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ error: 'QR code expired. Please check your email for the permanent download link.' });
      }

      if (payload.type !== 'app_download' || payload.slug !== slug) {
        return res.status(401).json({ error: 'Invalid access link.' });
      }
    }

    const [rows] = await query(
      'SELECT app_download_url, company_name FROM TENANT WHERE slug = ? AND status = "active" LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found.' });

    const tenant = rows[0];
    
    // Explicitly serve the real APK file using a custom backend route 
    // to bypass any Nginx proxy rules that might be hijacking /public/
    const actualApkUrl = `${process.env.BASE_URL || 'https://logistichub.ddns.net'}/${slug}/api/direct-apk?v=7`;

    res.json({
      download_url: actualApkUrl,
      app_name:     tenant.app_name || tenant.company_name,
    });

  } catch (e) {
    console.error('[APP-DOWNLOAD] Error:', e);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/direct-apk (Custom Download Route to bypass Nginx static serving)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/direct-apk', (req, res) => {
  const path = require('path');
  const fs   = require('fs');
  const apkPath = path.join(__dirname, '../public/LogistiHub-latest.apk');
  if (!fs.existsSync(apkPath)) return res.status(404).json({ error: 'APK not found.' });
  res.download(apkPath, 'LogistiHub-latest.apk');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /forgot-credentials
// username: sends workspace username to real email (using target=contact_email)
// password: generates 6-digit OTP, stores hashed, sends to real email (using target=username)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-credentials', async (req, res) => {
  const { slug } = req.params;
  const { type, target } = req.body; // target is email (if type='username') or username (if type='password')
  
  if (!target) return res.status(400).json({ error: 'Missing input.' });

  try {
    const [tenants] = await query(
      "SELECT tenant_id, company_name FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1",
      [slug]
    );
    if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
    const { tenant_id, company_name } = tenants[0];

    let q = "";
    let params = [];

    if (type === 'username') {
      const emailPrefix = target.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      q = "SELECT username, contact_email, name FROM STAFF WHERE tenant_id = ? AND (contact_email = ? OR username LIKE ?) LIMIT 1";
      params = [tenant_id, target, emailPrefix + '@%'];
    } else {
      // password reset
      q = "SELECT username, contact_email, name FROM STAFF WHERE tenant_id = ? AND username = ? LIMIT 1";
      params = [tenant_id, target];
    }

    const [rows] = await query(q, params);
    if (!rows.length) return res.status(404).json({ error: 'No account found matching those details.' });

    const { username, contact_email, name } = rows[0];
    let sendTo = contact_email;
    
    if (type === 'username') {
      sendTo = target; // For forgot username, target is their actual email address
    } else if (!sendTo) {
      // For forgot password, if we don't have their contact_email, try Admin's contact_email
      const [adminRows] = await query("SELECT contact_email, username FROM STAFF WHERE tenant_id = ? AND role = 'Admin' LIMIT 1", [tenant_id]);
      if (adminRows.length && adminRows[0].contact_email) {
        sendTo = adminRows[0].contact_email;
      } else {
        // Ultimate fallback for legacy accounts: guess gmail from username prefix
        sendTo = username.split('@')[0] + '@gmail.com';
      }
    }

    if (type === 'password') {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await query(
        'UPDATE STAFF SET reset_token = ?, reset_expires = ? WHERE tenant_id = ? AND username = ?',
        [otpHash, expires, tenant_id, username]
      );

      console.log(`[RESET] OTP generated for ${sendTo} (tenant: ${slug})`);
      await sendPasswordResetEmail(sendTo, otp, company_name);
      console.log(`[RESET] OTP email sent OK to ${sendTo}`);
      res.json({ ok: true, message: 'A 6-digit reset code has been sent to your registered email.' });

    } else {
      // Send username
      console.log(`[FORGOT] Sending username to ${sendTo} for tenant ${slug}`);
      await sendForgotCredentialsEmail(sendTo, username, company_name, 'username');
      console.log(`[FORGOT] Email sent OK to ${sendTo}`);
      res.json({ ok: true, message: 'Your username has been sent to your registered email.' });
    }

  } catch (e) {
    console.error('[FORGOT] Error:', e.message);
    res.status(500).json({ error: 'Failed to send email: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /reset-password  — verify OTP and set new password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { slug } = req.params;
  const { code, new_password, username } = req.body;
  if (!code || !new_password) return res.status(400).json({ error: 'Code and new password are required.' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const [tenants] = await query(
      "SELECT tenant_id FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1",
      [slug]
    );
    if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
    const { tenant_id } = tenants[0];

    let q = "SELECT staff_id, reset_token, reset_expires FROM STAFF WHERE tenant_id = ? AND role = 'Admin' LIMIT 1";
    let params = [tenant_id];

    if (username) {
      q = "SELECT staff_id, reset_token, reset_expires FROM STAFF WHERE tenant_id = ? AND username = ? LIMIT 1";
      params = [tenant_id, username];
    }

    const [rows] = await query(q, params);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    const { staff_id, reset_token, reset_expires } = rows[0];

    if (!reset_token || !reset_expires) return res.status(400).json({ error: 'No reset was requested. Click Forgot Password first.' });
    if (new Date() > new Date(reset_expires)) return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });

    const valid = await bcrypt.compare(code.trim(), reset_token);
    if (!valid) return res.status(400).json({ error: 'Invalid reset code.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await query(
      'UPDATE STAFF SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE staff_id = ?',
      [newHash, staff_id]
    );

    console.log(`[RESET] Password updated for staff_id=${staff_id} tenant=${slug}`);
    res.json({ ok: true, message: 'Password reset successful. You can now log in.' });

  } catch (e) {
    console.error('[RESET] Error:', e.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DC (Document Controller) ROUTES — secured with staff_token
// ─────────────────────────────────────────────────────────────────────────────
const { requireStaff } = require('../middleware/auth');

// GET /dc/me — profile + tenant info
router.get('/dc/me', requireStaff, async (req, res) => {
  try {
    const [staff] = await query('SELECT staff_id, name, username, role FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [req.staff.staff_id, req.tenantId]);
    const [tenant] = await query('SELECT company_name, logo_url FROM TENANT WHERE tenant_id = ?', [req.tenantId]);
    if (!staff.length) return res.status(404).json({ error: 'Staff not found.' });
    res.json({ ...staff[0], tenant_name: tenant[0]?.company_name, logo_url: tenant[0]?.logo_url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /dc/stats — live dashboard numbers
router.get('/dc/stats', requireStaff, async (req, res) => {
  try {
    const tid = req.tenantId;
    const [[{ shipments }]] = await query('SELECT COUNT(*) AS shipments FROM SHIPMENT WHERE tenant_id = ?', [tid]);
    const [[{ clients }]]   = await query('SELECT COUNT(*) AS clients FROM APP_USER WHERE tenant_id = ?', [tid]);
    const [[{ staff }]]     = await query('SELECT COUNT(*) AS staff FROM STAFF WHERE tenant_id = ? AND (status="active" OR status="Available")', [tid]);
    const [[{ today }]]     = await query('SELECT COUNT(*) AS today FROM SHIPMENT WHERE tenant_id = ? AND DATE(created_at) = CURDATE()', [tid]);
    res.json({ shipments, clients, staff, today });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /dc/shipments — all shipments for this tenant
router.get('/dc/shipments', requireStaff, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT s.*, d.name AS driver_name,
              COALESCE(c.company_name, CONCAT(u.first_name, ' ', u.last_name), 'Walk-in') AS client_name
       FROM SHIPMENT s
       LEFT JOIN client c ON c.client_id = s.client_id
       LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id
       LEFT JOIN STAFF d ON d.staff_id = s.assigned_driver_id
       WHERE s.tenant_id = ? ORDER BY s.created_at DESC`,
      [req.tenantId]
    );
    res.json({ shipments: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /dc/clients — registered app users / clients
router.get('/dc/clients', requireStaff, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT user_id, CONCAT(first_name,' ',last_name) AS full_name, email, phone, status, created_at
       FROM APP_USER WHERE tenant_id = ? ORDER BY created_at DESC`,
      [req.tenantId]
    );
    res.json({ clients: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

