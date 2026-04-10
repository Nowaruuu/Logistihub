'use strict';

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { requireSuperadmin } = require('../middleware/auth');
const { sendInviteEmail }   = require('../config/mailer');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/login (UNIFIED)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Check Superadmin
  if (
    email    === process.env.SUPERADMIN_EMAIL &&
    password === process.env.SUPERADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { role: 'superadmin', email },
      process.env.SUPERADMIN_JWT_SECRET,
      { expiresIn: process.env.SUPERADMIN_JWT_EXPIRES_IN || '4h' }
    );

    res.cookie('sa_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   4 * 60 * 60 * 1000,
    });

    return res.json({ ok: true, role: 'superadmin', message: 'Logged in as superadmin.' });
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
    const [[revenue]]    = await query("SELECT COALESCE(SUM(total_amount),0) AS total FROM payment WHERE status = 'Paid'");

    res.json({
      totalTenants:      tenants.total,
      activeTenants:     active.total,
      pendingTenants:    pending.total,
      suspendedTenants:  suspended.total,
      totalUsers:        users.total,
      totalShipments:    shipments.total,
      totalRevenue:      revenue.total,
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
        COALESCE(SUM(p.total_amount), 0) AS revenue,
        CASE t.plan
          WHEN 'startup'    THEN 99
          WHEN 'enterprise' THEN 499
          WHEN 'global'     THEN 999
          ELSE 0
        END AS monthly_fee
      FROM TENANT t
      LEFT JOIN PAYMENT p ON p.tenant_id = t.tenant_id AND p.status = 'Paid'
      GROUP BY t.tenant_id, t.company_name, t.plan, t.status, t.created_at
      ORDER BY revenue DESC
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
  res.json({ ok: true, status });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/subscriptions  — all subscription/payment data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/subscriptions', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        t.tenant_id, t.company_name, t.plan, t.status, t.created_at,
        COALESCE(SUM(p.total_amount), 0) AS revenue,
        CASE t.plan
          WHEN 'startup'    THEN 99
          WHEN 'enterprise' THEN 499
          WHEN 'global'     THEN 999
          ELSE 0
        END AS monthly_fee
      FROM TENANT t
      LEFT JOIN PAYMENT p ON p.tenant_id = t.tenant_id AND p.status = 'Paid'
      GROUP BY t.tenant_id
      ORDER BY revenue DESC
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
// GET /api/superadmin/audit-logs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audit-logs', requireSuperadmin, async (req, res) => {
  try {
    // For now, return an empty array or a simple message so the frontend doesn't crash
    res.json([]); 
  } catch(e) {
    console.error('Audit logs error:', e);
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

module.exports = router;
