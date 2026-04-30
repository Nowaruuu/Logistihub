'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, tenantQuery, logAudit } = require('../config/db');
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
    "SELECT *, staff_id AS id FROM STAFF WHERE tenant_id = ? AND username = ? AND role = 'Admin' LIMIT 1",
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

  res.cookie(`admin_token_${req.params.slug}`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge:   8 * 60 * 60 * 1000,
  });

  logAudit({ actor: email, actor_type: 'admin', action: 'LOGIN', target: 'Admin Dashboard', tenant_slug: slug, ip_address: req.ip });

  res.json({ ok: true, slug, name: staff.name });
});

router.post('/:slug/api/admin/logout', (req, res) => {
  let email = 'unknown';
  try {
    const token = req.cookies[`admin_token_${req.params.slug}`];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      email = decoded.email;
    }
  } catch (e) { /* ignore expired token on logout */ }

  logAudit({ actor: email, actor_type: 'admin', action: 'LOGOUT', target: 'Admin Dashboard', tenant_slug: req.params.slug, ip_address: req.ip });

  res.clearCookie(`admin_token_${req.params.slug}`);
  res.json({ ok: true });
});

router.get('/:slug/api/admin/me', requireAdmin, requireSlugMatch, (req, res) => {
  res.json({ admin: req.admin, tenant: req.tenant });
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS & PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

router.put('/:slug/api/admin/password', requireAdmin, requireSlugMatch, async (req, res) => {
  const { current_password, new_password } = req.body;
  const tid = req.tenantId;
  const username = req.admin.email;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  }

  try {
    const [rows] = await query('SELECT password_hash FROM STAFF WHERE username = ? AND tenant_id = ? LIMIT 1', [username, tid]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password.' });

    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE STAFF SET password_hash = ? WHERE username = ? AND tenant_id = ?', [hash, username, tid]);

    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[PUT /admin/password]', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});
router.get('/:slug/api/admin/stats', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const [[total]]     = await tenantQuery(tid, 'SELECT COUNT(*) AS n FROM shipment');
  const [[transit]]   = await tenantQuery(tid, "SELECT COUNT(*) AS n FROM shipment WHERE status = 'In-Transit'");
  const [[delivered]] = await tenantQuery(tid, "SELECT COUNT(*) AS n FROM shipment WHERE status = 'Delivered'");
  const [[pending]]   = await tenantQuery(tid, "SELECT COUNT(*) AS n FROM payment WHERE status IN ('Pending','AwaitingAdmin')");
  const [[revenue]]   = await tenantQuery(tid, "SELECT COALESCE(SUM(total_amount),0) AS n FROM payment WHERE status = 'Paid'");

  res.json({
    total_shipments:  total.n,
    in_transit:       transit.n,
    delivered:        delivered.n,
    pending_payments: pending.n,
    total_revenue:    revenue.n,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/payments', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  try {
    // Only show the LATEST payment record per delivery (deduplicates multiple Pay Now clicks)
    const [rows] = await query(
      `SELECT p.*,
              COALESCE(u.first_name, '') AS customer_first,
              COALESCE(u.last_name, '')  AS customer_last,
              u.email                    AS customer_email,
              s.receiver_name, s.total_fee
       FROM payment p
       INNER JOIN (
         SELECT delivery_number, MAX(invoice_id) AS latest_id
         FROM payment WHERE tenant_id = ?
         GROUP BY delivery_number
       ) latest ON latest.latest_id = p.invoice_id
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id
       WHERE p.tenant_id = ?
       ORDER BY p.invoice_id DESC
       LIMIT 200`,
      [tid, tid]
    );
    const [[{ total_revenue }]] = await query(
      "SELECT COALESCE(SUM(total_amount),0) AS total_revenue FROM payment WHERE tenant_id = ? AND status = 'Paid'",
      [tid]
    );
    const [[{ pending_count }]] = await query(
      "SELECT COUNT(DISTINCT delivery_number) AS pending_count FROM payment WHERE tenant_id = ? AND status = 'Pending'",
      [tid]
    );
    res.json({ payments: rows, total_revenue, pending_count });
  } catch (err) {
    console.error('[GET /admin/payments]', err);
    res.status(500).json({ error: err.message || 'Failed to load payments.' });
  }
});

// Admin manually confirms a payment (cash, etc.)
router.post('/:slug/api/admin/payments/:id/confirm', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const { id } = req.params;
  try {
    await query(
      "UPDATE payment SET status = 'Paid', admin_confirmed = 1, paid_at = NOW() WHERE invoice_id = ? AND tenant_id = ?",
      [id, tid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /admin/payments/confirm]', err);
    res.status(500).json({ error: err.message || 'Failed to confirm payment.' });
  }
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
    SELECT s.*, 
           COALESCE(c.company_name, CONCAT(u.first_name, ' ', u.last_name), 'Walk-in') AS client_name,
           d.name AS driver_name,
           h.name AS helper_name, r.route_name
    FROM shipment s
    LEFT JOIN client c ON c.client_id = s.client_id
    LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id
    LEFT JOIN STAFF d ON d.staff_id = s.assigned_driver_id
    LEFT JOIN STAFF h ON h.staff_id = s.assigned_helper_id
    LEFT JOIN route r ON r.route_id = s.route_id
    WHERE s.tenant_id = ?
  `;
  
  const params = [tid];
  if (statusFilter) { sql += ' AND s.status = ?'; params.push(statusFilter); }
  if (typeFilter)   { sql += ' AND s.item_type_flag = ?'; params.push(typeFilter); }

  // LIMIT/OFFSET must be embedded directly — they cannot be bound params in MySQL prepared statements
  sql += ` ORDER BY s.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  try {
    const [rows] = await query(sql, params);
    res.json({ shipments: rows, total: rows.length });
  } catch (err) {
    console.error('[GET /admin/shipments]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug/api/admin/shipments/:delivery_number', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const dn  = req.params.delivery_number;

  const [rows] = await query('SELECT * FROM shipment WHERE delivery_number = ? AND tenant_id = ? LIMIT 1', [dn, tid]);
  if (!rows.length) return res.status(404).json({ error: 'Shipment not found.' });

  const shipment = rows[0];
  const subtableMap = { PACKAGE: 'SUB_PACKAGE', VEHICLE: 'SUB_VEHICLE', FOOD: 'SUB_FOOD', DOC: 'SUB_DOCUMENT', BULK: 'SUB_BULK' };
  const subtable = subtableMap[shipment.item_type_flag];
  let subData = null;

  if (subtable) {
    const [sub] = await query(`SELECT * FROM \`${subtable}\` WHERE delivery_number = ? LIMIT 1`, [dn]);
    subData = sub[0] || null;
  }

  const [pod] = await query('SELECT * FROM proof_of_delivery WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);
  const [payments] = await query('SELECT * FROM payment WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);
  const [declines] = await query('SELECT * FROM decline_reasons WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);

  res.json({ shipment, sub_data: subData, pod, payments, declines });
});

router.post('/:slug/api/admin/shipments', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const {
    delivery_number, airway_bill_number, client_id, route_id,
    pickup_location, dropoff_location, pickup_lat, pickup_lng,
    dropoff_lat, dropoff_lng, distance_km,
    assigned_vehicle_plate, assigned_driver_id, assigned_helper_id,
    item_type_flag, prohibited_check, offline_log, sub_data, status
  } = req.body;

  if (!delivery_number || !client_id || !item_type_flag) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const initialStatus = status || 'Pending';

  try {
    await query(
      `INSERT INTO shipment (
        delivery_number, tenant_id, airway_bill_number, client_id, route_id,
        pickup_location, dropoff_location, distance_km, status, item_type_flag,
        prohibited_check, offline_log, assigned_vehicle_plate, assigned_driver_id, assigned_helper_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        delivery_number, tid, airway_bill_number, client_id, route_id,
        pickup_location, dropoff_location, distance_km, initialStatus, item_type_flag,
        prohibited_check, offline_log, assigned_vehicle_plate, assigned_driver_id, assigned_helper_id
      ]
    );

    // Insert into sub_tables if sub_data exists
    if (sub_data) {
      if (item_type_flag === 'PACKAGE') {
        await query(
          'INSERT INTO sub_package (delivery_number, length, width, height, weight, content_description) VALUES (?, ?, ?, ?, ?, ?)',
          [delivery_number, sub_data.length, sub_data.width, sub_data.height, sub_data.weight, sub_data.content_description]
        );
      } else if (item_type_flag === 'VEHICLE') {
        await query(
          'INSERT INTO sub_vehicle (delivery_number, vin, make_model, running_condition, condition_report) VALUES (?, ?, ?, ?, ?)',
          [delivery_number, sub_data.vin, sub_data.make_model, sub_data.running_condition, sub_data.condition_report]
        );
      } else if (item_type_flag === 'FOOD') {
        await query(
          'INSERT INTO sub_food (delivery_number, temperature_required_celsius, expiration_date, handling_instructions) VALUES (?, ?, ?, ?)',
          [delivery_number, sub_data.temperature_required_celsius, sub_data.expiration_date, sub_data.handling_instructions]
        );
      } else if (item_type_flag === 'DOC') {
        await query(
          'INSERT INTO sub_document (delivery_number, confidentiality_level, recipient_id_required) VALUES (?, ?, ?)',
          [delivery_number, sub_data.confidentiality_level, sub_data.recipient_id_required]
        );
      } else if (item_type_flag === 'BULK') {
        await query(
          'INSERT INTO sub_bulk (delivery_number, pallet_count, stackable, forklift_required) VALUES (?, ?, ?, ?)',
          [delivery_number, sub_data.pallet_count, sub_data.stackable, sub_data.forklift_required]
        );
      }
    }

    res.status(201).json({ ok: true, delivery_number });
  } catch (err) {
    console.error('[POST /admin/shipments]', err);
    res.status(500).json({ error: err.message || 'Failed to create shipment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF & VEHICLES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:slug/api/admin/staff', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query('SELECT *, staff_id AS id FROM STAFF WHERE tenant_id = ? ORDER BY name ASC', [req.tenantId]);
  
  const currentUserEmail = req.admin.email;
  const staffWithMeta = rows.map(s => ({
    ...s,
    is_current_user: s.username === currentUserEmail
  }));

  res.json(staffWithMeta);
});

router.delete('/:slug/api/admin/staff/:id', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const { id } = req.params;
    const tid = req.tenantId;
    // Check the record exists in this tenant
    const [rows] = await query('SELECT role, username FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found.' });
    
    // Prevent the currently logged-in Admin from deleting themselves
    if (rows[0].username === req.admin.email) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // Prevent Managers from deleting Admins or other Managers
    if (req.admin.role === 'Manager' && (rows[0].role === 'Admin' || rows[0].role === 'admin' || rows[0].role === 'Manager')) {
      return res.status(403).json({ error: 'Managers are not allowed to delete Admin or Manager accounts.' });
    }

    await query('DELETE FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    
    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'DELETE_STAFF', target: rows[0].username, tenant_slug: req.params.slug, ip_address: req.ip });

    res.json({ ok: true });
  } catch(err) {
    console.error('[DELETE /admin/staff]', err);
    res.status(500).json({ error: err.message || 'Failed to delete staff.' });
  }
});

router.put('/:slug/api/admin/staff/:id/suspend', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body;
    const tid = req.tenantId;

    const [rows] = await query('SELECT role, username FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found.' });

    // Prevent suspending yourself
    if (rows[0].username === req.admin.email) {
      return res.status(400).json({ error: 'You cannot suspend your own account.' });
    }

    // Prevent Managers from suspending Admins or other Managers
    if (req.admin.role === 'Manager' && (rows[0].role === 'Admin' || rows[0].role === 'admin' || rows[0].role === 'Manager')) {
      return res.status(403).json({ error: 'Managers are not allowed to suspend Admin or Manager accounts.' });
    }

    const newStatus = suspended ? 'suspended' : 'active';
    await query('UPDATE STAFF SET status = ? WHERE staff_id = ? AND tenant_id = ?', [newStatus, id, tid]);
    
    logAudit({ actor: req.admin.email, actor_type: 'admin', action: suspended ? 'SUSPEND_STAFF' : 'ACTIVATE_STAFF', target: rows[0].username, tenant_slug: req.params.slug, ip_address: req.ip });

    res.json({ ok: true, status: newStatus });
  } catch(err) {
    console.error('[PUT /admin/staff/:id/suspend]', err);
    res.status(500).json({ error: err.message || 'Failed to update suspension status.' });
  }
});

router.get('/:slug/api/admin/vehicles', requireAdmin, requireSlugMatch, async (req, res) => {
  const [rows] = await query('SELECT * FROM vehicle WHERE tenant_id = ? ORDER BY plate_number ASC', [req.tenantId]);
  res.json(rows);
});

router.delete('/:slug/api/admin/vehicles/:plate', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    await query('DELETE FROM vehicle WHERE plate_number = ? AND tenant_id = ?', [req.params.plate, req.tenantId]);
    res.json({ ok: true });
  } catch(err) {
    console.error('[DELETE /admin/vehicles]', err);
    res.status(500).json({ error: err.message || 'Failed to delete vehicle.' });
  }
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

// GET /:slug/api/admin/settings
router.get('/:slug/api/admin/settings', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  try {
    const [tenants] = await query('SELECT company_name, slug, brand_color, bg_app_color, bg_sidebar_color, logo_url, background_url, bg_hero_color, bg_page_color FROM TENANT WHERE tenant_id = ?', [tid]);
    const [staff] = await query("SELECT name, username AS email FROM STAFF WHERE tenant_id = ? AND role = 'Admin' LIMIT 1", [tid]);
    res.json({ ...tenants[0], ...staff[0] });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
router.put('/:slug/api/admin/settings', requireAdmin, requireSlugMatch, async (req, res) => {
  const { company_name, brand_color, bg_app_color, bg_sidebar_color, logo_url, background_url, bg_hero_color, bg_page_color, new_password } = req.body;
  const tid = req.tenantId;

  const safeSet = async (col, val) => {
    if (val === undefined) return;
    try {
      await query(`UPDATE TENANT SET ${col} = ? WHERE tenant_id = ?`, [val || null, tid]);
    } catch(e) {
      console.warn(`[settings] Could not update ${col}:`, e.message);
    }
  };

  try {
    if (company_name)    await safeSet('company_name', company_name);
    if (brand_color !== undefined)      await safeSet('brand_color', brand_color);
    if (bg_app_color !== undefined)     await safeSet('bg_app_color', bg_app_color);
    if (bg_sidebar_color !== undefined) await safeSet('bg_sidebar_color', bg_sidebar_color);
    if (logo_url !== undefined)         await safeSet('logo_url', logo_url);
    if (background_url !== undefined)   await safeSet('background_url', background_url);
    await safeSet('bg_hero_color', bg_hero_color);
    await safeSet('bg_page_color', bg_page_color);

    if (new_password && new_password.length >= 8) {
      const hash = await bcrypt.hash(new_password, 12);
      await query("UPDATE STAFF SET password_hash = ? WHERE tenant_id = ? AND role = 'Admin' AND username = ?", [hash, tid, req.admin.email]);
    }

    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'UPDATE_SETTINGS', target: 'Workspace Configuration', tenant_slug: req.params.slug, ip_address: req.ip });

    res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Failed to update settings.', detail: err.message });
  }
});

router.get('/:slug/api/admin/app-users', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const [users] = await query('SELECT user_id, CONCAT(first_name, \' \', last_name) AS full_name, email, contact_email, role, status, created_at FROM APP_USER WHERE tenant_id = ? ORDER BY created_at DESC', [req.tenant.tenant_id]);
    res.json({ users });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE STAFF  (Admin only — can add any role including Manager)
// ─────────────────────────────────────────────────────────────────────────────
const { sendStaffWelcomeEmail } = require('../config/mailer');
const crypto = require('crypto');

router.post('/:slug/api/admin/staff', requireAdmin, requireSlugMatch, async (req, res) => {
  const { name, email, role, license_expiry } = req.body;  // email = Gmail address
  const tid  = req.tenantId;
  const slug = req.params.slug;

  const ALLOWED_ROLES = ['Driver', 'Document Controller', 'Manager'];
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required.' });
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });

  // Manager cannot promote/create Manager or Admin
  if (req.admin.role === 'Manager' && (role === 'Manager' || role === 'Admin' || role === 'admin')) {
    return res.status(403).json({ error: 'Managers are not allowed to create Manager or Admin accounts.' });
  }

  // Derive login username: prefix from Gmail + @slug.com
  // e.g. bollinrah@gmail.com  →  bollinrah@amongiz.com  (if slug = 'amongiz')
  const gmailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const loginUsername = gmailPrefix + '@' + slug + '.com';

  try {
    // Check login username not already taken in this tenant
    const [existing] = await query('SELECT 1 FROM STAFF WHERE username = ? AND tenant_id = ?', [loginUsername, tid]);
    if (existing.length) return res.status(409).json({ error: 'A staff member with username ' + loginUsername + ' already exists.' });

    // Generate temp password
    const tempPassword = 'Temp@' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const hash = await bcrypt.hash(tempPassword, 10);

    const firstName = name.split(' ')[0];
    const lastName  = name.split(' ').slice(1).join(' ') || '';

    await query(
      `INSERT INTO STAFF (tenant_id, name, first_name, last_name, role, username, password_hash, status, contact_email, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 1)`,
      [tid, name, firstName, lastName, role, loginUsername, hash, email]
    );

    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'ADD_STAFF', target: `${name} (${role})`, tenant_slug: req.params.slug, ip_address: req.ip });


    // If license_expiry column exists, update it separately (safe)
    if (license_expiry) {
      try {
        await query('UPDATE STAFF SET license_expiry = ? WHERE username = ? AND tenant_id = ?', [license_expiry, loginUsername, tid]);
      } catch(_) { /* column may not exist — silently skip */ }
    }

    // Respond immediately — email is fire-and-forget
    res.status(201).json({ ok: true, message: 'Staff created. Welcome email sent to ' + email + '.', username: loginUsername });

    // Send email AFTER responding — to Gmail address, but showing loginUsername as their credentials
    const [tenants] = await query('SELECT company_name FROM TENANT WHERE tenant_id = ?', [tid]);
    const companyName = tenants[0]?.company_name || 'Your Company';
    const loginUrl = (process.env.BASE_URL || 'https://logistichub.ddns.net') + '/' + slug + '/staff-login';
    sendStaffWelcomeEmail(email, name, loginUsername, tempPassword, role, companyName, loginUrl)
      .catch(e => console.warn('[staff-create] Email failed:', e.message));

  } catch(err) {
    console.error('[POST /admin/staff]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Failed to create staff.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE VEHICLE (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:slug/api/admin/vehicles', requireAdmin, requireSlugMatch, async (req, res) => {
    const { plate_number, type, capacity_tons, status, ownership_doc } = req.body;
  const tid = req.tenantId;

  if (!plate_number || !type) return res.status(400).json({ error: 'plate_number and type are required.' });
  if (!ownership_doc) return res.status(400).json({ error: 'Certificate of Registration / Official Receipt (CR/OR) document is required.' });

  try {
    // Use SELECT 1 to avoid unknown column names
    const [existing] = await query('SELECT 1 FROM vehicle WHERE plate_number = ? AND tenant_id = ?', [plate_number.toUpperCase(), tid]);
    if (existing.length) return res.status(409).json({ error: 'A vehicle with that plate number already exists.' });

    // ── Plan vehicle limit check ──────────────────────────────────────────
    const [[tenant]] = await query('SELECT plan FROM TENANT WHERE tenant_id = ?', [tid]);
    if (tenant && tenant.plan === 'startup') {
      const [[vc]] = await query('SELECT COUNT(*) AS n FROM vehicle WHERE tenant_id = ?', [tid]);
      if (vc.n >= 10) {
        return res.status(402).json({ error: 'Startup plan is limited to 10 vehicles. Upgrade to Enterprise or Global to add more.' });
      }
    }

    await query(
      `INSERT INTO vehicle (tenant_id, plate_number, vehicle_type, capacity_tons, status, ownership_doc) VALUES (?, ?, ?, ?, ?, ?)`,
      [tid, plate_number.toUpperCase(), type, capacity_tons || null, status || 'Available', ownership_doc || null]
    );

    res.status(201).json({ ok: true, message: 'Vehicle added successfully.' });
  } catch(err) {
    console.error('[POST /admin/vehicles]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Failed to add vehicle.' });
  }
});

router.put('/:slug/api/admin/vehicles/:plate', requireAdmin, requireSlugMatch, async (req, res) => {
  const { type, capacity_tons, status } = req.body;
  const tid = req.tenantId;
  const plate = req.params.plate;

  if (!type) return res.status(400).json({ error: 'Type is required.' });

  try {
    await query(
      `UPDATE vehicle SET vehicle_type = ?, capacity_tons = ?, status = ? WHERE plate_number = ? AND tenant_id = ?`,
      [type, capacity_tons || null, status || 'Available', plate, tid]
    );
    res.json({ ok: true, message: 'Vehicle updated successfully.' });
  } catch(err) {
    console.error('[PUT /admin/vehicles]', err);
    res.status(500).json({ error: err.message || 'Failed to update vehicle.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER LOGIN
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:slug/api/manager/login', async (req, res) => {
  const { email, password } = req.body;
  const { slug } = req.params;
  const [tenants] = await query("SELECT * FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1", [slug]);
  if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
  const tenant = tenants[0];
  const [rows] = await query(
    "SELECT *, staff_id AS id FROM STAFF WHERE tenant_id = ? AND username = ? AND role = 'Manager' LIMIT 1",
    [tenant.tenant_id, email]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  const staff = rows[0];
  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { role: 'Manager', tenant_id: tenant.tenant_id, slug, name: staff.name, email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.cookie('manager_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600 * 1000 });
  res.json({ ok: true, slug, name: staff.name, role: 'Manager' });
});

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER ROUTES  (Manager + Admin can access)
// ─────────────────────────────────────────────────────────────────────────────
const { requireManager } = require('../middleware/auth');

// Manager: GET staff (all staff for their tenant)
router.get('/:slug/api/manager/staff', requireManager, requireSlugMatch, async (req, res) => {
  const [rows] = await query('SELECT *, staff_id AS id FROM STAFF WHERE tenant_id = ? ORDER BY name ASC', [req.tenantId]);
  
  const currentUserEmail = req.manager.email;
  const staffWithMeta = rows.map(s => ({
    ...s,
    is_current_user: s.username === currentUserEmail
  }));

  res.json(staffWithMeta);
});

// Manager: GET shipments
router.get('/:slug/api/manager/shipments', requireManager, requireSlugMatch, async (req, res) => {
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
});

// Manager: POST staff (can add Driver or Document Controller ONLY — not Manager)
router.post('/:slug/api/manager/staff', requireManager, requireSlugMatch, async (req, res) => {
  const { name, email, role, license_expiry } = req.body;
  const tid  = req.tenantId;
  const slug = req.params.slug;

  const MANAGER_ALLOWED = ['Driver', 'Document Controller'];
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required.' });
  if (!MANAGER_ALLOWED.includes(role)) return res.status(403).json({ error: 'Managers can only add Driver or Document Controller roles.' });

  const [existing] = await query('SELECT staff_id FROM STAFF WHERE username = ? AND tenant_id = ?', [email, tid]);
  if (existing.length) return res.status(409).json({ error: 'A staff member with that username already exists.' });

  const tempPassword = 'Temp@' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const hash = await bcrypt.hash(tempPassword, 12);
  const firstName = name.split(' ')[0];
  const lastName  = name.split(' ').slice(1).join(' ') || '';

  await query(
    `INSERT INTO STAFF (tenant_id, name, first_name, last_name, role, username, password_hash, status, license_expiry)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [tid, name, firstName, lastName, role, email, hash, license_expiry || null]
  );

  const [tenants] = await query('SELECT company_name FROM TENANT WHERE tenant_id = ?', [tid]);
  const companyName = tenants[0]?.company_name || 'Your Company';
  const loginUrl = (process.env.BASE_URL || 'https://logistichub.ddns.net') + '/' + slug + '/staff-login';
  try {
    await sendStaffWelcomeEmail(email, name, email, tempPassword, role, companyName, loginUrl);
  } catch(mailErr) {
    console.warn('[manager-staff-create] Email failed:', mailErr.message);
  }

  res.status(201).json({ ok: true, message: 'Staff created and welcome email sent.' });
});

// Manager: DELETE staff
router.delete('/:slug/api/manager/staff/:id', requireManager, requireSlugMatch, async (req, res) => {
  try {
    const { id } = req.params;
    const tid = req.tenantId;
    const [rows] = await query('SELECT role, username FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found.' });

    if (rows[0].username === req.manager.email) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    if (req.manager.role === 'Manager' && (rows[0].role === 'Admin' || rows[0].role === 'admin' || rows[0].role === 'Manager')) {
      return res.status(403).json({ error: 'Managers are not allowed to delete Admin or Manager accounts.' });
    }

    await query('DELETE FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    res.json({ ok: true });
  } catch(err) {
    console.error('[DELETE /manager/staff]', err);
    res.status(500).json({ error: err.message || 'Failed to delete staff.' });
  }
});

// Manager: SUSPEND staff
router.put('/:slug/api/manager/staff/:id/suspend', requireManager, requireSlugMatch, async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body;
    const tid = req.tenantId;

    const [rows] = await query('SELECT role, username FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found.' });

    if (rows[0].username === req.manager.email) {
      return res.status(400).json({ error: 'You cannot suspend your own account.' });
    }

    if (req.manager.role === 'Manager' && (rows[0].role === 'Admin' || rows[0].role === 'admin' || rows[0].role === 'Manager')) {
      return res.status(403).json({ error: 'Managers are not allowed to suspend Admin or Manager accounts.' });
    }

    const newStatus = suspended ? 'suspended' : 'active';
    await query('UPDATE STAFF SET status = ? WHERE staff_id = ? AND tenant_id = ?', [newStatus, id, tid]);
    res.json({ ok: true, status: newStatus });
  } catch(err) {
    console.error('[PUT /manager/staff/:id/suspend]', err);
    res.status(500).json({ error: err.message || 'Failed to update suspension status.' });
  }
});

// Manager: GET vehicles
router.get('/:slug/api/manager/vehicles', requireManager, requireSlugMatch, async (req, res) => {
  const [rows] = await query('SELECT * FROM vehicle WHERE tenant_id = ? ORDER BY plate_number ASC', [req.tenantId]);
  res.json(rows);
});

// Manager: GET /me
router.get('/:slug/api/manager/me', requireManager, requireSlugMatch, async (req, res) => {
  const [tenants] = await query('SELECT company_name, logo_url FROM TENANT WHERE tenant_id = ?', [req.tenantId]);
  res.json({ ...req.manager, ...tenants[0] });
});

// Admin: GET audit-logs
router.get('/:slug/api/admin/audit-logs', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const slug = req.params.slug;
    const tid = req.tenantId;
    // JOIN with STAFF to resolve first_name + last_name from actor email
    const [rows] = await query(`
      SELECT a.*,
        COALESCE(
          NULLIF(CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,'')), ' '),
          s.name,
          a.actor
        ) AS actor_name
      FROM AUDIT_LOG a
      LEFT JOIN STAFF s ON a.actor = s.username AND s.tenant_id = ?
      WHERE a.tenant_slug = ? AND a.actor_type != 'superadmin'
      ORDER BY a.created_at DESC LIMIT 200
    `, [tid, slug]);
    res.json(rows);
  } catch (e) {
    console.error('Admin audit logs error:', e);
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE PLAN — PayMongo Checkout
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRICES = {
  startup:    { amount: 9900,  label: 'Startup Plan'    },   // ₱99 in centavos
  enterprise: { amount: 49900, label: 'Enterprise Plan' },   // ₱499
  global:     { amount: 99900, label: 'Global Plan'     },   // ₱999
};
const PLAN_ORDER = ['startup', 'enterprise', 'global'];

router.post('/:slug/api/admin/upgrade', requireAdmin, requireSlugMatch, async (req, res) => {
  const { plan } = req.body;
  const tid = req.tenantId;
  const slug = req.params.slug;

  if (!plan || !PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan.' });

  // Check that the plan is actually an upgrade
  const [[tenant]] = await query('SELECT plan FROM TENANT WHERE tenant_id = ?', [tid]);
  const currentIdx = PLAN_ORDER.indexOf(tenant?.plan?.toLowerCase() || 'startup');
  const targetIdx  = PLAN_ORDER.indexOf(plan);
  if (targetIdx <= currentIdx) return res.status(400).json({ error: 'You can only upgrade to a higher plan.' });

  const pmKey = process.env.PAYMONGO_SECRET_KEY;
  if (!pmKey) return res.status(500).json({ error: 'Payment gateway not configured. Contact platform support.' });

  try {
    const baseUrl = process.env.BASE_URL || 'https://logistichub.ddns.net';

    // Create a signed token to verify the success callback is legitimate
    const crypto = require('crypto');
    const jwtSecret = process.env.JWT_SECRET || 'logistihub-upgrade';
    const token = crypto.createHmac('sha256', jwtSecret).update(`${tid}:${plan}:${slug}`).digest('hex');

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(pmKey + ':').toString('base64'),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [{
              name: PLAN_PRICES[plan].label + ' — ' + (tenant?.company_name || slug),
              amount: PLAN_PRICES[plan].amount,
              currency: 'PHP',
              quantity: 1,
            }],
            payment_method_types: ['gcash', 'card', 'grab_pay', 'paymaya'],
            description: `Subscription upgrade to ${plan} for ${slug}`,
            success_url: `${baseUrl}/${slug}/api/admin/upgrade/success?plan=${plan}&token=${token}`,
            cancel_url: `${baseUrl}/${slug}/admin`,
            metadata: { tenant_id: String(tid), slug, plan },
          }
        }
      })
    });
    const pmData = await response.json();
    if (!response.ok) {
      console.error('[PayMongo checkout error]', JSON.stringify(pmData));
      return res.status(502).json({ error: 'Payment gateway error. Please try again.' });
    }
    const checkoutUrl = pmData.data?.attributes?.checkout_url;
    if (!checkoutUrl) return res.status(502).json({ error: 'Could not create checkout session.' });

    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'UPGRADE_INITIATED', target: `${tenant?.plan} → ${plan}`, tenant_slug: slug, ip_address: req.ip });
    res.json({ ok: true, checkout_url: checkoutUrl });
  } catch(err) {
    console.error('[POST /admin/upgrade]', err);
    res.status(500).json({ error: 'Failed to create checkout. ' + err.message });
  }
});

// Success callback after PayMongo payment
router.get('/:slug/api/admin/upgrade/success', async (req, res) => {
  const { plan, token } = req.query;
  const slug = req.params.slug;

  if (!plan || !PLAN_PRICES[plan]) return res.redirect(`/${slug}/admin`);

  try {
    // Verify the signed token — only URLs generated by our server will have a valid token
    const [[tenant]] = await query('SELECT tenant_id, plan FROM TENANT WHERE slug = ?', [slug]);
    if (!tenant) return res.redirect(`/${slug}/admin`);

    const crypto = require('crypto');
    const jwtSecret = process.env.JWT_SECRET || 'logistihub-upgrade';
    const expectedToken = crypto.createHmac('sha256', jwtSecret).update(`${tenant.tenant_id}:${plan}:${slug}`).digest('hex');

    if (token !== expectedToken) {
      console.warn('[Upgrade] Invalid token for', slug, plan);
      return res.redirect(`/${slug}/admin`);
    }

    // Update tenant plan
    await query('UPDATE TENANT SET plan = ? WHERE tenant_id = ?', [plan, tenant.tenant_id]);

    // Record subscription payment
    try {
      const pmKey = process.env.PAYMONGO_SECRET_KEY || '';
      await query(
        'INSERT INTO SUBSCRIPTION_PAYMENT (tenant_id, plan, amount, currency, status, is_test_mode) VALUES (?, ?, ?, ?, ?, ?)',
        [tenant.tenant_id, plan, PLAN_PRICES[plan].amount / 100, 'PHP', 'paid', pmKey.startsWith('sk_test') ? 1 : 0]
      );
    } catch(_) { /* table might not exist yet */ }

    logAudit({ actor: 'system', actor_type: 'system', action: 'UPGRADE_COMPLETED', target: `${tenant.plan} → ${plan}`, tenant_slug: slug });

    // Redirect to admin with success message
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Upgrade Successful</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
      <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;}
      .card{background:#fff;border-radius:20px;padding:48px;text-align:center;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.08);}
      .ico{width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
      .material-symbols-outlined{font-variation-settings:'FILL' 1;font-size:32px;color:#10b981;}
      h1{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:8px;}p{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;}
      a{display:inline-flex;align-items:center;gap:6px;padding:12px 28px;background:#0f2235;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;}
      </style></head><body><div class="card">
      <div class="ico"><span class="material-symbols-outlined">check_circle</span></div>
      <h1>Upgrade Successful!</h1>
      <p>Your plan has been upgraded to <strong style="text-transform:uppercase;color:#0f172a;">${plan}</strong>. Enjoy your new features!</p>
      <a href="/${slug}/admin"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>Back to Dashboard</a>
      </div></body></html>`);
  } catch(err) {
    console.error('[GET /admin/upgrade/success]', err);
    res.redirect(`/${slug}/admin`);
  }
});

module.exports = router;

