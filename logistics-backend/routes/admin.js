'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, tenantQuery } = require('../config/db');
const { requireAdmin, requireSlugMatch } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:slug/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const { slug } = req.params;

  const [tenants] = await query("SELECT * FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1", [slug]);
  if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
  const tenant = tenants[0];

  const [rows] = await query(
    "SELECT * FROM STAFF WHERE tenant_id = ? AND username = ? AND role = 'Admin' LIMIT 1",
    [tenant.tenant_id, email]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  const staff = rows[0];

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { role: 'admin', tenant_id: tenant.tenant_id, slug, name: staff.name, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.cookie('admin_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000,
  });

  res.json({ ok: true, slug, name: staff.name });
});

router.post('/:slug/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

router.get('/:slug/api/admin/me', requireAdmin, requireSlugMatch, (req, res) => {
  res.json({ admin: req.admin, tenant: req.tenant });
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/stats', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const [[total]]     = await tenantQuery(tid, 'SELECT COUNT(*) AS n FROM SHIPMENT');
  const [[transit]]   = await tenantQuery(tid, "SELECT COUNT(*) AS n FROM SHIPMENT WHERE status = 'In-Transit'");
  const [[delivered]] = await tenantQuery(tid, "SELECT COUNT(*) AS n FROM SHIPMENT WHERE status = 'Delivered'");
  const [[pending]]   = await tenantQuery(tid, "SELECT COUNT(*) AS n FROM PAYMENT WHERE status IN ('Pending','AwaitingAdmin')");
  const [[revenue]]   = await tenantQuery(tid, "SELECT COALESCE(SUM(total_amount),0) AS n FROM PAYMENT WHERE status = 'Paid'");

  res.json({
    total_shipments:  total.n,
    in_transit:       transit.n,
    delivered:        delivered.n,
    pending_payments: pending.n,
    total_revenue:    revenue.n,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SHIPMENTS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/shipments', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  let limit  = parseInt(req.query.limit, 10) || 50;
  let offset = parseInt(req.query.offset, 10) || 0;
  const statusFilter = req.query.status || null;
  const typeFilter   = req.query.item_type_flag || null;

  let sql = `
    SELECT s.*, c.company_name AS client_name, d.name AS driver_name,
           h.name AS helper_name, r.route_name
    FROM SHIPMENT s
    LEFT JOIN CLIENT c ON c.client_id = s.client_id
    LEFT JOIN STAFF d ON d.staff_id = s.assigned_driver_id
    LEFT JOIN STAFF h ON h.staff_id = s.assigned_helper_id
    LEFT JOIN ROUTE r ON r.route_id = s.route_id
    WHERE s.tenant_id = ?
  `;
  
  const params = [tid];
  if (statusFilter) { sql += ' AND s.status = ?'; params.push(statusFilter); }
  if (typeFilter) { sql += ' AND s.item_type_flag = ?'; params.push(typeFilter); }

  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const [rows] = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug/api/admin/shipments/:delivery_number', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const dn  = req.params.delivery_number;

  const [rows] = await query('SELECT * FROM SHIPMENT WHERE delivery_number = ? AND tenant_id = ? LIMIT 1', [dn, tid]);
  if (!rows.length) return res.status(404).json({ error: 'Shipment not found.' });

  const shipment = rows[0];
  const subtableMap = { PACKAGE: 'SUB_PACKAGE', VEHICLE: 'SUB_VEHICLE', FOOD: 'SUB_FOOD', DOC: 'SUB_DOCUMENT', BULK: 'SUB_BULK' };
  const subtable = subtableMap[shipment.item_type_flag];
  let subData = null;

  if (subtable) {
    const [sub] = await query(`SELECT * FROM \`${subtable}\` WHERE delivery_number = ? LIMIT 1`, [dn]);
    subData = sub[0] || null;
  }

  const [pod] = await query('SELECT * FROM PROOF_OF_DELIVERY WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);
  const [payments] = await query('SELECT * FROM PAYMENT WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);
  const [declines] = await query('SELECT * FROM DECLINE_REASONS WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);

  res.json({ shipment, sub_data: subData, pod, payments, declines });
});

router.post('/:slug/api/admin/shipments', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const {
    delivery_number, airway_bill_number, client_id, route_id,
    pickup_location, dropoff_location, pickup_lat, pickup_lng,
    dropoff_lat, dropoff_lng, distance_km,
    assigned_vehicle_plate, assigned_driver_id, assigned_helper_id,
    item_type_flag, prohibited_check, offline_log, sub_data
  } = req.body;

  if (!delivery_number || !client_id || !item_type_flag) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  await query(
    `INSERT INTO SHIPMENT (delivery_number, tenant_id, airway_bill_number, client_id, route_id, pickup_location, dropoff_location, status, item_type_flag, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW())`,
    [delivery_number, tid, airway_bill_number, client_id, route_id, pickup_location, dropoff_location, item_type_flag]
  );

  res.status(201).json({ ok: true, delivery_number });
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF & VEHICLES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:slug/api/admin/staff', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query('SELECT * FROM STAFF WHERE tenant_id = ? ORDER BY name ASC', [req.tenantId]);
  res.json(rows);
});

router.get('/:slug/api/admin/vehicles', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query('SELECT * FROM VEHICLE WHERE tenant_id = ? ORDER BY plate_number ASC', [req.tenantId]);
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS (Unified App Users)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/clients', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query(
    `SELECT user_id AS client_id, first_name, last_name, email, phone, status FROM APP_USER WHERE tenant_id = ?`,
    [req.tenantId]
  );
  res.json(rows);
});

router.delete('/:slug/api/admin/clients/:id', requireAdmin, requireSlugMatch, async (req, res) => {
  await query('DELETE FROM APP_USER WHERE user_id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:slug/api/admin/settings', requireAdmin, requireSlugMatch, async (req, res) => {
  const { company_name, bg_app_color, bg_sidebar_color, logo_url, new_password } = req.body;
  const tid = req.tenantId;

  try {
    await query(`
      UPDATE TENANT 
      SET company_name = COALESCE(?, company_name),
          bg_app_color = COALESCE(?, bg_app_color),
          bg_sidebar_color = COALESCE(?, bg_sidebar_color),
          logo_url = COALESCE(?, logo_url)
      WHERE tenant_id = ?`, 
      [company_name, bg_app_color, bg_sidebar_color, logo_url, tid]
    );

    if (new_password && new_password.length >= 8) {
      const hash = await bcrypt.hash(new_password, 12);
      await query("UPDATE STAFF SET password_hash = ? WHERE tenant_id = ? AND role = 'Admin' AND username = ?", [hash, tid, req.admin.email]);
    }

    res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

module.exports = router;