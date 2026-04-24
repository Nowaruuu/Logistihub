'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireUser } = require('../middleware/auth');
const { sendRegistrationEmail, sendForgotCredentialsEmail, sendPasswordResetEmail } = require('../config/mailer');

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

    res.cookie('staff_token', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', maxAge:8*3600*1000 });
    res.status(201).json({ ok:true, staff_id: result.insertId, name: fullName, token });

  } catch (err) {
    console.error('[STAFF REG] Critical Error:', err);
    res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /register (Customer)
// ─────────────────────────────────────────────────────────────────────────────
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

    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const [existing] = await query(
      'SELECT user_id FROM APP_USER WHERE tenant_id = ? AND email = ? LIMIT 1',
      [tenantId, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await query(
      `INSERT INTO APP_USER (tenant_id, first_name, last_name, email, phone, role, password_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'user', ?, 'active', NOW())`,
      [tenantId, first_name, last_name, email, phone || null, hash]
    );

    const token = jwt.sign(
      { role: 'user', user_id: result.insertId, tenant_id: tenantId, slug, name: `${first_name} ${last_name}`, email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // ── Generate QR token (expires in 10 minutes) ──────────────────────────
    const qrToken = jwt.sign(
      { type: 'app_download', slug, user_id: result.insertId, tenant_id: tenantId },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // ── Generate permanent email token (never expires) ─────────────────────
    const emailToken = jwt.sign(
      { type: 'app_download', slug, user_id: result.insertId, tenant_id: tenantId },
      process.env.JWT_SECRET
    );

    const BASE_URL      = process.env.BASE_URL || 'https://logistihub.ddns.net';
    const permanentLink = `${BASE_URL}/${slug}/get-app?token=${emailToken}`;

    // ── Send welcome email (non-blocking) ─────────────────────────────────
    sendRegistrationEmail(email, `${first_name} ${last_name}`, companyName, slug, permanentLink)
      .catch(e => console.error(`[CUST REG] Async email error: ${e.message}`));

    res.status(201).json({
      ok:           true,
      user_id:      result.insertId,
      name:         `${first_name} ${last_name}`,
      qr_token:     qrToken,
      email_token:  emailToken,
      token:        token
    });
    
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
    process.env.JWT_SECRET, { expiresIn: '8h' }
  );
  res.cookie('user_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
    sameSite: 'lax',
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
    const actualApkUrl = `${process.env.BASE_URL || 'https://logistichub.ddns.net'}/${slug}/api/direct-apk`;

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
  const apkPath = path.join(__dirname, '../public/LogistiHub-v1.apk');
  res.download(apkPath, 'LogistiHub-Mobile.apk');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /forgot-credentials
// username: sends workspace username to real email
// password: generates 6-digit OTP, stores hashed, sends to real email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-credentials', async (req, res) => {
  const { slug } = req.params;
  const { type } = req.body;
  try {
    const [tenants] = await query(
      "SELECT tenant_id, company_name FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1",
      [slug]
    );
    if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
    const { tenant_id, company_name } = tenants[0];

    const [rows] = await query(
      "SELECT username, contact_email, name FROM STAFF WHERE tenant_id = ? AND role = 'Admin' LIMIT 1",
      [tenant_id]
    );
    if (!rows.length) return res.json({ ok: true, message: 'Request processed.' });

    const { username, contact_email } = rows[0];
    const sendTo = contact_email || username;

    if (type === 'password') {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await query(
        'UPDATE STAFF SET reset_token = ?, reset_expires = ? WHERE tenant_id = ? AND role = \'Admin\'',
        [otpHash, expires, tenant_id]
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
  const { code, new_password } = req.body;
  if (!code || !new_password) return res.status(400).json({ error: 'Code and new password are required.' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const [tenants] = await query(
      "SELECT tenant_id FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1",
      [slug]
    );
    if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
    const { tenant_id } = tenants[0];

    const [rows] = await query(
      "SELECT staff_id, reset_token, reset_expires FROM STAFF WHERE tenant_id = ? AND role = 'Admin' LIMIT 1",
      [tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Admin not found.' });

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

module.exports = router;
