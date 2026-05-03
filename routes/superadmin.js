'use strict';

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const fs        = require('fs');
const path      = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { query, logAudit } = require('../config/db');
const { requireSuperadmin } = require('../middleware/auth');
const { sendInviteEmail, sendApplicationApprovedEmail, sendApplicationRejectedEmail } = require('../config/mailer');

const PLATFORM_FILE = path.join(__dirname, '../config/platform.json');
function readPlatform() {
  try { return JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf8')); }
  catch { return {}; }
}
function savePlatform(data) {
  fs.writeFileSync(PLATFORM_FILE, JSON.stringify(data, null, 2));
}

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/login (UNIFIED)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Check Root Superadmin (from .env)
  if (
    email    === process.env.SUPERADMIN_EMAIL &&
    password === process.env.SUPERADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { role: 'superadmin', email, name: 'Super Admin', is_primary: true },
      process.env.SUPERADMIN_JWT_SECRET,
      { expiresIn: process.env.SUPERADMIN_JWT_EXPIRES_IN || '4h' }
    );
    res.cookie('sa_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   4 * 60 * 60 * 1000,
    });
    logAudit({ actor: email, actor_type: 'superadmin', action: 'LOGIN', target: 'Superadmin Panel', ip_address: req.ip });
    return res.json({ ok: true, role: 'superadmin', is_primary: true, message: 'Logged in as superadmin.' });
  }

  // 2. Check Sub-Superadmin (from SUPERADMIN table)
  try {
    const [saRows] = await query(
      "SELECT * FROM SUPERADMIN WHERE email = ? AND status = 'active' LIMIT 1",
      [email]
    );
    if (saRows.length > 0) {
      const sa = saRows[0];
      if (await bcrypt.compare(password, sa.password_hash)) {
        const token = jwt.sign(
          { role: 'superadmin', email, name: sa.name, is_primary: false, superadmin_id: sa.superadmin_id },
          process.env.SUPERADMIN_JWT_SECRET,
          { expiresIn: process.env.SUPERADMIN_JWT_EXPIRES_IN || '4h' }
        );
        res.cookie('sa_token', token, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge:   4 * 60 * 60 * 1000,
        });
        logAudit({ actor: email, actor_type: 'superadmin', action: 'LOGIN', target: 'Superadmin Panel', ip_address: req.ip });
        return res.json({ ok: true, role: 'superadmin', is_primary: false, message: 'Logged in as superadmin.', must_change_password: !!sa.must_change_password });
      }
    }
  } catch (saErr) {
    console.error('Sub-superadmin login error:', saErr);
  }

  // 2. Check Tenant Admin
  try {
    const [rows] = await query(`
      SELECT s.*, t.slug 
      FROM STAFF s 
      JOIN TENANT t ON t.tenant_id = s.tenant_id 
      WHERE s.username = ? AND s.role = 'Admin' AND t.status = 'active'
      LIMIT 1
    `, [email]);

    if (rows.length > 0) {
      const staff = rows[0];
      if (await bcrypt.compare(password, staff.password_hash)) {
        const token = jwt.sign(
          { role: 'admin', staff_id: staff.staff_id, tenant_id: staff.tenant_id, slug: staff.slug, name: staff.name, email },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );

        res.cookie('admin_token', token, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge:   8 * 60 * 60 * 1000,
        });

        return res.json({ ok: true, role: 'admin', slug: staff.slug, message: 'Logged in as admin.' });
      }
    }
  } catch (err) {
    console.error('Unified login error:', err);
  }

  return res.status(401).json({ error: 'Invalid credentials.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('sa_token');
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/me  — current session info
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireSuperadmin, (req, res) => {
  res.json({
    email:      req.superadmin.email,
    name:       req.superadmin.name  || 'Super Admin',
    is_primary: req.superadmin.is_primary !== false, // treat undefined as true (legacy tokens)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/developers  — list all sub-superadmins (root only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/developers', requireSuperadmin, async (req, res) => {
  if (!req.superadmin.is_primary) return res.status(403).json({ error: 'Only the root superadmin can manage developers.' });
  try {
    const [rows] = await query(
      'SELECT superadmin_id, name, email, is_primary, status, created_at FROM SUPERADMIN ORDER BY is_primary DESC, created_at ASC'
    );
    res.json(rows);
  } catch(e) {
    res.status(500).json({ error: 'Failed to load developers.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/developers  — add sub-superadmin (root only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/developers', requireSuperadmin, async (req, res) => {
  if (!req.superadmin.is_primary) return res.status(403).json({ error: 'Only the root superadmin can add developers.' });
  const { name, email, password } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
  // Auto-generate temp password if not provided
  const tempPassword = password || ('Temp@' + crypto.randomBytes(3).toString('hex').toUpperCase());
  if (tempPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const [existing] = await query('SELECT superadmin_id FROM SUPERADMIN WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'A developer with this email already exists.' });
    const hash = await bcrypt.hash(tempPassword, 10);
    await query(
      'INSERT INTO SUPERADMIN (name, email, password_hash, is_primary, created_by, must_change_password) VALUES (?, ?, ?, 0, ?, 1)',
      [name, email, hash, req.superadmin.superadmin_id || null]
    );
    logAudit({ actor: req.superadmin.email, actor_type: 'superadmin', action: 'ADD_DEVELOPER', target: `${name} <${email}>`, ip_address: req.ip });
    res.json({ ok: true, message: `Developer "${name}" added successfully.`, temp_password: tempPassword });
  } catch(e) {
    res.status(500).json({ error: 'Failed to add developer. ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/superadmin/developers/:id  — remove sub-superadmin (root only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/developers/:id', requireSuperadmin, async (req, res) => {
  if (!req.superadmin.is_primary) return res.status(403).json({ error: 'Only the root superadmin can remove developers.' });
  try {
    const [[dev]] = await query('SELECT name, email, is_primary FROM SUPERADMIN WHERE superadmin_id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Developer not found.' });
    if (dev.is_primary) return res.status(403).json({ error: 'Cannot remove the root superadmin.' });
    await query('UPDATE SUPERADMIN SET status = ? WHERE superadmin_id = ?', ['inactive', req.params.id]);
    logAudit({ actor: req.superadmin.email, actor_type: 'superadmin', action: 'REMOVE_DEVELOPER', target: `${dev.name} <${dev.email}>`, ip_address: req.ip });
    res.json({ ok: true, message: `Developer "${dev.name}" removed.` });
  } catch(e) {
    res.status(500).json({ error: 'Failed to remove developer.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/overview  — platform stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', requireSuperadmin, async (req, res) => {
  try {
    const [[tenants]]    = await query('SELECT COUNT(*) AS total FROM TENANT');
    const [[active]]     = await query("SELECT COUNT(*) AS total FROM TENANT WHERE status = 'active'");
    const [[pending]]    = await query("SELECT COUNT(*) AS total FROM TENANT WHERE status = 'pending'");
    const [[suspended]]  = await query("SELECT COUNT(*) AS total FROM TENANT WHERE status = 'suspended'");
    const [[users]]      = await query('SELECT (SELECT COUNT(*) FROM APP_USER) + (SELECT COUNT(*) FROM STAFF) AS total');
    const [[shipments]]  = await query('SELECT COUNT(*) AS total FROM shipment');

    // Subscription revenue from SUBSCRIPTION_PAYMENT (plan upgrades)
    let subRevenue = 0;
    try {
      const [[rev]] = await query("SELECT COALESCE(SUM(amount),0) AS total FROM SUBSCRIPTION_PAYMENT WHERE status = 'paid'");
      subRevenue = rev.total;
    } catch(_) { /* table might not exist yet */ }

    // Monthly revenue history (last 6 months) for forecast
    let monthlyRevenue = [];
    try {
      const [rows] = await query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(amount) AS total
        FROM SUBSCRIPTION_PAYMENT WHERE status = 'paid'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC LIMIT 6
      `);
      monthlyRevenue = rows.reverse();
    } catch(_) {}

    // Monthly tenant growth (last 6 months)
    let monthlyTenants = [];
    try {
      const [rows] = await query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
        FROM TENANT
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC LIMIT 6
      `);
      monthlyTenants = rows.reverse();
    } catch(_) {}

    // Monthly shipment growth (last 6 months)
    let monthlyShipments = [];
    try {
      const [rows] = await query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
        FROM shipment
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC LIMIT 6
      `);
      monthlyShipments = rows.reverse();
    } catch(_) {}

    res.json({
      totalTenants:      tenants.total,
      activeTenants:     active.total,
      pendingTenants:    pending.total,
      suspendedTenants:  suspended.total,
      totalUsers:        users.total,
      totalShipments:    shipments.total,
      totalRevenue:      subRevenue,
      monthlyRevenue,
      monthlyTenants,
      monthlyShipments,
    });
  } catch(e) {
    console.error('Overview error:', e);
    res.status(500).json({ error: 'Failed to load overview.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/tenants  — list all tenants
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tenants', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        t.tenant_id, t.company_name, t.slug, t.plan, t.status, t.created_at,
        ANY_VALUE(s.username) AS admin_email,
        COUNT(DISTINCT u.user_id)  AS user_count,
        COUNT(DISTINCT sh.delivery_number) AS shipment_count
      FROM TENANT t
      LEFT JOIN STAFF s  ON s.tenant_id = t.tenant_id AND s.role = 'Admin'
      LEFT JOIN APP_USER u ON u.tenant_id = t.tenant_id
      LEFT JOIN shipment sh ON sh.tenant_id = t.tenant_id
      GROUP BY t.tenant_id, t.company_name, t.slug, t.plan, t.status, t.created_at
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch(e) {
    console.error('Tenants error:', e);
    res.status(500).json({ error: 'Failed to load tenants.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/subscriptions  — all subscription/payment data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/subscriptions', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        t.tenant_id, t.company_name, t.plan, t.status, t.created_at,
        COALESCE(sp.revenue, 0) AS revenue,
        CASE t.plan
          WHEN 'startup'    THEN 99
          WHEN 'enterprise' THEN 499
          WHEN 'global'     THEN 999
          ELSE 0
        END AS monthly_fee
      FROM TENANT t
      LEFT JOIN (
        SELECT tenant_id, SUM(amount) AS revenue, COUNT(*) AS payment_count, MAX(created_at) AS last_payment_at, MAX(is_test_mode) AS is_test_mode
        FROM SUBSCRIPTION_PAYMENT WHERE status = 'paid' GROUP BY tenant_id
      ) sp ON sp.tenant_id = t.tenant_id
      ORDER BY t.created_at DESC
    `);

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
    const pendingCount = rows.filter(r => r.status === 'pending').length;

    res.json({
      totalRevenue,
      pendingCount,
      topTenants: rows,
    });
  } catch(e) {
    console.error('Subscriptions error:', e);
    res.status(500).json({ error: 'Failed to load subscriptions.' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/tenants/invite  — send invitation email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tenants/invite', requireSuperadmin, async (req, res) => {
  const { email, company_name, notes } = req.body;

  if (!email || !company_name) {
    return res.status(400).json({ error: 'Email and company name are required.' });
  }

  // Check if a tenant with this email already exists (pending or active)
  const [existing] = await query(
    "SELECT tenant_id FROM TENANT WHERE company_name = ? AND status = 'active' LIMIT 1",
    [company_name]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'A tenant with this company name already exists.' });
  }

  // Build a short-lived invite token (48h) carrying the email and company
  const inviteToken = jwt.sign(
    { email, company_name, notes: notes || '', type: 'invite' },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  // Send the email
  try {
    await sendInviteEmail(email, company_name, inviteToken);
    logAudit({ actor: req.superadmin?.email || 'superadmin', actor_type: 'superadmin', action: 'INVITE_TENANT', target: company_name, ip_address: req.ip, metadata: { email } });
  } catch (mailErr) {
    console.error('Mail error:', mailErr.message);
    // Don't block on mail failure in dev — still return the token for testing
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Failed to send invitation email. Check mail config.' });
    }
  }

  res.json({
    ok: true,
    message: `Invitation sent to ${email}.`,
    // Only exposed in dev so you can test without real email
    ...(process.env.NODE_ENV !== 'production' && { dev_token: inviteToken }),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/tenants/:id/status  — suspend / reactivate
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tenants/:id/status', requireSuperadmin, async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'suspended'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  await query('UPDATE TENANT SET status = ? WHERE tenant_id = ?', [status, req.params.id]);
  const [[t]] = await query('SELECT company_name, slug FROM TENANT WHERE tenant_id = ?', [req.params.id]);
  logAudit({ actor: req.superadmin?.email || 'superadmin', actor_type: 'superadmin', action: `TENANT_${status.toUpperCase()}`, target: t?.company_name || req.params.id, tenant_slug: t?.slug, ip_address: req.ip });
  res.json({ ok: true, status });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/superadmin/tenants/:id  — permanently delete a tenant & all data
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/tenants/:id', requireSuperadmin, async (req, res) => {
  const tenantId = req.params.id;
  try {
    // Verify tenant exists first
    const [[tenant]] = await query('SELECT tenant_id, company_name, slug FROM TENANT WHERE tenant_id = ?', [tenantId]);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

    // Delete all related data in correct order (child → parent)
    await query('DELETE FROM proof_of_delivery WHERE delivery_number IN (SELECT delivery_number FROM shipment WHERE tenant_id = ?)', [tenantId]);
    await query('DELETE FROM sub_bulk     WHERE delivery_number IN (SELECT delivery_number FROM shipment WHERE tenant_id = ?)', [tenantId]);
    await query('DELETE FROM sub_document WHERE delivery_number IN (SELECT delivery_number FROM shipment WHERE tenant_id = ?)', [tenantId]);
    await query('DELETE FROM sub_food     WHERE delivery_number IN (SELECT delivery_number FROM shipment WHERE tenant_id = ?)', [tenantId]);
    await query('DELETE FROM sub_package  WHERE delivery_number IN (SELECT delivery_number FROM shipment WHERE tenant_id = ?)', [tenantId]);
    await query('DELETE FROM sub_vehicle  WHERE delivery_number IN (SELECT delivery_number FROM shipment WHERE tenant_id = ?)', [tenantId]);
    await query('DELETE FROM shipment     WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM route        WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM vehicle      WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM payment      WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM client       WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM APP_USER     WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM STAFF        WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM AUDIT_LOG    WHERE tenant_slug = ?', [tenant.slug]);
    await query('DELETE FROM TENANT       WHERE tenant_id = ?', [tenantId]);

    logAudit({ actor: req.superadmin?.email || 'superadmin', actor_type: 'superadmin', action: 'DELETE_TENANT', target: tenant.company_name, tenant_slug: tenant.slug, ip_address: req.ip, metadata: { tenant_id: tenantId, plan: tenant.plan } });
    console.log(`[SUPERADMIN] Tenant ${tenant.company_name} (ID: ${tenantId}) permanently deleted.`);
    res.json({ ok: true, message: `Tenant "${tenant.company_name}" and all associated data have been permanently deleted.` });
  } catch (e) {
    console.error('Delete tenant error:', e);
    res.status(500).json({ error: 'Failed to delete tenant. ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/audit-logs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audit-logs', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await query(
      'SELECT * FROM AUDIT_LOG ORDER BY created_at DESC LIMIT 200'
    );
    res.json(rows);
  } catch(e) {
    console.error('Audit logs error:', e);
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/platform-settings  — read platform customization
// ─────────────────────────────────────────────────────────────────────────────
router.get('/platform-settings', requireSuperadmin, (req, res) => {
  res.json(readPlatform());
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/platform-settings  — save platform customization
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/platform-settings', requireSuperadmin, (req, res) => {
  if (!req.superadmin.is_primary) {
    return res.status(403).json({ error: 'Only the root superadmin can change platform settings.' });
  }
  const allowed = ['platform_name','primary_color','hero_title','hero_subtitle','hero_cta_text','support_email','base_domain'];
  const current = readPlatform();
  allowed.forEach(k => { if (req.body[k] !== undefined) current[k] = req.body[k]; });
  savePlatform(current);
  logAudit({ actor: req.superadmin.email, actor_type: 'superadmin', action: 'UPDATE_PLATFORM_SETTINGS', ip_address: req.ip });
  res.json({ ok: true, settings: current });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/change-password  — force change from temp password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { email, current_password, new_password } = req.body;
  if (!email || !current_password || !new_password) return res.status(400).json({ error: 'All fields are required.' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  try {
    const [rows] = await query("SELECT * FROM SUPERADMIN WHERE email = ? AND status = 'active' LIMIT 1", [email]);
    if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
    const sa = rows[0];

    if (!await bcrypt.compare(current_password, sa.password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
    if (current_password === new_password) return res.status(400).json({ error: 'New password must be different from the temporary password.' });

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE SUPERADMIN SET password_hash = ?, must_change_password = 0 WHERE superadmin_id = ?', [newHash, sa.superadmin_id]);

    logAudit({ actor: email, actor_type: 'superadmin', action: 'CHANGE_PASSWORD', target: 'Password Changed', ip_address: req.ip });
    res.json({ ok: true, message: 'Password changed successfully. Please sign in again.' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/applications — list all tenant applications
// ─────────────────────────────────────────────────────────────────────────────
router.get('/applications', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT application_id, name, email, company_name, slug, phone, permit_filename, permit_mimetype, status, rejection_reason, reviewed_by, reviewed_at, created_at
       FROM TENANT_APPLICATION ORDER BY FIELD(status, 'pending', 'approved', 'rejected'), created_at DESC`
    );
    res.json(rows);
  } catch(e) {
    console.error('Applications error:', e);
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/applications/:id/permit — view/download permit file
// ─────────────────────────────────────────────────────────────────────────────
router.get('/applications/:id/permit', requireSuperadmin, async (req, res) => {
  try {
    const [[app]] = await query(
      'SELECT permit_file, permit_filename, permit_mimetype FROM TENANT_APPLICATION WHERE application_id = ?',
      [req.params.id]
    );
    if (!app || !app.permit_file) return res.status(404).json({ error: 'Permit not found.' });
    res.json({ ok: true, file: app.permit_file, filename: app.permit_filename, mimetype: app.permit_mimetype });
  } catch(e) {
    res.status(500).json({ error: 'Failed to load permit.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/superadmin/applications/:id/approve — approve application
// ─────────────────────────────────────────────────────────────────────────────
router.put('/applications/:id/approve', requireSuperadmin, async (req, res) => {
  try {
    const [[app]] = await query(
      'SELECT * FROM TENANT_APPLICATION WHERE application_id = ?',
      [req.params.id]
    );
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(400).json({ error: 'Application is not pending.' });

    await query(
      'UPDATE TENANT_APPLICATION SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE application_id = ?',
      ['approved', req.superadmin.email, req.params.id]
    );

    // Generate payment link token
    const paymentToken = jwt.sign({
      type: 'approved_application',
      application_id: app.application_id,
      email: app.email,
      slug: app.slug
    }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const baseUrl = process.env.BASE_URL || 'https://logistihub.ddns.net';
    const paymentLink = `${baseUrl}/onboarding?approved=true&token=${paymentToken}`;

    // Send approval email
    sendApplicationApprovedEmail(app.email, app.name, app.company_name, paymentLink).catch(e => console.error('Approval email error:', e.message));

    logAudit({ actor: req.superadmin.email, actor_type: 'superadmin', action: 'APPLICATION_APPROVED', target: app.company_name, ip_address: req.ip, metadata: { application_id: app.application_id, slug: app.slug } });

    res.json({ ok: true, message: `Application for "${app.company_name}" approved. Payment link sent to ${app.email}.` });
  } catch(e) {
    console.error('Approve error:', e);
    res.status(500).json({ error: 'Failed to approve application.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/superadmin/applications/:id/reject — reject application
// ─────────────────────────────────────────────────────────────────────────────
router.put('/applications/:id/reject', requireSuperadmin, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason is required.' });

  try {
    const [[app]] = await query(
      'SELECT * FROM TENANT_APPLICATION WHERE application_id = ?',
      [req.params.id]
    );
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(400).json({ error: 'Application is not pending.' });

    await query(
      'UPDATE TENANT_APPLICATION SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE application_id = ?',
      ['rejected', reason, req.superadmin.email, req.params.id]
    );

    const baseUrl = process.env.BASE_URL || 'https://logistihub.ddns.net';
    const reapplyLink = `${baseUrl}/onboarding`;

    // Send rejection email
    sendApplicationRejectedEmail(app.email, app.name, app.company_name, reason, reapplyLink).catch(e => console.error('Rejection email error:', e.message));

    logAudit({ actor: req.superadmin.email, actor_type: 'superadmin', action: 'APPLICATION_REJECTED', target: app.company_name, ip_address: req.ip, metadata: { application_id: app.application_id, reason } });

    res.json({ ok: true, message: `Application for "${app.company_name}" rejected.` });
  } catch(e) {
    console.error('Reject error:', e);
    res.status(500).json({ error: 'Failed to reject application.' });
  }
});

module.exports = router;
