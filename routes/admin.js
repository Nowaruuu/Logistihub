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

  const [tenants] = await query("SELECT * FROM TENANT WHERE slug = ? AND status IN ('active', 'suspended') LIMIT 1", [slug]);
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

  const userAgent = req.headers['user-agent'] || 'Unknown';
  const realIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unknown';
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  logAudit({ actor: email, actor_type: 'admin', action: 'LOGIN', target: 'Admin Dashboard', tenant_slug: slug, ip_address: realIp, metadata: { user_agent: userAgent, ip: realIp, session_id: sessionId } });

  res.json({ ok: true, slug, name: staff.name, session_id: sessionId });
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

router.get('/:slug/api/admin/me', requireAdmin, requireSlugMatch, async (req, res) => {
  // Enrich admin data with profile_picture from STAFF table
  let adminData = { ...req.admin };
  try {
    const [rows] = await query(
      'SELECT profile_picture FROM STAFF WHERE username = ? AND tenant_id = ? LIMIT 1',
      [req.admin.email, req.tenantId]
    );
    if (rows.length && rows[0].profile_picture) {
      adminData.profile_picture = rows[0].profile_picture;
    }
  } catch (_) { /* column may not exist yet */ }
  res.json({ admin: adminData, tenant: req.tenant });
});

// Recent login sessions (for notification panel device detection)
router.get('/:slug/api/admin/recent-logins', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT actor, ip_address, metadata, created_at
       FROM AUDIT_LOG
       WHERE tenant_slug = ? AND action = 'LOGIN' AND actor_type = 'admin'
       ORDER BY created_at DESC LIMIT 10`,
      [req.params.slug]
    );
    const logins = rows.map(r => {
      let meta = {};
      try { meta = r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {}; } catch(_) {}
      return {
        actor: r.actor,
        ip: r.ip_address || meta.ip || 'Unknown',
        user_agent: meta.user_agent || 'Unknown',
        session_id: meta.session_id || null,
        created_at: r.created_at
      };
    });
    res.json({ ok: true, logins });
  } catch (err) {
    console.error('[GET /admin/recent-logins]', err);
    res.status(500).json({ error: 'Failed to load login history.' });
  }
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
// SALES REPORT
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/sales-report', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  try {
    // Total collected (paid)
    const [[{ revenue_paid }]] = await query(
      "SELECT COALESCE(SUM(total_amount),0) AS revenue_paid FROM payment WHERE tenant_id = ? AND status = 'Paid'",
      [tid]
    );
    // Total billed (all statuses)
    const [[{ revenue_total }]] = await query(
      "SELECT COALESCE(SUM(total_amount),0) AS revenue_total FROM payment WHERE tenant_id = ?",
      [tid]
    );
    // Pending amount
    const [[{ pending_amount }]] = await query(
      "SELECT COALESCE(SUM(total_amount),0) AS pending_amount FROM payment WHERE tenant_id = ? AND status IN ('Pending','AwaitingAdmin')",
      [tid]
    );
    const [[{ pending_count }]] = await query(
      "SELECT COUNT(*) AS pending_count FROM payment WHERE tenant_id = ? AND status IN ('Pending','AwaitingAdmin')",
      [tid]
    );
    // Total shipment count
    const [[{ shipment_count }]] = await query(
      "SELECT COUNT(*) AS shipment_count FROM shipment WHERE tenant_id = ?",
      [tid]
    );
    // Revenue grouped by period (daily/weekly/monthly/yearly)
    const period = req.query.period || 'monthly';
    let chartSql, chartParams;
    const tz = '+08:00'; // Philippine Time
    // Use COALESCE: paid_at → billing_date → shipment created_at (NOT NOW(), which caused old pending
    // payments to always appear as today on the graph)
    const dateCol = `COALESCE(paid_at, billing_date, (SELECT s2.created_at FROM shipment s2 WHERE s2.delivery_number = payment.delivery_number LIMIT 1))`;
    if (period === 'daily') {
      chartSql = `SELECT HOUR(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) AS hr,
                         SUM(total_amount) AS total,
                         SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) AS paid_total,
                         SUM(CASE WHEN status IN ('Pending','AwaitingAdmin') THEN total_amount ELSE 0 END) AS pending_total,
                         COUNT(*) AS count
                  FROM payment WHERE tenant_id = ?
                    AND DATE(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) = DATE(CONVERT_TZ(NOW(), '+00:00', '${tz}'))
                  GROUP BY hr ORDER BY hr ASC`;
      chartParams = [tid];
    } else if (period === 'weekly') {
      chartSql = `SELECT DAY(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) AS day_num,
                         SUM(total_amount) AS total,
                         SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) AS paid_total,
                         SUM(CASE WHEN status IN ('Pending','AwaitingAdmin') THEN total_amount ELSE 0 END) AS pending_total,
                         COUNT(*) AS count
                  FROM payment WHERE tenant_id = ?
                    AND YEAR(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '${tz}'))
                    AND MONTH(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '${tz}'))
                    AND FLOOR((DAY(CONVERT_TZ(${dateCol}, '+00:00', '${tz}'))-1)/7) = FLOOR((DAY(CONVERT_TZ(NOW(), '+00:00', '${tz}'))-1)/7)
                  GROUP BY day_num ORDER BY day_num ASC`;
      chartParams = [tid];
    } else if (period === 'yearly') {
      chartSql = `SELECT YEAR(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) AS yr,
                         SUM(total_amount) AS total,
                         SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) AS paid_total,
                         SUM(CASE WHEN status IN ('Pending','AwaitingAdmin') THEN total_amount ELSE 0 END) AS pending_total,
                         COUNT(*) AS count
                  FROM payment WHERE tenant_id = ? AND ${dateCol} >= DATE_SUB(NOW(), INTERVAL 5 YEAR)
                  GROUP BY yr ORDER BY yr ASC`;
      chartParams = [tid];
    } else {
      chartSql = `SELECT MONTH(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) AS mo,
                         SUM(total_amount) AS total,
                         SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) AS paid_total,
                         SUM(CASE WHEN status IN ('Pending','AwaitingAdmin') THEN total_amount ELSE 0 END) AS pending_total,
                         COUNT(*) AS count
                  FROM payment WHERE tenant_id = ?
                    AND YEAR(CONVERT_TZ(${dateCol}, '+00:00', '${tz}')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '${tz}'))
                  GROUP BY mo ORDER BY mo ASC`;
      chartParams = [tid];
    }
    const [chartData] = await query(chartSql, chartParams);
    // Revenue by shipment type (all payments)
    const [byType] = await query(
      `SELECT COALESCE(s.item_type_flag, 'OTHER') AS type, COALESCE(SUM(p.total_amount),0) AS total, COUNT(*) AS count
       FROM payment p
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       WHERE p.tenant_id = ?
       GROUP BY type ORDER BY total DESC`,
      [tid]
    );
    // Top clients by revenue (all payments)
    const [topClients] = await query(
      `SELECT COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Walk-in') AS client_name,
              SUM(p.total_amount) AS total, COUNT(*) AS orders,
              SUM(CASE WHEN p.status = 'Paid' THEN p.total_amount ELSE 0 END) AS paid
       FROM payment p
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id
       WHERE p.tenant_id = ?
       GROUP BY client_name ORDER BY total DESC LIMIT 10`,
      [tid]
    );
    // Recent transactions (ALL - not just paid)
    const [recentTx] = await query(
      `SELECT p.invoice_id, p.delivery_number, p.total_amount, p.payment_method, 
              p.paid_at AS tx_date, p.status,
              COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Walk-in') AS client_name,
              s.total_fee
       FROM payment p
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id
       WHERE p.tenant_id = ?
       ORDER BY p.invoice_id DESC LIMIT 20`,
      [tid]
    );

    res.json({
      revenue_paid: Number(revenue_paid),
      revenue_total: Number(revenue_total),
      pending_amount: Number(pending_amount),
      pending_count: Number(pending_count),
      shipment_count: Number(shipment_count),
      chart_data: chartData,
      by_type: byType,
      top_clients: topClients,
      recent_transactions: recentTx
    });
  } catch (err) {
    console.error('[GET /admin/sales-report]', err);
    res.status(500).json({ error: err.message || 'Failed to load sales report.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/payments', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  try {
    // Auto-cleanup: delete bogus ₱50 test payments from failed PayMongo checkouts
    // Check BOTH payment.total_amount AND shipment.total_fee since display uses whichever is available
    await query(
      `DELETE p FROM payment p
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       WHERE p.tenant_id = ? AND p.status = 'Paid' AND p.payment_type IN ('full','deposit')
         AND (p.total_amount <= 50 OR (s.total_fee IS NOT NULL AND s.total_fee <= 50))`,
      [tid]
    ).catch(() => {});

    // Auto-mark overdue: any pending balance payments past their due_date become 'Overdue'
    await query(
      `UPDATE payment SET status = 'Overdue' WHERE tenant_id = ? AND status = 'Pending' AND payment_type = 'balance' AND due_date IS NOT NULL AND due_date < NOW()`,
      [tid]
    ).catch(() => {});

    // Show all payment records — dedup only 'full' type per delivery (multiple Pay Now clicks)
    // Split payments (deposit + balance) are shown as separate rows
    const [rows] = await query(
      `SELECT p.*,
              COALESCE(u.first_name, '') AS customer_first,
              COALESCE(u.last_name, '')  AS customer_last,
              u.email                    AS customer_email,
              s.receiver_name, s.total_fee, s.distance_km
       FROM payment p
       INNER JOIN (
         SELECT delivery_number, payment_type, MAX(invoice_id) AS latest_id
         FROM payment WHERE tenant_id = ?
         GROUP BY delivery_number, payment_type
       ) latest ON latest.latest_id = p.invoice_id
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id
       WHERE p.tenant_id = ?
       ORDER BY p.invoice_id DESC
       LIMIT 200`,
      [tid, tid]
    );

    // Safety net: filter out any remaining ₱50 payments that the DELETE didn't catch
    const filteredRows = rows.filter(function(p) {
      var displayAmt = (p.total_fee && parseFloat(p.total_fee) > 0) ? parseFloat(p.total_fee) : parseFloat(p.total_amount || 0);
      if (p.payment_type === 'deposit' || p.payment_type === 'balance') displayAmt = parseFloat(p.total_amount || 0);
      return displayAmt > 50;
    });

    // Enrich payments missing method/date from PayMongo API
    const pmKey = process.env.PAYMONGO_SECRET_KEY;
    if (pmKey) {
      for (const p of filteredRows) {
        if (p.paymongo_checkout_id && (!p.payment_method || !p.paid_at)) {
          try {
            const pmRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${p.paymongo_checkout_id}`, {
              headers: { 'Authorization': 'Basic ' + Buffer.from(pmKey + ':').toString('base64') }
            });
            const pmData = await pmRes.json();
            const attrs = pmData?.data?.attributes || {};
            const pmPayments = attrs.payments || [];
            const paidEntry = pmPayments.find(pp => pp?.attributes?.status === 'paid');
            if (paidEntry) {
              const method = paidEntry.attributes?.source?.type || '';
              const pmId = paidEntry.id || null;
              const paidAt = paidEntry.attributes?.paid_at ? new Date(paidEntry.attributes.paid_at * 1000) : null;
              // Cache in DB for next time
              const updates = [];
              const vals = [];
              if (method && !p.payment_method) { updates.push('payment_method = ?'); vals.push(method); p.payment_method = method; }
              if (pmId && !p.paymongo_payment_id) { updates.push('paymongo_payment_id = ?'); vals.push(pmId); p.paymongo_payment_id = pmId; }
              if (paidAt && !p.paid_at) { updates.push('paid_at = ?'); vals.push(paidAt); p.paid_at = paidAt; }
              if (!p.status || p.status === 'Pending') { updates.push("status = 'Paid'"); p.status = 'Paid'; }
              if (updates.length) {
                vals.push(p.invoice_id);
                await query(`UPDATE payment SET ${updates.join(', ')} WHERE invoice_id = ?`, vals).catch(() => {});
              }
            }
          } catch (_) { /* PayMongo lookup failed — skip silently */ }
        }
      }
    }

    const [[{ total_revenue }]] = await query(
      "SELECT COALESCE(SUM(total_amount),0) AS total_revenue FROM payment WHERE tenant_id = ? AND status = 'Paid'",
      [tid]
    );
    const [[{ pending_count }]] = await query(
      "SELECT COUNT(DISTINCT delivery_number) AS pending_count FROM payment WHERE tenant_id = ? AND status = 'Pending'",
      [tid]
    );
    // Load tenant pricing config for expense calculation
    const [[tenantRow]] = await query('SELECT pricing_config FROM TENANT WHERE tenant_id = ?', [tid]);
    let tenantPricing = null;
    if (tenantRow && tenantRow.pricing_config) {
      try { tenantPricing = typeof tenantRow.pricing_config === 'string' ? JSON.parse(tenantRow.pricing_config) : tenantRow.pricing_config; } catch(_) {}
    }
    const FUEL_RATES = (tenantPricing && tenantPricing.fuel_rates) || { motorcycle: 2.20, sedan: 4.70, van: 6.11, truck: 11.00, flatbed: 15.71 };
    const DRIVER_LABOR_PER_KM = (tenantPricing && tenantPricing.driver_labor_per_km) || 15;

    const [paidShipments] = await query(
      `SELECT s.distance_km, LOWER(COALESCE(s.vehicle_type, 'sedan')) AS vtype
       FROM payment p
       LEFT JOIN shipment s ON s.delivery_number = p.delivery_number AND s.tenant_id = p.tenant_id
       WHERE p.tenant_id = ? AND p.status = 'Paid' AND s.distance_km IS NOT NULL`,
      [tid]
    );
    let total_distance = 0;
    let total_expenses = 0;
    for (const sh of paidShipments) {
      const km = parseFloat(sh.distance_km) || 0;
      const fuelRate = FUEL_RATES[sh.vtype] || 4.70;
      total_distance += km;
      total_expenses += km * (fuelRate + DRIVER_LABOR_PER_KM);
    }
    total_expenses = Math.round(total_expenses * 100) / 100;
    res.json({ payments: filteredRows, total_revenue, pending_count, total_distance, total_expenses });
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

// Admin deletes a stale/failed payment record (only Pending or Failed)
router.delete('/:slug/api/admin/payments/:id', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const { id } = req.params;
  try {
    const [result] = await query(
      "DELETE FROM payment WHERE invoice_id = ? AND tenant_id = ? AND status IN ('Pending', 'Failed')",
      [id, tid]
    );
    if (result.affectedRows === 0) return res.status(400).json({ error: 'Cannot delete — only Pending/Failed payments can be removed.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /admin/payments]', err);
    res.status(500).json({ error: err.message || 'Failed to delete payment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICING CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PRICING = {
  base_fee: 50,
  driver_labor_per_km: 15,
  express_multiplier: 1.8,
  safety_fee: 150,
  fuel_rates: { motorcycle: 2.20, sedan: 4.70, van: 6.11, truck: 11.00, flatbed: 15.71 },
  weight_tiers: [
    { max_kg: 20, rate: 2.00 },
    { max_kg: 100, rate: 3.00 },
    { max_kg: 500, rate: 2.00 },
    { max_kg: null, rate: 1.50 }
  ],
  category_surcharges: { PACKAGE: 0, FOOD: 50, DOC: 0, BULK: 300, VEHICLE: 800 },
  split_payment_enabled: false
};

router.get('/:slug/api/admin/pricing', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const [[row]] = await query('SELECT pricing_config FROM TENANT WHERE tenant_id = ?', [req.tenantId]);
    let config = DEFAULT_PRICING;
    if (row && row.pricing_config) {
      try { config = typeof row.pricing_config === 'string' ? JSON.parse(row.pricing_config) : row.pricing_config; } catch(_) {}
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:slug/api/admin/pricing', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const config = req.body;
    await query('UPDATE TENANT SET pricing_config = ? WHERE tenant_id = ?', [JSON.stringify(config), req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
           h.name AS helper_name, r.route_name,
           (SELECT MAX(sh.created_at) FROM SHIPMENT_HISTORY sh WHERE sh.delivery_number = s.delivery_number AND sh.status = 'Delivered') AS delivered_at
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

// DELETE a shipment (admin only — removes shipment + related records)
router.delete('/:slug/api/admin/shipments/:delivery_number', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const dn = req.params.delivery_number;
  try {
    // Delete related records first
    await query('DELETE FROM SHIPMENT_HISTORY WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]).catch(() => {});
    await query('DELETE FROM payment WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]).catch(() => {});
    await query('DELETE FROM proof_of_delivery WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]).catch(() => {});
    await query('DELETE FROM decline_reasons WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]).catch(() => {});
    await query('DELETE FROM sub_package WHERE delivery_number = ?', [dn]).catch(() => {});
    await query('DELETE FROM sub_vehicle WHERE delivery_number = ?', [dn]).catch(() => {});
    await query('DELETE FROM sub_food WHERE delivery_number = ?', [dn]).catch(() => {});
    await query('DELETE FROM sub_document WHERE delivery_number = ?', [dn]).catch(() => {});
    await query('DELETE FROM sub_bulk WHERE delivery_number = ?', [dn]).catch(() => {});
    // Delete the shipment itself
    await query('DELETE FROM shipment WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);
  res.json({ ok: true, message: `Shipment ${dn} deleted.` });
  } catch (err) {
    console.error('[DELETE /admin/shipments]', err);
    res.status(500).json({ error: err.message || 'Failed to delete shipment.' });
  }
});

// PUT assign/reassign driver + vehicle to a shipment (with queue support)
router.put('/:slug/api/admin/shipments/:delivery_number/assign', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const dn = req.params.delivery_number;
  const { assigned_driver_id, assigned_vehicle_plate } = req.body;
  try {
    if (!assigned_driver_id) {
      // Unassign: clear driver and set back to Pending
      await query(
        `UPDATE shipment SET assigned_driver_id = NULL, assigned_vehicle_plate = ?, status = 'Pending' WHERE delivery_number = ? AND tenant_id = ?`,
        [assigned_vehicle_plate || null, dn, tid]
      );
      return res.json({ ok: true, queued: false, message: 'Driver unassigned.' });
    }


    // #7 — Batch delivery support: allow up to MAX_ACTIVE_PER_VEHICLE active shipments per vehicle
    // This supports multi-stop deliveries (same route, different drop-off locations)
    const MAX_ACTIVE_PER_VEHICLE = 5;
    if (assigned_vehicle_plate) {
      const [vehicleActiveJobs] = await query(
        `SELECT delivery_number FROM shipment WHERE assigned_vehicle_plate = ? AND tenant_id = ? AND status IN ('In-Transit', 'Out for Delivery') AND delivery_number != ?`,
        [assigned_vehicle_plate, tid, dn]
      );
      if (vehicleActiveJobs.length >= MAX_ACTIVE_PER_VEHICLE) {
        return res.status(400).json({
          error: `Vehicle ${assigned_vehicle_plate} already has ${vehicleActiveJobs.length} active deliveries (max ${MAX_ACTIVE_PER_VEHICLE}). Complete some deliveries before assigning more.`
        });
      }
    }

    // Batch delivery: a driver can handle up to MAX concurrent active deliveries
    // and up to MAX_QUEUED waiting in the queue
    const MAX_ACTIVE_PER_DRIVER = 5;
    const MAX_QUEUED_PER_DRIVER = 3;

    const [driverActiveJobs] = await query(
      `SELECT delivery_number FROM shipment WHERE assigned_driver_id = ? AND tenant_id = ? AND status IN ('In-Transit', 'Out for Delivery')`,
      [assigned_driver_id, tid]
    );
    const driverAtCapacity = driverActiveJobs.length >= MAX_ACTIVE_PER_DRIVER;

    if (driverAtCapacity) {
      // Driver is at max active — check if we can queue it
      const [queuedJobs] = await query(
        `SELECT delivery_number FROM shipment WHERE assigned_driver_id = ? AND tenant_id = ? AND status = 'Queued'`,
        [assigned_driver_id, tid]
      );
      if (queuedJobs.length >= MAX_QUEUED_PER_DRIVER) {
        return res.status(400).json({ error: `This driver already has ${driverActiveJobs.length} active and ${queuedJobs.length} queued deliveries. Complete some before assigning more.` });
      }
    }

    const newStatus = driverAtCapacity ? 'Queued' : 'In-Transit';

    // ── WEIGHT CAPACITY CHECK ─────────────────────────────────────────────────
    if (assigned_vehicle_plate) {
      const VEHICLE_WEIGHT_LIMITS_KG = {
        motorcycle: 50, sedan: 200, suv: 300, pickup: 1000,
        van: 1000, truck: 5000, trailer: 15000
      };

      // Get shipment weight
      const [shipWeight] = await query(
        'SELECT weight, item_type_flag FROM shipment WHERE delivery_number = ? AND tenant_id = ? LIMIT 1',
        [dn, tid]
      );
      const packageWeightKg = parseFloat(shipWeight[0]?.weight) || 0;

      if (packageWeightKg > 0) {
        // Get vehicle registered capacity
        const [vCap] = await query(
          'SELECT capacity_tons, vehicle_type FROM vehicle WHERE plate_number = ? AND tenant_id = ? LIMIT 1',
          [assigned_vehicle_plate, tid]
        );
        let vehicleCapacityKg = null;
        if (vCap.length && vCap[0].capacity_tons) {
          vehicleCapacityKg = parseFloat(vCap[0].capacity_tons) * 1000;
        } else if (vCap.length && vCap[0].vehicle_type) {
          vehicleCapacityKg = VEHICLE_WEIGHT_LIMITS_KG[(vCap[0].vehicle_type||'').toLowerCase()] || 200;
        } else {
          vehicleCapacityKg = 200; // safe default
        }

        // Sum current active load on this vehicle (excluding current shipment)
        const [loadRows] = await query(
          `SELECT COALESCE(SUM(COALESCE(weight, 0)), 0) AS total_weight
           FROM shipment
           WHERE assigned_vehicle_plate = ? AND tenant_id = ? AND delivery_number != ?
             AND status IN ('In-Transit', 'Out for Delivery', 'Queued')`,
          [assigned_vehicle_plate, tid, dn]
        );
        const currentWeightKg = parseFloat(loadRows[0]?.total_weight) || 0;
        const newTotalKg = currentWeightKg + packageWeightKg;

        if (newTotalKg > vehicleCapacityKg) {
          const remaining = Math.max(0, vehicleCapacityKg - currentWeightKg);
          const vType = vCap[0]?.vehicle_type || 'vehicle';
          return res.status(400).json({
            error: `Weight limit exceeded for ${assigned_vehicle_plate} (${vType}). ` +
                   `Max capacity: ${vehicleCapacityKg} kg. ` +
                   `Current load: ${currentWeightKg} kg. ` +
                   `This package: ${packageWeightKg} kg. ` +
                   `Remaining: ${remaining} kg. ` +
                   `Use a vehicle with higher capacity or complete active deliveries first.`
          });
        }
      }
    }

    await query(
      `UPDATE shipment SET assigned_driver_id = ?, assigned_vehicle_plate = ?, status = ? WHERE delivery_number = ? AND tenant_id = ?`,
      [assigned_driver_id, assigned_vehicle_plate || null, newStatus, dn, tid]
    );

    // Get driver name + user_id for notification
    const [driverInfo] = await query(
      'SELECT name, user_id FROM STAFF WHERE staff_id = ? LIMIT 1',
      [assigned_driver_id]
    );
    const driverName = driverInfo[0]?.name || 'Driver';
    const driverUserId = driverInfo[0]?.user_id || null;

    // Log to shipment history
    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name) VALUES (?, ?, ?, '', ?, ?)`,
      [dn, tid, newStatus,
       driverAtCapacity
         ? `Shipment queued for driver ${driverName}. Will start after a current delivery is completed.`
         : `Driver ${driverName} assigned by staff and pickup started.`,
       req.admin?.name || 'Manager']
    );

    // 🔔 Notify the driver that they've been assigned by staff
    // (driver may not have been watching available jobs — this ensures they know)
    try {
      const assignedBy = req.admin?.name || 'The system';
      const notifTitle = driverAtCapacity ? '📦 Delivery Queued for You' : '📦 You\'ve Been Assigned a Delivery';
      const notifMsg = driverAtCapacity
        ? `${assignedBy} has queued delivery ${dn} for you. It will start automatically when you complete your current delivery.`
        : `${assignedBy} has assigned delivery ${dn} to you. Please check your Active tab and head to the pickup location.`;

      await query(
        `INSERT INTO NOTIFICATION (user_id, user_type, tenant_id, title, message, type, related_tracking)
         VALUES (?, 'staff', ?, ?, ?, 'Shipments', ?)`,
        [assigned_driver_id, tid, notifTitle, notifMsg, dn]
      );

      // Also notify via app_user record if driver has a linked user account
      if (driverUserId) {
        await query(
          `INSERT INTO NOTIFICATION (user_id, user_type, tenant_id, title, message, type, related_tracking)
           VALUES (?, 'app_user', ?, ?, ?, 'Shipments', ?)`,
          [driverUserId, tid, notifTitle, notifMsg, dn]
        );
      }
    } catch (notifErr) {
      console.warn('[assign] Notification insert failed (non-critical):', notifErr.message);
    }

    res.json({
      ok: true,
      queued: driverAtCapacity,
      message: driverAtCapacity
        ? `Driver is at max capacity (${driverActiveJobs.length} active). Shipment queued — ${driverName} will start after completing a delivery.`
        : `Driver ${driverName} assigned. Shipment is now In-Transit. (${driverActiveJobs.length + 1} active deliveries)`
    });
  } catch (err) {
    console.error('[PUT /admin/shipments/assign]', err);
    res.status(500).json({ error: err.message || 'Failed to assign driver.' });
  }
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
  const tid = req.tenantId;
  // Join with shipments + payments to compute driver earnings
  const [rows] = await query(
    `SELECT s.*, s.staff_id AS id,
       COALESCE(e.total_earnings, 0) AS total_earnings,
       COALESCE(e.delivered_count, 0) AS delivered_count
     FROM STAFF s
     LEFT JOIN (
       SELECT sh.assigned_driver_id,
              SUM(COALESCE(p.total_amount, sh.total_fee, 0)) AS total_earnings,
              COUNT(*) AS delivered_count
       FROM shipment sh
       LEFT JOIN payment p ON p.delivery_number = sh.delivery_number AND p.tenant_id = sh.tenant_id AND p.status = 'Paid'
       WHERE sh.tenant_id = ? AND sh.status = 'Delivered' AND sh.assigned_driver_id IS NOT NULL
       GROUP BY sh.assigned_driver_id
     ) e ON e.assigned_driver_id = s.staff_id
     WHERE s.tenant_id = ?
     ORDER BY s.name ASC`,
    [tid, tid]
  );
  
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

// ── License Verification (Admin approves/rejects driver license) ──────────
router.put('/:slug/api/admin/staff/:id/license', requireAdmin, requireSlugMatch, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'verify' or 'reject'
  const tid = req.tenantId;

  if (!['verify', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "verify" or "reject".' });
  }

  try {
    const [rows] = await query('SELECT name, role, license_status FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [id, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found.' });

    const newStatus = action === 'verify' ? 'verified' : 'not_uploaded';
    await query('UPDATE STAFF SET license_status = ? WHERE staff_id = ? AND tenant_id = ?', [newStatus, id, tid]);

    logAudit({
      actor: req.admin.email, actor_type: 'admin',
      action: action === 'verify' ? 'VERIFY_LICENSE' : 'REJECT_LICENSE',
      target: `${rows[0].name} (${rows[0].role})`,
      tenant_slug: req.params.slug, ip_address: req.ip
    });

    res.json({ ok: true, license_status: newStatus, message: action === 'verify' ? 'License verified.' : 'License rejected.' });
  } catch (err) {
    console.error('[PUT /admin/staff/:id/license]', err);
    res.status(500).json({ error: err.message || 'Failed to update license status.' });
  }
});

router.get('/:slug/api/admin/vehicles', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const [rows] = await query(
    `SELECT v.*, st.name AS assigned_driver_name
     FROM vehicle v
     LEFT JOIN STAFF st ON st.vehicle_plate = v.plate_number AND st.tenant_id = v.tenant_id
     WHERE v.tenant_id = ? ORDER BY v.plate_number ASC`,
    [tid]
  );
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
// PROOF OF DELIVERY
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:slug/api/admin/pods', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT pod.*, s.status AS shipment_status, s.pickup_photo_url
       FROM proof_of_delivery pod
       LEFT JOIN shipment s ON s.delivery_number = pod.delivery_number AND s.tenant_id = pod.tenant_id
       WHERE pod.tenant_id = ?
       ORDER BY pod.pod_id DESC
       LIMIT 200`,
      [req.tenantId]
    );
    res.json({ pods: rows });
  } catch (err) {
    console.error('[GET /admin/pods]', err);
    res.status(500).json({ error: err.message || 'Failed to load PODs.' });
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
    // Return only lightweight fields (colors, text). Images loaded separately.
    const [tenants] = await query(
      `SELECT company_name, slug, brand_color, bg_app_color, bg_sidebar_color, bg_hero_color, bg_page_color,
              CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 ELSE 0 END AS has_logo,
              CASE WHEN background_url IS NOT NULL AND background_url != '' THEN 1 ELSE 0 END AS has_background
       FROM TENANT WHERE tenant_id = ?`, [tid]);
    const [staff] = await query("SELECT name, username AS email FROM STAFF WHERE tenant_id = ? AND role = 'Admin' LIMIT 1", [tid]);
    res.json({ ...tenants[0], ...staff[0] });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:slug/api/admin/settings/images — returns large image blobs separately (lazy load)
router.get('/:slug/api/admin/settings/images', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  try {
    const [tenants] = await query('SELECT logo_url, background_url FROM TENANT WHERE tenant_id = ?', [tid]);
    res.json(tenants[0] || {});
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
router.put('/:slug/api/admin/settings', requireAdmin, requireSlugMatch, async (req, res) => {
  const { company_name, brand_color, bg_app_color, bg_sidebar_color, logo_url, background_url, bg_hero_color, bg_page_color, new_password } = req.body;
  const tid = req.tenantId;

  try {
    // Build single UPDATE query with all changed fields
    const sets = [];
    const vals = [];
    const addField = (col, val) => {
      if (val === undefined) return;
      sets.push(`${col} = ?`);
      vals.push(val || null);
    };

    if (company_name) addField('company_name', company_name);
    addField('brand_color', brand_color);
    addField('bg_app_color', bg_app_color);
    addField('bg_sidebar_color', bg_sidebar_color);
    addField('logo_url', logo_url);
    addField('background_url', background_url);
    addField('bg_hero_color', bg_hero_color);
    addField('bg_page_color', bg_page_color);

    // Single DB call for all tenant fields
    if (sets.length > 0) {
      vals.push(tid);
      await query(`UPDATE TENANT SET ${sets.join(', ')} WHERE tenant_id = ?`, vals);
    }

    // Password update (separate table)
    if (new_password && new_password.length >= 8) {
      const hash = await bcrypt.hash(new_password, 10);
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
    const [users] = await query('SELECT user_id, CONCAT(first_name, \' \', last_name) AS full_name, email, contact_email, role, status, created_at, profile_picture FROM APP_USER WHERE tenant_id = ? ORDER BY created_at DESC', [req.tenant.tenant_id]);
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
  const { name, email, role, phone, license_expiry } = req.body;  // email = contact email address
  const tid  = req.tenantId;
  const slug = req.params.slug;

  const ALLOWED_ROLES = ['Driver', 'Document Controller', 'Manager'];
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required.' });
  if (!phone) return res.status(400).json({ error: 'phone is required.' });
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });

  // Manager cannot promote/create Manager or Admin
  if (req.admin.role === 'Manager' && (role === 'Manager' || role === 'Admin' || role === 'admin')) {
    return res.status(403).json({ error: 'Managers are not allowed to create Manager or Admin accounts.' });
  }

  // Derive login username: prefix from email + @slug.com
  // e.g. bollinrah@yahoo.com  →  bollinrah@amongiz.com  (if slug = 'amongiz')
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const loginUsername = emailPrefix + '@' + slug + '.com';

  try {
    // ── Enforce plan-based driver limit ──
    if (role === 'Driver') {
      const [tenantPlan] = await query('SELECT plan, max_vehicles FROM TENANT WHERE tenant_id = ?', [tid]);
      const DRIVER_LIMITS = { startup: 20, enterprise: 50, global: null };
      const planKey = (tenantPlan[0]?.plan || 'startup').toLowerCase();
      const maxDrivers = DRIVER_LIMITS[planKey] !== undefined ? DRIVER_LIMITS[planKey] : DRIVER_LIMITS.startup;
      if (maxDrivers) {
        const [driverCount] = await query("SELECT COUNT(*) AS cnt FROM STAFF WHERE tenant_id = ? AND role = 'Driver'", [tid]);
        if (driverCount[0].cnt >= maxDrivers) {
          const planNames = { startup: 'Padala', enterprise: 'Negosyo', global: 'Korporasyon' };
          return res.status(403).json({ error: `${planNames[planKey] || planKey} plan is limited to ${maxDrivers} drivers. Upgrade your plan for more.` });
        }
      }
    }

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
    // Save phone number (safe)
    if (phone) {
      try {
        await query('UPDATE STAFF SET phone = ? WHERE username = ? AND tenant_id = ?', [phone, loginUsername, tid]);
      } catch(_) { /* column may not exist — silently skip */ }
    }

    // Respond immediately — email is fire-and-forget
    res.status(201).json({ ok: true, message: 'Staff created. Welcome email sent to ' + email + '.', username: loginUsername });

    // Send email AFTER responding — to their email address, showing loginUsername as their credentials
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
    const { plate_number, type, capacity_tons, status, ownership_doc, model, ownership_type, image_url, image_base64 } = req.body;
  const tid = req.tenantId;

  if (!plate_number || !type) return res.status(400).json({ error: 'plate_number and type are required.' });
  if (!ownership_doc) return res.status(400).json({ error: 'Certificate of Registration / Official Receipt (CR/OR) document is required.' });

  try {
    // Use SELECT 1 to avoid unknown column names
    const [existing] = await query('SELECT 1 FROM vehicle WHERE plate_number = ? AND tenant_id = ?', [plate_number.toUpperCase(), tid]);
    if (existing.length) return res.status(409).json({ error: 'A vehicle with that plate number already exists.' });

    // ── Plan vehicle limit check ──────────────────────────────────────────
    const [[tenant]] = await query('SELECT plan, max_vehicles FROM TENANT WHERE tenant_id = ?', [tid]);
    const PLAN_LIMITS = { startup: 20, enterprise: 50, global: null }; // Padala:20, Negosyo:50, Korporasyon:unlimited
    const planKey = (tenant?.plan || 'startup').toLowerCase();
    const limitVal = PLAN_LIMITS.hasOwnProperty(planKey) ? PLAN_LIMITS[planKey] : PLAN_LIMITS.startup;
    const maxVehicles = tenant?.max_vehicles || limitVal;

    if (maxVehicles) {
      const [[vc]] = await query('SELECT COUNT(*) AS n FROM vehicle WHERE tenant_id = ?', [tid]);
      if (vc.n >= maxVehicles) {
        const planNames = { startup: 'Padala', enterprise: 'Negosyo', global: 'Korporasyon' };
        const currentPlanName = planNames[planKey] || planKey;
        return res.status(402).json({
          error: `${currentPlanName} plan is limited to ${maxVehicles} vehicles. Upgrade your plan for more.`,
          limit: maxVehicles,
          current: vc.n
        });
      }
    }

    // Accept either image_url or image_base64 (base64 data URI from upload)
    const finalImageUrl = image_base64 || image_url || null;

    await query(
      `INSERT INTO vehicle (tenant_id, plate_number, vehicle_type, model, capacity_tons, status, ownership_doc, ownership_type, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tid, plate_number.toUpperCase(), type, model || null, capacity_tons || null, status || 'Available', ownership_doc || null, ownership_type || 'company', finalImageUrl]
    );

    res.status(201).json({ ok: true, message: 'Vehicle added successfully.' });
  } catch(err) {
    console.error('[POST /admin/vehicles]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Failed to add vehicle.' });
  }
});

router.put('/:slug/api/admin/vehicles/:plate', requireAdmin, requireSlugMatch, async (req, res) => {
  const { type, capacity_tons, status, model, ownership_type, image_base64 } = req.body;
  const tid = req.tenantId;
  const plate = req.params.plate;

  if (!type) return res.status(400).json({ error: 'Type is required.' });

  try {
    let sql = `UPDATE vehicle SET vehicle_type = ?, model = ?, capacity_tons = ?, status = ?, ownership_type = ?`;
    let params = [type, model || null, capacity_tons || null, status || 'Available', ownership_type || 'company'];

    if (image_base64) {
      sql += `, image_url = ?`;
      params.push(image_base64);
    }

    sql += ` WHERE plate_number = ? AND tenant_id = ?`;
    params.push(plate, tid);

    await query(sql, params);
    res.json({ ok: true, message: 'Vehicle updated successfully.' });
  } catch(err) {
    console.error('[PUT /admin/vehicles]', err);
    res.status(500).json({ error: err.message || 'Failed to update vehicle.' });
  }
});

// ── Vehicle Requests (admin view) ─────────────────────────────────────────────

// GET all vehicle requests for this tenant
router.get('/:slug/api/admin/vehicle-requests', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT vr.*,
              v.vehicle_type, v.model, v.capacity_tons,
              s.name AS driver_name, s.email AS driver_email,
              (SELECT COUNT(*) FROM VEHICLE_REQUEST r2
               WHERE r2.driver_id = vr.driver_id AND r2.tenant_id = vr.tenant_id AND r2.status = 'refused') AS refusal_count
       FROM VEHICLE_REQUEST vr
       JOIN vehicle v ON v.plate_number = vr.vehicle_plate AND v.tenant_id = vr.tenant_id
       JOIN STAFF s ON s.staff_id = vr.driver_id
       WHERE vr.tenant_id = ?
       ORDER BY vr.created_at DESC LIMIT 50`,
      [req.tenantId]
    );
    res.json(rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT approve a driver_request
router.put('/:slug/api/admin/vehicle-requests/:id/approve', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  try {
    const [rows] = await query(
      "SELECT * FROM VEHICLE_REQUEST WHERE id = ? AND tenant_id = ? AND status = 'pending' LIMIT 1",
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Request not found.' });
    const r = rows[0];
    // Assign vehicle to driver's STAFF record
    await query('UPDATE STAFF SET vehicle_plate = ?, vehicle_type = (SELECT vehicle_type FROM vehicle WHERE plate_number = ? AND tenant_id = ?) WHERE staff_id = ? AND tenant_id = ?',
      [r.vehicle_plate, r.vehicle_plate, tid, r.driver_id, tid]);
    await query("UPDATE vehicle SET status = 'On-Duty' WHERE plate_number = ? AND tenant_id = ?", [r.vehicle_plate, tid]);
    await query("UPDATE VEHICLE_REQUEST SET status = 'approved', reviewed_by = ? WHERE id = ?", [req.adminId || null, r.id]);
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT deny a driver_request
router.put('/:slug/api/admin/vehicle-requests/:id/deny', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    await query("UPDATE VEHICLE_REQUEST SET status = 'denied', reviewed_by = ? WHERE id = ? AND tenant_id = ?",
      [req.adminId || null, req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST assign a fleet vehicle to a specific driver (staff-initiated)
router.post('/:slug/api/admin/vehicles/:plate/assign', requireAdmin, requireSlugMatch, async (req, res) => {
  const { driver_id } = req.body;
  const tid = req.tenantId;
  const plate = req.params.plate;
  if (!driver_id) return res.status(400).json({ error: 'driver_id is required.' });
  try {
    const [veh] = await query("SELECT plate_number, vehicle_type FROM vehicle WHERE plate_number = ? AND tenant_id = ? LIMIT 1", [plate, tid]);
    if (!veh.length) return res.status(404).json({ error: 'Vehicle not found.' });

    // Unassign any previous driver from this vehicle
    await query("UPDATE STAFF SET vehicle_plate = NULL, vehicle_type = NULL WHERE vehicle_plate = ? AND tenant_id = ?", [plate, tid]);

    // Cancel any pending requests for this driver
    await query("UPDATE VEHICLE_REQUEST SET status = 'denied' WHERE driver_id = ? AND tenant_id = ? AND status = 'pending'", [driver_id, tid]);

    // Directly assign vehicle to the driver
    await query(
      "UPDATE STAFF SET vehicle_plate = ?, vehicle_type = ? WHERE staff_id = ? AND tenant_id = ?",
      [plate, veh[0].vehicle_type || null, driver_id, tid]
    );

    // Mark vehicle as On-Duty
    await query("UPDATE vehicle SET status = 'On-Duty' WHERE plate_number = ? AND tenant_id = ?", [plate, tid]);

    // Also log as an approved vehicle request for audit trail
    try {
      await query(
        `INSERT INTO VEHICLE_REQUEST (tenant_id, vehicle_plate, driver_id, request_type, status, initiated_by)
         VALUES (?, ?, ?, 'staff_assignment', 'approved', ?)`,
        [tid, plate, driver_id, req.adminId || null]
      );
    } catch(_) { /* table might not exist */ }

    res.json({ ok: true, message: 'Vehicle assigned to driver successfully.' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET global package categories for this tenant
router.get('/:slug/api/admin/package-categories', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const [rows] = await query('SELECT supported_package_categories FROM TENANT WHERE tenant_id = ? LIMIT 1', [req.tenantId]);
    const cats = (rows[0]?.supported_package_categories || 'Package,Food,Document,Bulk,Vehicle').split(',').filter(Boolean);
    res.json({ categories: cats });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT update global package categories for this tenant
router.put('/:slug/api/admin/package-categories', requireAdmin, requireSlugMatch, async (req, res) => {
  const { categories } = req.body; // array of strings
  if (!Array.isArray(categories)) return res.status(400).json({ error: 'categories must be an array.' });
  try {
    await query('UPDATE TENANT SET supported_package_categories = ? WHERE tenant_id = ?',
      [categories.join(','), req.tenantId]);
    res.json({ ok: true, categories });
  } catch(err) { res.status(500).json({ error: err.message }); }
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

  // ── Enforce plan-based driver limit ──
  if (role === 'Driver') {
    const [tenantPlan] = await query('SELECT plan, max_vehicles FROM TENANT WHERE tenant_id = ?', [tid]);
    const DRIVER_LIMITS = { startup: 20, enterprise: 50, global: null };
    const planKey = (tenantPlan[0]?.plan || 'startup').toLowerCase();
    const maxDrivers = DRIVER_LIMITS[planKey] !== undefined ? DRIVER_LIMITS[planKey] : DRIVER_LIMITS.startup;
    if (maxDrivers) {
      const [driverCount] = await query("SELECT COUNT(*) AS cnt FROM STAFF WHERE tenant_id = ? AND role = 'Driver'", [tid]);
      if (driverCount[0].cnt >= maxDrivers) {
        const planNames = { startup: 'Padala', enterprise: 'Negosyo', global: 'Korporasyon' };
        return res.status(403).json({ error: `${planNames[planKey] || planKey} plan is limited to ${maxDrivers} drivers. Upgrade your plan for more.` });
      }
    }
  }

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
// Normalize Philippine phone to 10-digit local format (9XXXXXXXXX)
// PayMongo adds its own +63 prefix, so we must NOT include it
function normalizePHPhone(raw) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0'))  digits = digits.slice(1);
  return digits.slice(0, 10);
}

// UPGRADE PLAN — PayMongo Checkout
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRICES = {
  startup:    { amount: 149900,  label: 'Startup Plan'    },   // ₱1,499 in centavos
  enterprise: { amount: 499900, label: 'Enterprise Plan' },   // ₱4,999
  global:     { amount: 1499900, label: 'Global Plan'     },   // ₱14,999
};
const PLAN_ORDER = ['startup', 'enterprise', 'global'];

router.post('/:slug/api/admin/upgrade', requireAdmin, requireSlugMatch, async (req, res) => {
  const { plan } = req.body;
  const tid = req.tenantId;
  const slug = req.params.slug;

  if (!plan || !PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan.' });

  // Check that the plan is actually an upgrade
  const [[tenant]] = await query(
    `SELECT t.plan, t.company_name, s.username AS admin_email, s.phone AS admin_phone 
     FROM TENANT t 
     LEFT JOIN STAFF s ON s.tenant_id = t.tenant_id AND s.role = 'Admin' 
     WHERE t.tenant_id = ? LIMIT 1`, [tid]);
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
            billing: {
              name: tenant?.company_name || slug,
              ...(tenant?.admin_email && { email: tenant.admin_email }),
              ...(tenant?.admin_phone && { phone: normalizePHPhone(tenant.admin_phone) })
            },
            line_items: [{
              name: PLAN_PRICES[plan].label + ' — ' + (tenant?.company_name || slug),
              amount: PLAN_PRICES[plan].amount,
              currency: 'PHP',
              quantity: 1,
            }],
            payment_method_types: ['gcash', 'card', 'paymaya'],
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

// RENEW PLAN — PayMongo Checkout (pay current plan's monthly fee)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:slug/api/admin/renew', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const slug = req.params.slug;

  try {
    const [[tenant]] = await query(
      `SELECT t.plan, t.company_name, s.username AS admin_email, s.phone AS admin_phone
       FROM TENANT t
       LEFT JOIN STAFF s ON s.tenant_id = t.tenant_id AND s.role = 'Admin'
       WHERE t.tenant_id = ? LIMIT 1`, [tid]);

    const planKey = (tenant?.plan || 'startup').toLowerCase();
    if (!PLAN_PRICES[planKey]) return res.status(400).json({ error: 'Unknown plan.' });

    const pmKey = process.env.PAYMONGO_SECRET_KEY;
    if (!pmKey) return res.status(500).json({ error: 'Payment gateway not configured. Contact platform support.' });

    const baseUrl = process.env.BASE_URL || 'https://logistichub.ddns.net';

    // Create a signed token for the success callback
    const crypto = require('crypto');
    const jwtSecret = process.env.JWT_SECRET || 'logistihub-upgrade';
    const token = crypto.createHmac('sha256', jwtSecret).update(`${tid}:renew:${planKey}:${slug}`).digest('hex');

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(pmKey + ':').toString('base64'),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: {
              name: tenant?.company_name || slug,
              ...(tenant?.admin_email && { email: tenant.admin_email }),
              ...(tenant?.admin_phone && { phone: normalizePHPhone(tenant.admin_phone) })
            },
            line_items: [{
              name: PLAN_PRICES[planKey].label + ' Monthly — ' + (tenant?.company_name || slug),
              amount: PLAN_PRICES[planKey].amount,
              currency: 'PHP',
              quantity: 1,
            }],
            payment_method_types: ['gcash', 'card', 'paymaya'],
            description: `Subscription renewal (${planKey}) for ${slug}`,
            success_url: `${baseUrl}/${slug}/api/admin/renew/success?plan=${planKey}&token=${token}`,
            cancel_url: `${baseUrl}/${slug}/admin`,
            metadata: { tenant_id: String(tid), slug, plan: planKey, type: 'renewal' },
          }
        }
      })
    });
    const pmData = await response.json();
    if (!response.ok) {
      console.error('[PayMongo renew checkout error]', JSON.stringify(pmData));
      return res.status(502).json({ error: 'Payment gateway error. Please try again.' });
    }
    const checkoutUrl = pmData.data?.attributes?.checkout_url;
    if (!checkoutUrl) return res.status(502).json({ error: 'Could not create checkout session.' });

    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'RENEWAL_INITIATED', target: `${planKey} plan renewal`, tenant_slug: slug, ip_address: req.ip });
    res.json({ ok: true, checkout_url: checkoutUrl });
  } catch(err) {
    console.error('[POST /admin/renew]', err);
    res.status(500).json({ error: 'Failed to create checkout. ' + err.message });
  }
});

// Success callback after PayMongo renewal payment
router.get('/:slug/api/admin/renew/success', async (req, res) => {
  const { plan, token } = req.query;
  const slug = req.params.slug;

  if (!plan || !PLAN_PRICES[plan]) return res.redirect(`/${slug}/admin`);

  try {
    const [[tenant]] = await query('SELECT tenant_id, plan FROM TENANT WHERE slug = ?', [slug]);
    if (!tenant) return res.redirect(`/${slug}/admin`);

    const crypto = require('crypto');
    const jwtSecret = process.env.JWT_SECRET || 'logistihub-upgrade';
    const expectedToken = crypto.createHmac('sha256', jwtSecret).update(`${tenant.tenant_id}:renew:${plan}:${slug}`).digest('hex');

    if (token !== expectedToken) {
      console.warn('[Renew] Invalid token for', slug, plan);
      return res.redirect(`/${slug}/admin`);
    }

    // Record subscription payment
    try {
      const pmKey = process.env.PAYMONGO_SECRET_KEY || '';
      await query(
        'INSERT INTO SUBSCRIPTION_PAYMENT (tenant_id, plan, amount, currency, status, is_test_mode) VALUES (?, ?, ?, ?, ?, ?)',
        [tenant.tenant_id, plan, PLAN_PRICES[plan].amount / 100, 'PHP', 'paid', pmKey.startsWith('sk_test') ? 1 : 0]
      );
    } catch(_) { /* table might not exist yet */ }

    // Re-activate tenant if suspended for non-payment
    try {
      await query(
        "UPDATE TENANT SET status = 'active', suspended_at = NULL, suspension_reason = NULL WHERE tenant_id = ? AND status = 'suspended'",
        [tenant.tenant_id]
      );
    } catch(_) {}

    logAudit({ actor: 'system', actor_type: 'system', action: 'RENEWAL_COMPLETED', target: `${plan} plan renewal`, tenant_slug: slug });

    // Show success page
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Successful</title>
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
      <h1>Payment Successful!</h1>
      <p>Your <strong style="text-transform:uppercase;color:#0f172a;">${plan}</strong> plan subscription has been renewed successfully.</p>
      <a href="/${slug}/admin"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>Back to Dashboard</a>
      </div></body></html>`);
  } catch(err) {
    console.error('[GET /admin/renew/success]', err);
    res.redirect(`/${slug}/admin`);
  }
});

// ── GET /:slug/api/admin/subscription — subscription payment history ────────
router.get('/:slug/api/admin/subscription', requireAdmin, requireSlugMatch, async (req, res) => {
  try {
    const tid = req.tenantId;
    const [payments] = await query(
      `SELECT * FROM SUBSCRIPTION_PAYMENT WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20`,
      [tid]
    );
    const [tenantRows] = await query('SELECT plan, created_at, pending_downgrade, downgrade_effective_date FROM TENANT WHERE tenant_id = ? LIMIT 1', [tid]);
    const tenant = tenantRows[0] || {};
    res.json({
      ok: true,
      plan: tenant.plan || 'startup',
      tenant_created_at: tenant.created_at,
      pending_downgrade: tenant.pending_downgrade || null,
      downgrade_effective_date: tenant.downgrade_effective_date || null,
      payments: payments || []
    });
  } catch (err) {
    console.error('[GET /admin/subscription]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /:slug/api/admin/downgrade — schedule a plan downgrade ─────────────
router.post('/:slug/api/admin/downgrade', requireAdmin, requireSlugMatch, async (req, res) => {
  const { plan } = req.body;
  const tid = req.tenantId;
  const slug = req.params.slug;

  if (!plan || !PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan.' });

  try {
    // Verify it's actually a downgrade
    const [[tenant]] = await query('SELECT plan FROM TENANT WHERE tenant_id = ?', [tid]);
    const currentIdx = PLAN_ORDER.indexOf(tenant?.plan?.toLowerCase() || 'startup');
    const targetIdx  = PLAN_ORDER.indexOf(plan);
    if (targetIdx >= currentIdx) return res.status(400).json({ error: 'You can only downgrade to a lower plan.' });
    if (targetIdx < 0) return res.status(400).json({ error: 'Invalid target plan.' });

    // Calculate next billing date (1 month from now) for display
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    const effectiveDate = nextBilling.toISOString().split('T')[0];

    // Store the pending downgrade
    // Add column if it doesn't exist
    try { await query('ALTER TABLE TENANT ADD COLUMN pending_downgrade VARCHAR(50) DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE TENANT ADD COLUMN downgrade_effective_date DATE DEFAULT NULL'); } catch(_) {}

    await query(
      'UPDATE TENANT SET pending_downgrade = ?, downgrade_effective_date = ? WHERE tenant_id = ?',
      [plan, effectiveDate, tid]
    );

    // Archive excess vehicles/drivers if downgrade reduces limits
    const PLAN_VEHICLE_LIMITS = { startup: 20, enterprise: 50, global: 999999 };
    const newLimit = PLAN_VEHICLE_LIMITS[plan] || 20;
    let archived = { vehicles: 0, drivers: 0 };

    // Archive excess vehicles (keep newest up to limit, archive the rest)
    const [vehicles] = await query(
      "SELECT id FROM FLEET_VEHICLE WHERE tenant_id = ? AND status != 'archived' ORDER BY created_at DESC",
      [tid]
    );
    if (vehicles.length > newLimit) {
      const excessIds = vehicles.slice(newLimit).map(v => v.id);
      await query(
        `UPDATE FLEET_VEHICLE SET status = 'archived' WHERE id IN (${excessIds.map(() => '?').join(',')})`,
        excessIds
      );
      archived.vehicles = excessIds.length;
    }

    // Archive excess drivers (keep newest up to limit, archive the rest)
    const [drivers] = await query(
      "SELECT staff_id FROM STAFF WHERE tenant_id = ? AND role = 'Driver' AND status != 'archived' ORDER BY created_at DESC",
      [tid]
    );
    if (drivers.length > newLimit) {
      const excessDriverIds = drivers.slice(newLimit).map(d => d.staff_id);
      await query(
        `UPDATE STAFF SET status = 'archived' WHERE staff_id IN (${excessDriverIds.map(() => '?').join(',')})`,
        excessDriverIds
      );
      archived.drivers = excessDriverIds.length;
    }

    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'DOWNGRADE_SCHEDULED', target: `${tenant.plan} → ${plan} (effective ${effectiveDate})${archived.vehicles || archived.drivers ? ` | archived ${archived.vehicles} vehicles, ${archived.drivers} drivers` : ''}`, tenant_slug: slug, ip_address: req.ip });

    res.json({ 
      ok: true, 
      message: `Your plan will be downgraded to ${plan.toUpperCase()} on ${effectiveDate}.`,
      effective_date: effectiveDate,
      new_plan: plan,
      archived
    });
  } catch(err) {
    console.error('[POST /admin/downgrade]', err);
    res.status(500).json({ error: 'Failed to schedule downgrade. ' + err.message });
  }
});

// ── POST /:slug/api/admin/cancel-downgrade — cancel a pending downgrade ─────
router.post('/:slug/api/admin/cancel-downgrade', requireAdmin, requireSlugMatch, async (req, res) => {
  const tid = req.tenantId;
  const slug = req.params.slug;

  try {
    const [[tenant]] = await query('SELECT pending_downgrade FROM TENANT WHERE tenant_id = ?', [tid]);
    if (!tenant?.pending_downgrade) {
      return res.status(400).json({ error: 'No pending downgrade to cancel.' });
    }

    await query(
      'UPDATE TENANT SET pending_downgrade = NULL, downgrade_effective_date = NULL WHERE tenant_id = ?',
      [tid]
    );

    logAudit({ actor: req.admin.email, actor_type: 'admin', action: 'DOWNGRADE_CANCELLED', target: `Cancelled pending downgrade to ${tenant.pending_downgrade}`, tenant_slug: slug, ip_address: req.ip });

    res.json({ ok: true, message: 'Pending downgrade has been cancelled. Your current plan remains active.' });
  } catch(err) {
    console.error('[POST /admin/cancel-downgrade]', err);
    res.status(500).json({ error: 'Failed to cancel downgrade. ' + err.message });
  }
});

module.exports = router;
