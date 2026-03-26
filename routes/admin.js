'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, tenantQuery, findOne } = require('../config/db');
const { requireAdmin, requireSlugMatch } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes in this file are scoped to /:slug
// requireAdmin validates the JWT, requireSlugMatch ensures the JWT slug matches the URL slug

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

// POST /:slug/api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { slug } = req.params;

  // Look up the tenant first (isolation: only check STAFF within this tenant's slug)
  const [tenants] = await query("SELECT * FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1", [slug]);
  if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
  const tenant = tenants[0];

  // Find admin staff for this tenant only
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

// POST /:slug/api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

// GET /:slug/api/admin/me
router.get('/me', requireAdmin, requireSlugMatch, (req, res) => {
  res.json({ admin: req.admin, tenant: req.tenant });
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', requireAdmin, requireSlugMatch, async (req, res) => {
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

// GET /:slug/api/admin/shipments
router.get('/shipments', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status, item_type_flag } = req.query;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const tid = req.tenantId;

  let sql = `
    SELECT s.*,
           c.company_name AS client_name,
           d.name         AS driver_name,
           h.name         AS helper_name,
           r.route_name
    FROM SHIPMENT s
    LEFT JOIN CLIENT c ON c.client_id    = s.client_id
    LEFT JOIN STAFF  d ON d.staff_id     = s.assigned_driver_id
    LEFT JOIN STAFF  h ON h.staff_id     = s.assigned_helper_id
    LEFT JOIN ROUTE  r ON r.route_id     = s.route_id
    WHERE s.tenant_id = ?
  `;
  const params = [tid];

  if (status)         { sql += ' AND s.status = ?';         params.push(status); }
  if (item_type_flag) { sql += ' AND s.item_type_flag = ?';  params.push(item_type_flag); }

  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [rows] = await query(sql, params);
  res.json(rows);
});

// GET /:slug/api/admin/shipments/:delivery_number
router.get('/shipments/:delivery_number', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const dn  = req.params.delivery_number;

  const [rows] = await query(
    'SELECT * FROM SHIPMENT WHERE delivery_number = ? AND tenant_id = ? LIMIT 1',
    [dn, tid]
  );
  if (!rows.length) return res.status(404).json({ error: 'Shipment not found.' });

  const shipment = rows[0];

  // Fetch subtype data based on item_type_flag
  const subtableMap = {
    PACKAGE: 'SUB_PACKAGE', VEHICLE: 'SUB_VEHICLE',
    FOOD:    'SUB_FOOD',    DOC: 'SUB_DOCUMENT', BULK: 'SUB_BULK',
  };
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

// POST /:slug/api/admin/shipments
router.post('/shipments', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const {
    delivery_number, airway_bill_number, client_id, route_id,
    pickup_location, dropoff_location, pickup_lat, pickup_lng,
    dropoff_lat, dropoff_lng, distance_km,
    assigned_vehicle_plate, assigned_driver_id, assigned_helper_id,
    item_type_flag, prohibited_check, offline_log,
    // sub-type fields passed as nested object
    sub_data,
  } = req.body;

  if (!delivery_number || !client_id || !item_type_flag) {
    return res.status(400).json({ error: 'delivery_number, client_id, and item_type_flag are required.' });
  }

  const validTypes = ['PACKAGE','VEHICLE','FOOD','DOC','BULK'];
  if (!validTypes.includes(item_type_flag)) {
    return res.status(400).json({ error: `item_type_flag must be one of: ${validTypes.join(', ')}` });
  }

  // Insert SHIPMENT
  await query(
    `INSERT INTO SHIPMENT (
       delivery_number, tenant_id, airway_bill_number, client_id, route_id,
       pickup_location, dropoff_location, pickup_lat, pickup_lng,
       dropoff_lat, dropoff_lng, distance_km, status,
       prohibited_check, offline_log,
       assigned_vehicle_plate, assigned_driver_id, assigned_helper_id,
       item_type_flag, created_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'Pending',?,?,?,?,?,?,NOW())`,
    [
      delivery_number, tid, airway_bill_number || null, client_id, route_id || null,
      pickup_location || null, dropoff_location || null,
      pickup_lat || null, pickup_lng || null,
      dropoff_lat || null, dropoff_lng || null,
      distance_km || null,
      prohibited_check ? 1 : 0,
      offline_log ? 1 : 0,
      assigned_vehicle_plate || null,
      assigned_driver_id || null,
      assigned_helper_id || null,
      item_type_flag,
    ]
  );

  // Insert sub-type row
  if (sub_data) {
    const subInserts = {
      PACKAGE: () => query(
        'INSERT INTO SUB_PACKAGE (delivery_number, length, width, height, weight, content_description) VALUES (?,?,?,?,?,?)',
        [delivery_number, sub_data.length||null, sub_data.width||null, sub_data.height||null, sub_data.weight||null, sub_data.content_description||null]
      ),
      VEHICLE: () => query(
        'INSERT INTO SUB_VEHICLE (delivery_number, vin, make_model, running_condition, condition_report) VALUES (?,?,?,?,?)',
        [delivery_number, sub_data.vin||null, sub_data.make_model||null, sub_data.running_condition != null ? (sub_data.running_condition ? 1 : 0) : null, sub_data.condition_report||null]
      ),
      FOOD: () => query(
        'INSERT INTO SUB_FOOD (delivery_number, temperature_required_celsius, product_expiration_date, handling_instructions) VALUES (?,?,?,?)',
        [delivery_number, sub_data.temperature_required_celsius||null, sub_data.product_expiration_date||null, sub_data.handling_instructions||null]
      ),
      DOC: () => query(
        'INSERT INTO SUB_DOCUMENT (delivery_number, confidentiality_level, recipient_id_required) VALUES (?,?,?)',
        [delivery_number, sub_data.confidentiality_level||null, sub_data.recipient_id_required ? 1 : 0]
      ),
      BULK: () => query(
        'INSERT INTO SUB_BULK (delivery_number, pallet_count, stackable, forklift_required) VALUES (?,?,?,?)',
        [delivery_number, sub_data.pallet_count||null, sub_data.stackable != null ? (sub_data.stackable ? 1 : 0) : null, sub_data.forklift_required != null ? (sub_data.forklift_required ? 1 : 0) : null]
      ),
    };
    if (subInserts[item_type_flag]) await subInserts[item_type_flag]();
  }

  res.status(201).json({ ok: true, delivery_number });
});

// PATCH /:slug/api/admin/shipments/:delivery_number/status
router.patch('/shipments/:delivery_number/status', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status, reason } = req.body;
  const tid = req.tenantId;
  const dn  = req.params.delivery_number;
  const validStatuses = ['Pending','Accepted','Declined','In-Transit','Delivered'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  await query(
    'UPDATE SHIPMENT SET status = ? WHERE delivery_number = ? AND tenant_id = ?',
    [status, dn, tid]
  );

  // If declined, record the reason
  if (status === 'Declined' && reason) {
    await query(
      'INSERT INTO DECLINE_REASONS (tenant_id, delivery_number, reason, declined_by, created_at) VALUES (?,?,?,?,NOW())',
      [tid, dn, reason, req.admin.staff_id || null]
    );
  }

  res.json({ ok: true, status });
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────────────────────────

router.get('/staff', requireAdmin, requireSlugMatch, async (req, res) => {
  const { role, status } = req.query;
  const tid = req.tenantId;
  let sql    = 'SELECT staff_id, tenant_id, name, role, username, license_expiration_date, status FROM STAFF WHERE tenant_id = ?';
  const params = [tid];
  if (role)   { sql += ' AND role = ?';   params.push(role); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY name ASC';
  const [rows] = await query(sql, params);
  res.json(rows);
});

router.post('/staff', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const { name, role, username, password, license_expiration_date } = req.body;
  if (!name || !role || !username || !password) {
    return res.status(400).json({ error: 'name, role, username, password are required.' });
  }
  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
  const [result] = await query(
    'INSERT INTO STAFF (tenant_id, name, role, username, password_hash, license_expiration_date, status) VALUES (?,?,?,?,?,?,?)',
    [tid, name, role, username, hash, license_expiration_date || null, 'Available']
  );
  res.status(201).json({ ok: true, staff_id: result.insertId });
});

router.patch('/staff/:id/status', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status } = req.body;
  const valid = ['Available','On-Duty','Sick'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  await query('UPDATE STAFF SET status = ? WHERE staff_id = ? AND tenant_id = ?', [status, req.params.id, req.tenantId]);
  res.json({ ok: true });
});

router.delete('/staff/:id', requireAdmin, requireSlugMatch, async (req, res) => {
  await query('DELETE FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/vehicles', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query(
    'SELECT * FROM VEHICLE WHERE tenant_id = ? ORDER BY plate_number ASC',
    [req.tenantId]
  );
  res.json(rows);
});

router.post('/vehicles', requireAdmin, requireSlugMatch, async (req, res) => {
  const { plate_number, vehicle_type, capacity_tons } = req.body;
  if (!plate_number || !vehicle_type) {
    return res.status(400).json({ error: 'plate_number and vehicle_type are required.' });
  }
  await query(
    'INSERT INTO VEHICLE (plate_number, tenant_id, vehicle_type, capacity_tons, status) VALUES (?,?,?,?,?)',
    [plate_number, req.tenantId, vehicle_type, capacity_tons || null, 'Available']
  );
  res.status(201).json({ ok: true, plate_number });
});

router.patch('/vehicles/:plate/status', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status } = req.body;
  const valid = ['Available','Maintenance','In-Transit'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  await query('UPDATE VEHICLE SET status = ? WHERE plate_number = ? AND tenant_id = ?', [status, req.params.plate, req.tenantId]);
  res.json({ ok: true });
});

router.delete('/vehicles/:plate', requireAdmin, requireSlugMatch, async (req, res) => {
  await query('DELETE FROM VEHICLE WHERE plate_number = ? AND tenant_id = ?', [req.params.plate, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

// Show APP_USER as clients (merged view)
router.get('/clients', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query(
    `SELECT
       u.user_id   AS client_id,
       u.tenant_id,
       CONCAT(u.first_name, ' ', u.last_name) AS company_name,
       CONCAT(u.first_name, ' ', u.last_name) AS contact_person,
       u.phone     AS phone_number,
       u.email     AS username,
       u.status,
       u.created_at
     FROM APP_USER u
     WHERE u.tenant_id = ?
     ORDER BY u.created_at DESC`,
    [req.tenantId]
  );
  res.json(rows);
});

router.post('/clients', requireAdmin, requireSlugMatch, async (req, res) => {
  const { company_name, contact_person, phone_number, username, password } = req.body;
  if (!company_name || !username || !password) {
    return res.status(400).json({ error: 'company_name, username, and password are required.' });
  }
  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
  const [result] = await query(
    'INSERT INTO CLIENT (tenant_id, company_name, contact_person, phone_number, username, password_hash) VALUES (?,?,?,?,?,?)',
    [req.tenantId, company_name, contact_person||null, phone_number||null, username, hash]
  );
  res.status(201).json({ ok: true, client_id: result.insertId });
});

router.delete('/clients/:id', requireAdmin, requireSlugMatch, async (req, res) => {
  await query('DELETE FROM APP_USER WHERE user_id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/routes', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query(
    `SELECT r.*, s.name AS driver_name
     FROM ROUTE r
     LEFT JOIN STAFF s ON s.staff_id = r.primary_driver_id
     WHERE r.tenant_id = ? ORDER BY r.route_name ASC`,
    [req.tenantId]
  );
  res.json(rows);
});

router.post('/routes', requireAdmin, requireSlugMatch, async (req, res) => {
  const { route_name, assigned_vehicle_plate, primary_driver_id } = req.body;
  if (!route_name) return res.status(400).json({ error: 'route_name is required.' });
  const [result] = await query(
    'INSERT INTO ROUTE (tenant_id, route_name, assigned_vehicle_plate, primary_driver_id) VALUES (?,?,?,?)',
    [req.tenantId, route_name, assigned_vehicle_plate||null, primary_driver_id||null]
  );
  res.status(201).json({ ok: true, route_id: result.insertId });
});

router.delete('/routes/:id', requireAdmin, requireSlugMatch, async (req, res) => {
  await query('DELETE FROM ROUTE WHERE route_id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/payments', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status, payment_method } = req.query;
  const tid = req.tenantId;
  let sql = 'SELECT p.*, s.pickup_location, s.dropoff_location FROM PAYMENT p LEFT JOIN SHIPMENT s ON s.delivery_number = p.delivery_number WHERE p.tenant_id = ?';
  const params = [tid];
  if (status)         { sql += ' AND p.status = ?';         params.push(status); }
  if (payment_method) { sql += ' AND p.payment_method = ?'; params.push(payment_method); }
  sql += ' ORDER BY p.billing_date DESC';
  const [rows] = await query(sql, params);
  res.json(rows);
});

router.post('/payments', requireAdmin, requireSlugMatch, async (req, res) => {
  const { delivery_number, billing_date, total_amount, payment_method, reference_code } = req.body;
  if (!delivery_number || !total_amount) {
    return res.status(400).json({ error: 'delivery_number and total_amount are required.' });
  }
  const [result] = await query(
    `INSERT INTO PAYMENT (tenant_id, delivery_number, billing_date, total_amount, payment_method, reference_code, admin_confirmed, status)
     VALUES (?,?,?,?,?,?,0,'Pending')`,
    [req.tenantId, delivery_number, billing_date||null, total_amount, payment_method||null, reference_code||null]
  );
  res.status(201).json({ ok: true, invoice_id: result.insertId });
});

// Admin confirms GCash / COD payment
router.patch('/payments/:id/confirm', requireAdmin, requireSlugMatch, async (req, res) => {
  await query(
    "UPDATE PAYMENT SET admin_confirmed = 1, status = 'Paid' WHERE invoice_id = ? AND tenant_id = ?",
    [req.params.id, req.tenantId]
  );
  res.json({ ok: true });
});

router.patch('/payments/:id/status', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status } = req.body;
  const valid = ['Paid','Pending','Overdue','AwaitingAdmin'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  await query('UPDATE PAYMENT SET status = ? WHERE invoice_id = ? AND tenant_id = ?', [status, req.params.id, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROOF OF DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/pod', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query(
    'SELECT * FROM PROOF_OF_DELIVERY WHERE tenant_id = ? ORDER BY delivery_timestamp DESC',
    [req.tenantId]
  );
  res.json(rows);
});

router.post('/pod', requireAdmin, requireSlugMatch, async (req, res) => {
  const { delivery_number, capture_type, media_url, geolocation } = req.body;
  if (!delivery_number || !capture_type) {
    return res.status(400).json({ error: 'delivery_number and capture_type are required.' });
  }
  const [result] = await query(
    'INSERT INTO PROOF_OF_DELIVERY (tenant_id, delivery_number, capture_type, media_url, delivery_timestamp, geolocation) VALUES (?,?,?,?,NOW(),?)',
    [req.tenantId, delivery_number, capture_type, media_url||null, geolocation||null]
  );
  res.status(201).json({ ok: true, pod_id: result.insertId });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTERED USERS (users who came through /:slug/register)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/users', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query(
    'SELECT user_id, first_name, last_name, email, phone, role, status, created_at FROM APP_USER WHERE tenant_id = ? ORDER BY created_at DESC',
    [req.tenantId]
  );
  res.json(rows);
});

router.patch('/users/:id/status', requireAdmin, requireSlugMatch, async (req, res) => {
  const { status } = req.body;
  const valid = ['active','suspended'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  await query('UPDATE APP_USER SET status = ? WHERE user_id = ? AND tenant_id = ?', [status, req.params.id, req.tenantId]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/settings', requireAdmin, requireSlugMatch, async (req, res) => {
  const { company_name, new_password } = req.body;
  const tid = req.tenantId;

  if (company_name) {
    await query('UPDATE TENANT SET company_name = ? WHERE tenant_id = ?', [company_name, tid]);
  }
  if (new_password) {
    if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const hash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await query(
      "UPDATE STAFF SET password_hash = ? WHERE tenant_id = ? AND role = 'Admin' AND username = ?",
      [hash, tid, req.admin.email]
    );
  }
  res.json({ ok: true });
});

module.exports = router;