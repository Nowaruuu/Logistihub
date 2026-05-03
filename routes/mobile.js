'use strict';

const express = require('express');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { query, logAudit } = require('../config/db');

const router = express.Router({ mergeParams: true });

// ─── Unified Auth Middleware ──────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize role: 'user'/'User' → req.user, anything else (Driver, Manager…) → req.staff
    const roleLower = (payload.role || '').toLowerCase();
    if (roleLower === 'user') {
      req.user = payload;
    } else {
      req.staff = payload;
    }
    req.tenantId = payload.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
};

// Helper: generate delivery number
function generateDeliveryNumber() {
  const prefix = 'DLV';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// Helper: create notification
async function createNotification(userId, userType, tenantId, title, message, type, relatedTracking) {
  try {
    await query(
      `INSERT INTO NOTIFICATION (user_id, user_type, tenant_id, title, message, type, related_tracking)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userType, tenantId, title, message, type || 'Shipments', relatedTracking || null]
    );
  } catch (e) {
    console.error('[notification] Failed:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT CONFIG (public — no auth, used at app boot)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /tenant-config — returns tenant branding + available vehicle types
router.get('/tenant-config', async (req, res) => {
  const { slug } = req.params;
  try {
    // Only select columns guaranteed to exist — avoid crashing on missing columns
    const [rows] = await query(
      `SELECT * FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1`,
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found.' });
    const t = rows[0];
    const tid = t.tenant_id;

    // ── Vehicle types from fleet ──
    let vehicleTypes = [];
    let capacityMap = {};
    try {
      const [vrows] = await query(
        `SELECT DISTINCT LOWER(vehicle_type) AS vtype FROM vehicle
         WHERE tenant_id = ? AND status != 'Retired'`,
        [tid]
      );
      const typeMap = {
        'motorcycle': 'motorcycle', 'sedan': 'sedan', 'suv': 'sedan',
        'pickup': 'van', 'van': 'van', 'truck': 'truck',
        'trailer': 'flatbed', 'flatbed': 'flatbed',
      };
      const seen = new Set();
      vrows.forEach((r) => {
        const mapped = typeMap[r.vtype];
        if (mapped && !seen.has(mapped)) { seen.add(mapped); vehicleTypes.push(mapped); }
      });
      const [capRows] = await query(
        `SELECT LOWER(vehicle_type) AS vtype, MAX(capacity_tons) AS max_cap
         FROM vehicle WHERE tenant_id = ? AND status != 'Retired'
         GROUP BY LOWER(vehicle_type)`,
        [tid]
      );
      capRows.forEach((r) => {
        const mapped = typeMap[r.vtype];
        if (mapped && r.max_cap) {
          const kg = parseFloat(r.max_cap) * 1000;
          if (!capacityMap[mapped] || kg > capacityMap[mapped]) capacityMap[mapped] = kg;
        }
      });
    } catch (e) { console.warn('[tenant-config] vehicle query failed:', e.message); }

    if (vehicleTypes.length === 0) {
      vehicleTypes = t.available_vehicles
        ? t.available_vehicles.split(',').map(v => v.trim()).filter(Boolean)
        : ['motorcycle', 'sedan', 'van', 'truck', 'flatbed'];
    }

    // ── Package categories — read from the row we already have ──
    const allCats = ['Package', 'Food', 'Document', 'Bulk', 'Vehicle'];
    let supportedCats = allCats;
    try {
      if (t.supported_package_categories) {
        supportedCats = t.supported_package_categories.split(',').filter(Boolean);
      }
    } catch (e) {
      console.warn('[tenant-config] category parse failed:', e.message);
    }

    res.json({
      company_name: t.company_name || '',
      logo_url: t.logo_url || null,
      primary_color: t.primary_color || '#ea580c',
      available_vehicles: vehicleTypes,
      vehicle_capacities: capacityMap || {},
      supported_categories: supportedCats,
    });
  } catch (err) {
    console.error('[GET /tenant-config] FATAL:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER DOCUMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /driver/documents — get current driver's license info
router.get('/driver/documents', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const staffId = req.staff.staff_id;
  try {
    const [rows] = await query(
      'SELECT license_url, license_expiry, license_status FROM STAFF WHERE staff_id = ? LIMIT 1',
      [staffId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Staff not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /driver/documents]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /driver/documents — upload driver's license (base64 image + expiry)
router.put('/driver/documents', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const staffId = req.staff.staff_id;
  const tid = req.tenantId;
  const { license_image, license_expiry } = req.body;

  if (!license_image) return res.status(400).json({ error: 'No license image provided.' });

  // Validate base64 image (must start with data:image/)
  if (!license_image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image format. Must be a base64 image.' });
  }

  try {
    await query(
      `UPDATE STAFF SET
         license_url = ?,
         license_expiry = ?,
         license_status = 'pending_review'
       WHERE staff_id = ? AND tenant_id = ?`,
      [license_image, license_expiry || null, staffId, tid]
    );
    res.json({ ok: true, message: 'License submitted for review.' });
  } catch (err) {
    console.error('[PUT /driver/documents]', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// GET /driver/vehicle — get driver's registered vehicle info (includes license_status)
router.get('/driver/vehicle', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  try {
    const [rows] = await query(
      `SELECT s.vehicle_plate, s.vehicle_type, s.license_status, s.license_expiry,
              v.model
       FROM STAFF s
       LEFT JOIN vehicle v ON v.plate_number = s.vehicle_plate AND v.tenant_id = s.tenant_id
       WHERE s.staff_id = ? LIMIT 1`,
      [req.staff.staff_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Staff not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /driver/vehicle]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /driver/vehicle — register/update driver's vehicle
router.put('/driver/vehicle', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const { vehicle_plate, vehicle_type, model } = req.body;
  if (!vehicle_plate || !vehicle_type) {
    return res.status(400).json({ error: 'vehicle_plate and vehicle_type are required.' });
  }
  const plate = vehicle_plate.toUpperCase().trim();
  const tid   = req.tenantId;

  try {
    // 0. License gate — driver must have a verified license
    const [licRows] = await query(
      'SELECT license_status FROM STAFF WHERE staff_id = ? AND tenant_id = ? LIMIT 1',
      [req.staff.staff_id, tid]
    );
    const licStatus = licRows[0]?.license_status || 'not_uploaded';
    if (licStatus !== 'verified') {
      const msgs = {
        not_uploaded:   'You must upload your driver\'s license before registering a vehicle.',
        pending_review: 'Your license is under review. Please wait for admin approval before registering a vehicle.',
        expired:        'Your driver\'s license has expired. Please upload a valid license.',
      };
      return res.status(403).json({ error: msgs[licStatus] || 'License not verified.', license_status: licStatus });
    }

    // 1. Save to STAFF record (for auto-assignment when accepting jobs)
    await query(
      'UPDATE STAFF SET vehicle_plate = ?, vehicle_type = ? WHERE staff_id = ? AND tenant_id = ?',
      [plate, vehicle_type, req.staff.staff_id, tid]
    );

    // 2. Get driver name for the fleet record label
    const [staffRows] = await query(
      'SELECT name FROM STAFF WHERE staff_id = ? LIMIT 1',
      [req.staff.staff_id]
    );
    const driverName = staffRows[0]?.name || 'Driver';

    // 3. Sync to fleet vehicle table so admin can see driver's vehicle
    //    IMPORTANT: Never overwrite an existing admin-managed vehicle's type/capacity.
    //    Only insert if the plate is brand new; if it exists, just note the driver link.
    const [existing] = await query(
      'SELECT plate_number FROM vehicle WHERE plate_number = ? AND tenant_id = ? LIMIT 1',
      [plate, tid]
    );

    if (existing.length === 0) {
      // ── Enforce Padala (startup) plan vehicle limit ──
      const [tenantPlan] = await query('SELECT plan FROM TENANT WHERE tenant_id = ?', [tid]);
      if (tenantPlan[0]?.plan === 'startup') {
        const [vehCount] = await query('SELECT COUNT(*) AS cnt FROM vehicle WHERE tenant_id = ?', [tid]);
        if (vehCount[0].cnt >= 10) {
          return res.status(403).json({ error: 'Padala plan is limited to 10 vehicles. Contact your admin to upgrade.' });
        }
      }

      // New plate — insert into fleet
      await query(
        `INSERT INTO vehicle (tenant_id, plate_number, vehicle_type, model, capacity_tons, status, ownership_doc)
         VALUES (?, ?, ?, ?, 0, 'Available', ?)`,
        [tid, plate, vehicle_type, model || null, `Registered by driver: ${driverName}`]
      );
    } else {
      // Plate already exists — only update model and ownership note, NEVER touch type/capacity
      await query(
        `UPDATE vehicle SET model = COALESCE(?, model), ownership_doc = ? WHERE plate_number = ? AND tenant_id = ?`,
        [model || null, `Driver: ${driverName}`, plate, tid]
      );
    }

    res.json({ ok: true, message: 'Vehicle info saved.' });
  } catch (err) {
    console.error('[PUT /driver/vehicle]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /driver/fleet-vehicles — list available fleet vehicles driver can request
router.get('/driver/fleet-vehicles', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  try {
    const [rows] = await query(
      `SELECT v.plate_number, v.vehicle_type, v.model, v.capacity_tons, v.supported_item_types
       FROM vehicle v
       WHERE v.tenant_id = ? AND v.status = 'Available'
         AND NOT EXISTS (
           SELECT 1 FROM STAFF s WHERE s.vehicle_plate = v.plate_number AND s.tenant_id = v.tenant_id
         )
       ORDER BY v.vehicle_type, v.plate_number`,
      [req.tenantId]
    );
    res.json({ vehicles: rows });
  } catch (err) {
    console.error('[GET /driver/fleet-vehicles]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /driver/vehicle-request — driver requests a specific fleet vehicle
router.post('/driver/vehicle-request', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const { vehicle_plate } = req.body;
  if (!vehicle_plate) return res.status(400).json({ error: 'vehicle_plate is required.' });
  const tid = req.tenantId;
  const driverId = req.staff.staff_id;
  try {
    // 0. License gate
    const [licRows] = await query(
      'SELECT license_status FROM STAFF WHERE staff_id = ? AND tenant_id = ? LIMIT 1',
      [driverId, tid]
    );
    const licStatus = licRows[0]?.license_status || 'not_uploaded';
    if (licStatus !== 'verified') {
      const msgs = {
        not_uploaded:   'You must upload and have your driver\'s license verified before requesting a vehicle.',
        pending_review: 'Your license is under review. Please wait for admin approval.',
        expired:        'Your driver\'s license has expired. Please upload a valid license.',
      };
      return res.status(403).json({ error: msgs[licStatus] || 'License not verified.', license_status: licStatus });
    }

    // Check vehicle exists and is available
    const [veh] = await query(
      "SELECT plate_number FROM vehicle WHERE plate_number = ? AND tenant_id = ? AND status = 'Available' LIMIT 1",
      [vehicle_plate, tid]
    );
    if (!veh.length) return res.status(400).json({ error: 'Vehicle not available.' });

    // Check no pending request already
    const [existing] = await query(
      "SELECT id FROM VEHICLE_REQUEST WHERE driver_id = ? AND tenant_id = ? AND status = 'pending' LIMIT 1",
      [driverId, tid]
    );
    if (existing.length) return res.status(400).json({ error: 'You already have a pending request.' });


    await query(
      `INSERT INTO VEHICLE_REQUEST (tenant_id, vehicle_plate, driver_id, request_type, status, initiated_by)
       VALUES (?, ?, ?, 'driver_request', 'pending', ?)`,
      [tid, vehicle_plate, driverId, driverId]
    );
    res.json({ ok: true, message: 'Request submitted. Waiting for admin approval.' });
  } catch (err) {
    console.error('[POST /driver/vehicle-request]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /driver/vehicle-requests — driver sees their own requests & incoming assignments
router.get('/driver/vehicle-requests', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  try {
    const [rows] = await query(
      `SELECT vr.*, v.vehicle_type, v.model, v.capacity_tons, v.supported_item_types
       FROM VEHICLE_REQUEST vr
       JOIN vehicle v ON v.plate_number = vr.vehicle_plate AND v.tenant_id = vr.tenant_id
       WHERE vr.driver_id = ? AND vr.tenant_id = ?
       ORDER BY vr.created_at DESC LIMIT 20`,
      [req.staff.staff_id, req.tenantId]
    );
    res.json({ requests: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /driver/vehicle-request/:id/respond — accept or refuse a staff_assignment
router.put('/driver/vehicle-request/:id/respond', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const { action, reason } = req.body; // action: 'accept' | 'refuse'
  if (!['accept', 'refuse'].includes(action)) return res.status(400).json({ error: 'action must be accept or refuse.' });
  if (action === 'refuse' && !reason?.trim()) return res.status(400).json({ error: 'Please provide a reason for refusing.' });

  const tid = req.tenantId;
  const driverId = req.staff.staff_id;
  try {
    const [rows] = await query(
      "SELECT * FROM VEHICLE_REQUEST WHERE id = ? AND driver_id = ? AND tenant_id = ? AND request_type = 'staff_assignment' AND status = 'pending' LIMIT 1",
      [req.params.id, driverId, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found or already resolved.' });
    const request = rows[0];

    if (action === 'accept') {
      // Assign vehicle to driver
      await query('UPDATE STAFF SET vehicle_plate = ? WHERE staff_id = ? AND tenant_id = ?', [request.vehicle_plate, driverId, tid]);
      await query('UPDATE vehicle SET status = ? WHERE plate_number = ? AND tenant_id = ?', ['On-Duty', request.vehicle_plate, tid]);
      await query('UPDATE VEHICLE_REQUEST SET status = ? WHERE id = ?', ['approved', request.id]);
      res.json({ ok: true, message: 'Vehicle accepted and assigned to you.' });
    } else {
      // Refuse — revert vehicle to Available
      await query('UPDATE vehicle SET status = ? WHERE plate_number = ? AND tenant_id = ?', ['Available', request.vehicle_plate, tid]);
      await query('UPDATE VEHICLE_REQUEST SET status = ?, refusal_reason = ? WHERE id = ?', ['refused', reason.trim(), request.id]);

      // 3x flag check — count refused assignments for this driver
      const [refusals] = await query(
        "SELECT COUNT(*) AS cnt FROM VEHICLE_REQUEST WHERE driver_id = ? AND tenant_id = ? AND status = 'refused'",
        [driverId, tid]
      );
      const refusalCount = refusals[0]?.cnt || 0;

      // Notify admins if 3+ refusals
      if (refusalCount >= 3) {
        const [admins] = await query('SELECT staff_id FROM STAFF WHERE tenant_id = ? AND role = ? LIMIT 5', [tid, 'Admin']);
        for (const a of admins) {
          await createNotification(
            a.staff_id, 'staff', tid,
            '⚠️ Driver Refusal Alert',
            `Driver ${req.staff.name || 'Unknown'} has refused ${refusalCount} vehicle assignments. Please review.`,
            'General', null
          );
        }
      }
      res.json({ ok: true, message: 'Vehicle assignment refused.', refusal_count: refusalCount });
    }
  } catch (err) {
    console.error('[PUT /driver/vehicle-request/respond]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════

// GET /deliveries — list user's or driver's shipments
router.get('/deliveries', authMiddleware, async (req, res) => {
  const tid = req.tenantId;
  try {
    let rows;
    if (req.staff) {
      // Driver: assigned shipments
      const staffId = req.staff.staff_id;
      [rows] = await query(
        `SELECT s.*, d.name AS driver_name
         FROM shipment s LEFT JOIN STAFF d ON d.staff_id = s.assigned_driver_id
         WHERE s.tenant_id = ? AND (s.assigned_driver_id = ? OR s.status = 'Pending')
         ORDER BY s.created_at DESC LIMIT 50`,
        [tid, staffId]
      );
    } else {
      // Customer: their own shipments — include payment status via LEFT JOIN
      [rows] = await query(
        `SELECT s.*,
                (SELECT CASE WHEN p.status = 'Paid' THEN 1 ELSE 0 END
                 FROM payment p
                 WHERE p.delivery_number = s.delivery_number
                   AND p.tenant_id = s.tenant_id
                   AND p.status = 'Paid' LIMIT 1) AS is_paid,
                (SELECT p.payment_method
                 FROM payment p
                 WHERE p.delivery_number = s.delivery_number
                   AND p.tenant_id = s.tenant_id
                   AND p.status = 'Paid' LIMIT 1) AS paid_method
         FROM shipment s
         WHERE s.tenant_id = ? AND s.sender_user_id = ?
         ORDER BY s.created_at DESC LIMIT 50`,
        [tid, req.user.user_id]
      );
    }
    res.json({ deliveries: rows });
  } catch (err) {
    console.error('[GET /deliveries]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /deliveries — create shipment from mobile app
router.post('/deliveries', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Only customers can create shipments.' });

  const tid = req.tenantId;
  const userId = req.user.user_id;
  const {
    pickup_location, dropoff_location, pickup_lat, pickup_lng,
    dropoff_lat, dropoff_lng, sender_name, sender_phone, receiver_name, receiver_phone,
    receiver_address, item_type_flag, vehicle_type, weight, size,
    shipping_method, total_fee, content_description, estimated_arrival
  } = req.body;

  if (!pickup_location || !dropoff_location) {
    return res.status(400).json({ error: 'Pickup and dropoff locations are required.' });
  }

  const deliveryNumber = generateDeliveryNumber();
  const itemType = item_type_flag || 'PACKAGE';

  // Server-side vehicle compatibility check
  const CATEGORY_VEHICLES = {
    PACKAGE: ['motorcycle', 'sedan', 'van'],
    VEHICLE: ['flatbed', 'truck'],
    FOOD: ['motorcycle', 'sedan', 'van'],
    DOC: ['motorcycle', 'sedan'],
    BULK: ['truck', 'flatbed'],
  };
  const requiredTypes = CATEGORY_VEHICLES[itemType.toUpperCase()] || null;
  if (requiredTypes) {
    const [vehicles] = await query(
      `SELECT LOWER(vehicle_type) AS vtype FROM vehicle WHERE tenant_id = ? AND status != 'Retired' GROUP BY LOWER(vehicle_type)`,
      [tid]
    );
    const tenantTypes = vehicles.map(v => v.vtype || '');
    const hasCompatible = requiredTypes.some(rt => tenantTypes.includes(rt));
    if (!hasCompatible) {
      return res.status(400).json({
        error: `No suitable vehicle available for ${itemType} deliveries. Your fleet needs one of: ${requiredTypes.join(', ')}. Contact your admin to add the right vehicle type.`
      });
    }
  }

   try {
    // Auto-add columns if they don't exist
    try { await query('ALTER TABLE shipment ADD COLUMN vehicle_type VARCHAR(50) DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE shipment ADD COLUMN sender_name VARCHAR(255) DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE shipment ADD COLUMN sender_phone VARCHAR(20) DEFAULT NULL'); } catch(_) {}

    await query(
      `INSERT INTO shipment (
        delivery_number, tenant_id, sender_user_id, sender_name, sender_phone, pickup_location, dropoff_location,
        pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
        receiver_name, receiver_phone, receiver_address,
        item_type_flag, vehicle_type, weight, size, shipping_method, total_fee,
        estimated_arrival, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
      [
        deliveryNumber, tid, userId, sender_name || null, sender_phone || null, pickup_location, dropoff_location,
        pickup_lat || null, pickup_lng || null, dropoff_lat || null, dropoff_lng || null,
        receiver_name || null, receiver_phone || null, receiver_address || null,
        itemType, vehicle_type || null, weight || null, size || null, shipping_method || 'Standard',
        total_fee || 0, estimated_arrival || '3-5 business days'
      ]
    );

    // Insert sub-table data if PACKAGE
    if (itemType === 'PACKAGE' && content_description) {
      try {
        await query(
          'INSERT INTO sub_package (delivery_number, weight, content_description) VALUES (?, ?, ?)',
          [deliveryNumber, weight || 0, content_description]
        );
      } catch (_) { /* sub table may not exist */ }
    }

    // Create shipment history entry — Order placed checkpoint
    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, 'Pending', ?, 'Order placed. Your shipment is being prepared for pickup.', ?)`,
      [deliveryNumber, tid, pickup_location, req.user.name || 'Customer']
    );

    // Notification for user
    await createNotification(
      userId, 'app_user', tid,
      'Shipment Created',
      `Your shipment ${deliveryNumber} has been created and is pending pickup.`,
      'Shipments', deliveryNumber
    );

    res.status(201).json({ ok: true, delivery_number: deliveryNumber });
  } catch (err) {
    console.error('[POST /deliveries]', err);
    res.status(500).json({ error: err.message || 'Failed to create shipment.' });
  }
});

// GET /deliveries/:dn — single shipment with history
router.get('/deliveries/:dn', authMiddleware, async (req, res) => {
  const tid = req.tenantId;
  const dn = req.params.dn;
  try {
    const [rows] = await query(
      `SELECT s.*,
              st.name AS driver_name, st.vehicle_plate AS driver_plate, st.vehicle_type AS driver_vehicle_type,
              u.first_name, u.last_name
       FROM shipment s
       LEFT JOIN STAFF st ON st.staff_id = s.assigned_driver_id AND st.tenant_id = s.tenant_id
       LEFT JOIN APP_USER u ON u.user_id = s.sender_user_id AND u.tenant_id = s.tenant_id
       WHERE s.delivery_number = ? AND s.tenant_id = ? LIMIT 1`,
      [dn, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Shipment not found.' });

    const [history] = await query(
      'SELECT * FROM SHIPMENT_HISTORY WHERE delivery_number = ? AND tenant_id = ? ORDER BY created_at ASC',
      [dn, tid]
    );

    const [payments] = await query(
      'SELECT * FROM payment WHERE delivery_number = ? AND tenant_id = ?',
      [dn, tid]
    );

    res.json({ shipment: rows[0], history, payments });
  } catch (err) {
    console.error('[GET /deliveries/:dn]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /deliveries/:dn/rate — rate a completed delivery (user only)
router.post('/deliveries/:dn/rate', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Users only.' });
  const tid = req.tenantId;
  const dn = req.params.dn;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

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

    // Verify the shipment exists and belongs to this user
    const [ship] = await query(
      "SELECT assigned_driver_id FROM shipment WHERE delivery_number = ? AND tenant_id = ? AND sender_user_id = ? AND status = 'Delivered' LIMIT 1",
      [dn, tid, req.user.user_id]
    );
    if (!ship.length) return res.status(404).json({ error: 'Delivered shipment not found.' });

    // Check if already rated
    const [existing] = await query(
      'SELECT rating_id FROM DELIVERY_RATING WHERE delivery_number = ? AND tenant_id = ?',
      [dn, tid]
    );
    if (existing.length) return res.status(409).json({ error: 'You have already rated this delivery.' });

    await query(
      `INSERT INTO DELIVERY_RATING (delivery_number, tenant_id, user_id, driver_staff_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dn, tid, req.user.user_id, ship[0].assigned_driver_id || null, Math.round(rating), comment || null]
    );

    console.log('[RATE] Saved rating:', { dn, tid, driver_staff_id: ship[0].assigned_driver_id, rating: Math.round(rating) });
    res.json({ ok: true, message: 'Thank you for your rating!' });
  } catch (err) {
    console.error('[POST /deliveries/:dn/rate]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /deliveries/:dn/rating — get rating for a delivery
router.get('/deliveries/:dn/rating', authMiddleware, async (req, res) => {
  const tid = req.tenantId;
  const dn = req.params.dn;
  try {
    const [rows] = await query(
      'SELECT rating, comment, created_at FROM DELIVERY_RATING WHERE delivery_number = ? AND tenant_id = ? LIMIT 1',
      [dn, tid]
    );
    res.json({ rating: rows[0] || null });
  } catch (err) {
    // Table may not exist yet — return null
    res.json({ rating: null });
  }
});

// PUT /change-password — change password for user or staff
router.put('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  const bcrypt = require('bcryptjs');

  try {
    if (req.user) {
      // APP_USER
      const [rows] = await query('SELECT password_hash FROM APP_USER WHERE user_id = ? AND tenant_id = ?', [req.user.user_id, req.tenantId]);
      if (!rows.length) return res.status(404).json({ error: 'User not found.' });
      if (!await bcrypt.compare(currentPassword, rows[0].password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
      const newHash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE APP_USER SET password_hash = ? WHERE user_id = ? AND tenant_id = ?', [newHash, req.user.user_id, req.tenantId]);
      return res.json({ ok: true, message: 'Password changed successfully.' });
    }
    if (req.staff) {
      // STAFF (driver, document controller)
      const [rows] = await query('SELECT password_hash FROM STAFF WHERE staff_id = ? AND tenant_id = ?', [req.staff.staff_id, req.tenantId]);
      if (!rows.length) return res.status(404).json({ error: 'Staff not found.' });
      if (!await bcrypt.compare(currentPassword, rows[0].password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
      const newHash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE STAFF SET password_hash = ? WHERE staff_id = ? AND tenant_id = ?', [newHash, req.staff.staff_id, req.tenantId]);
      return res.json({ ok: true, message: 'Password changed successfully.' });
    }
    res.status(403).json({ error: 'Forbidden.' });
  } catch (err) {
    console.error('[PUT /change-password]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /update-phone — update phone number for user or staff
router.put('/update-phone', authMiddleware, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  try {
    if (req.user) {
      await query('UPDATE APP_USER SET phone = ? WHERE user_id = ? AND tenant_id = ?', [phone, req.user.user_id, req.tenantId]);
      return res.json({ ok: true, message: 'Phone updated.' });
    }
    if (req.staff) {
      await query('UPDATE STAFF SET phone = ? WHERE staff_id = ? AND tenant_id = ?', [phone, req.staff.staff_id, req.tenantId]);
      return res.json({ ok: true, message: 'Phone updated.' });
    }
    res.status(403).json({ error: 'Forbidden.' });
  } catch (err) {
    console.error('[PUT /update-phone]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /profile — update name and phone for user or staff
router.put('/profile', authMiddleware, async (req, res) => {
  const { first_name, last_name, phone } = req.body;

  try {
    if (req.user) {
      const sets = [];
      const vals = [];
      if (first_name !== undefined) { sets.push('first_name = ?'); vals.push(first_name); }
      if (last_name !== undefined)  { sets.push('last_name = ?');  vals.push(last_name);  }
      if (phone !== undefined)      { sets.push('phone = ?');      vals.push(phone);      }
      // Also update the combined "name" column if first/last changed
      if (first_name !== undefined || last_name !== undefined) {
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();
        sets.push('name = ?'); vals.push(fullName);
      }
      if (sets.length === 0) return res.json({ ok: true });
      vals.push(req.user.user_id, req.tenantId);
      await query(`UPDATE APP_USER SET ${sets.join(', ')} WHERE user_id = ? AND tenant_id = ?`, vals);
      return res.json({ ok: true, message: 'Profile updated.' });
    }
    if (req.staff) {
      const sets = [];
      const vals = [];
      if (first_name !== undefined) { sets.push('first_name = ?'); vals.push(first_name); }
      if (last_name !== undefined)  { sets.push('last_name = ?');  vals.push(last_name);  }
      if (phone !== undefined)      { sets.push('phone = ?');      vals.push(phone);      }
      if (first_name !== undefined || last_name !== undefined) {
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();
        sets.push('name = ?'); vals.push(fullName);
      }
      if (sets.length === 0) return res.json({ ok: true });
      vals.push(req.staff.staff_id, req.tenantId);
      await query(`UPDATE STAFF SET ${sets.join(', ')} WHERE staff_id = ? AND tenant_id = ?`, vals);
      return res.json({ ok: true, message: 'Profile updated.' });
    }
    res.status(403).json({ error: 'Forbidden.' });
  } catch (err) {
    console.error('[PUT /profile]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /notifications — generate notifications from shipment history
router.get('/notifications', authMiddleware, async (req, res) => {
  const tid = req.tenantId;
  try {
    let notifications = [];

    if (req.user) {
      // CUSTOMER: notifications from their shipments' history
      const [rows] = await query(
        `SELECT sh.id, sh.shipment_id, sh.status, sh.note, sh.changed_at,
                s.delivery_number, s.destination
         FROM shipment_history sh
         JOIN shipment s ON s.id = sh.shipment_id
         WHERE s.sender_user_id = ? AND s.tenant_id = ?
         ORDER BY sh.changed_at DESC
         LIMIT 50`,
        [req.user.user_id, tid]
      );
      notifications = rows.map(r => {
        let title = 'Shipment Update';
        let message = `Your package #${r.delivery_number} status changed to ${r.status}.`;
        if (r.status === 'Delivered') {
          title = 'Successfully Delivered!';
          message = `Your package #${r.delivery_number} has been delivered to ${r.destination || 'the destination'}.`;
        } else if (r.status === 'In Transit') {
          title = 'Package In Transit';
          message = `Your package #${r.delivery_number} is on its way!`;
        } else if (r.status === 'Out for Delivery') {
          title = 'Out for Delivery';
          message = `Your package #${r.delivery_number} is nearby and will arrive soon.`;
        } else if (r.status === 'Processing') {
          title = 'Package Received';
          message = `Your shipment #${r.delivery_number} has been received and is being processed.`;
        }
        return {
          id: `sh-${r.id}`,
          title,
          message,
          type: 'Shipments',
          read: false,
          createdAt: r.changed_at,
          relatedTrackingNumber: r.delivery_number
        };
      });
    } else if (req.staff) {
      // DRIVER: notifications from assigned shipments
      const [rows] = await query(
        `SELECT sh.id, sh.shipment_id, sh.status, sh.note, sh.changed_at,
                s.delivery_number, s.origin, s.destination
         FROM shipment_history sh
         JOIN shipment s ON s.id = sh.shipment_id
         WHERE s.assigned_driver_id = ? AND s.tenant_id = ?
         ORDER BY sh.changed_at DESC
         LIMIT 50`,
        [req.staff.staff_id, tid]
      );
      notifications = rows.map(r => {
        let title = 'Job Update';
        let message = `Delivery #${r.delivery_number} status: ${r.status}.`;
        if (r.status === 'In Transit') {
          title = 'New Pickup Assigned';
          message = `Pick up #${r.delivery_number} from ${r.origin || 'the sender'}.`;
        } else if (r.status === 'Delivered') {
          title = 'Delivery Completed';
          message = `You completed delivery #${r.delivery_number} to ${r.destination || 'the recipient'}.`;
        } else if (r.status === 'Out for Delivery') {
          title = 'En Route';
          message = `You're delivering #${r.delivery_number} to ${r.destination || 'the recipient'}.`;
        }
        return {
          id: `sh-${r.id}`,
          title,
          message,
          type: 'Shipments',
          read: false,
          createdAt: r.changed_at,
          relatedTrackingNumber: r.delivery_number
        };
      });
    }

    res.json({ notifications });
  } catch (err) {
    console.error('[GET /notifications]', err);
    res.json({ notifications: [] });
  }
});

// GET /track/:dn — public tracking with live driver GPS (no auth)
router.get('/track/:dn', async (req, res) => {
  const { slug } = req.params;
  const dn = req.params.dn;
  try {
    const [tenants] = await query("SELECT tenant_id FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1", [slug]);
    if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
    const tid = tenants[0].tenant_id;

    const [rows] = await query(
      `SELECT delivery_number, status, pickup_location, dropoff_location,
              pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
              estimated_arrival, created_at,
              driver_lat, driver_lng, driver_location_updated_at,
              proof_photo_url
       FROM shipment WHERE delivery_number = ? AND tenant_id = ? LIMIT 1`,
      [dn, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Shipment not found.' });

    const [history] = await query(
      'SELECT status, location, description, created_at FROM SHIPMENT_HISTORY WHERE delivery_number = ? AND tenant_id = ? ORDER BY created_at ASC',
      [dn, tid]
    );

    res.json({ shipment: rows[0], history });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /driver/jobs — available pending shipments (filtered by vehicle compatibility)
router.get('/driver/jobs', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const tid = req.tenantId;
  try {
    const [rows] = await query(
      `SELECT s.* FROM shipment s
       WHERE s.tenant_id = ? AND s.status = 'Pending' AND s.assigned_driver_id IS NULL
         AND EXISTS (SELECT 1 FROM payment p WHERE p.delivery_number = s.delivery_number AND p.tenant_id = s.tenant_id AND p.status = 'Paid')
       ORDER BY s.created_at DESC LIMIT 30`,
      [tid]
    );

    // Get driver's vehicle type for filtering
    const staffId = req.staff.staff_id;
    const [driverRows] = await query(
      'SELECT vehicle_plate, vehicle_type FROM STAFF WHERE staff_id = ? LIMIT 1',
      [staffId]
    );
    let driverVehicleType = (driverRows[0]?.vehicle_type || '').toLowerCase();
    const driverPlate = driverRows[0]?.vehicle_plate || null;

    // Fallback to fleet table
    if (driverPlate && !driverVehicleType) {
      const [vRows] = await query(
        'SELECT vehicle_type FROM vehicle WHERE plate_number = ? AND tenant_id = ? LIMIT 1',
        [driverPlate, tid]
      );
      if (vRows.length) driverVehicleType = (vRows[0].vehicle_type || '').toLowerCase();
    }

    // Filter by vehicle compatibility — match the EXACT vehicle type the customer chose
    let filteredJobs = [];
    if (!driverVehicleType) {
      // No vehicle registered — show no jobs
      filteredJobs = [];
    } else {
      filteredJobs = rows.filter(job => {
        const jobVehicle = (job.vehicle_type || '').toLowerCase();
        // If shipment has a specific vehicle_type set by customer, match exactly
        if (jobVehicle) {
          return jobVehicle === driverVehicleType;
        }
        // Legacy shipments without vehicle_type — use category-based filtering
        const VEHICLE_CATEGORIES = {
          motorcycle: ['PACKAGE', 'FOOD', 'DOC'],
          sedan: ['PACKAGE', 'FOOD', 'DOC'],
          van: ['PACKAGE', 'FOOD'],
          truck: ['BULK', 'VEHICLE', 'PACKAGE'],
          flatbed: ['BULK', 'VEHICLE'],
        };
        const allowedCategories = VEHICLE_CATEGORIES[driverVehicleType] || [];
        const cat = (job.item_type_flag || 'PACKAGE').toUpperCase();
        return allowedCategories.includes(cat);
      });
    }

    res.json({ jobs: filteredJobs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /driver/accept/:dn — accept a delivery job
router.post('/driver/accept/:dn', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const tid = req.tenantId;
  const dn = req.params.dn;
  const staffId = req.staff.staff_id;
  const staffName = req.staff.name || 'Driver';

  try {
    // Check shipment is still available
    const [rows] = await query(
      "SELECT * FROM shipment WHERE delivery_number = ? AND tenant_id = ? AND status = 'Pending' LIMIT 1",
      [dn, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Shipment not available or already taken.' });

    // Check payment — driver cannot accept unpaid shipments
    const [payRows] = await query(
      "SELECT 1 FROM payment WHERE delivery_number = ? AND tenant_id = ? AND status = 'Paid' LIMIT 1",
      [dn, tid]
    );
    if (!payRows.length) {
      return res.status(400).json({ error: 'This shipment has not been paid yet. The customer must pay before a driver can accept it.' });
    }

    // Get driver's registered vehicle plate + type
    const [driverRows] = await query(
      'SELECT vehicle_plate, vehicle_type, name FROM STAFF WHERE staff_id = ? LIMIT 1',
      [staffId]
    );
    const driverVehiclePlate = driverRows[0]?.vehicle_plate || null;
    const driverVehicleType = (driverRows[0]?.vehicle_type || '').toLowerCase();

    // Also check from fleet table if driver has a vehicle assigned
    let effectiveVehicleType = driverVehicleType;
    if (driverVehiclePlate && !effectiveVehicleType) {
      const [vRows] = await query(
        'SELECT vehicle_type FROM vehicle WHERE plate_number = ? AND tenant_id = ? LIMIT 1',
        [driverVehiclePlate, tid]
      );
      if (vRows.length) effectiveVehicleType = (vRows[0].vehicle_type || '').toLowerCase();
    }

    // Vehicle type → category compatibility (same rules as mobile app)
    const CATEGORY_VEHICLES = {
      PACKAGE: ['motorcycle', 'sedan', 'van'],
      VEHICLE: ['flatbed', 'truck'],
      FOOD: ['motorcycle', 'sedan', 'van'],
      DOC: ['motorcycle', 'sedan'],
      BULK: ['truck', 'flatbed'],
    };
    const shipCategory = (rows[0].item_type_flag || 'PACKAGE').toUpperCase();
    const shipVehicleType = (rows[0].vehicle_type || '').toLowerCase();

    // Driver MUST have a registered vehicle type to accept any job
    if (!effectiveVehicleType) {
      return res.status(400).json({
        error: 'You must register your vehicle before accepting jobs. Go to Profile → Vehicle Info.'
      });
    }

    // If shipment specifies an exact vehicle type, enforce exact match
    if (shipVehicleType && shipVehicleType !== effectiveVehicleType) {
      return res.status(400).json({
        error: `This shipment requires a ${shipVehicleType}. Your vehicle is a ${effectiveVehicleType}.`
      });
    }

    // Fallback: enforce category-based compatibility for legacy shipments
    if (!shipVehicleType) {
      const allowedVehicles = CATEGORY_VEHICLES[shipCategory] || ['motorcycle','sedan','van','truck','flatbed'];
      if (!allowedVehicles.includes(effectiveVehicleType)) {
        return res.status(400).json({
          error: `Your vehicle (${effectiveVehicleType}) is not suitable for ${shipCategory.toLowerCase()} deliveries. Required: ${allowedVehicles.join(', ')}.`
        });
      }
    }

    await query(
      `UPDATE shipment
       SET assigned_driver_id = ?, assigned_vehicle_plate = ?, status = 'In-Transit'
       WHERE delivery_number = ? AND tenant_id = ?`,
      [staffId, driverVehiclePlate, dn, tid]
    );

    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, 'In-Transit', ?, ?, ?)`,
      [dn, tid, rows[0].pickup_location || 'Origin',
       `Delivery driver has been assigned. ${staffName} is on the way to pick up your package.`,
       staffName]
    );

    // Second checkpoint: out for delivery (when driver accepts = going to pick up)
    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, 'Out for Delivery', ?, ?, ?)`,
      [dn, tid, rows[0].pickup_location || 'Origin',
       `Package is out for delivery. Your package is with ${staffName} and is on its way to you.`,
       staffName]
    );

    // Notify the customer
    if (rows[0].sender_user_id) {
      await createNotification(
        rows[0].sender_user_id, 'app_user', tid,
        'Driver Assigned',
        `${staffName} has accepted your shipment ${dn} and is on the way.`,
        'Shipments', dn
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /driver/accept]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /driver/status/:dn — update delivery status
router.put('/driver/status/:dn', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const tid = req.tenantId;
  const dn = req.params.dn;
  const { status, location, proof_photo } = req.body;
  const staffName = req.staff.name || 'Driver';

  const VALID = ['In-Transit', 'Out for Delivery', 'Delivered', 'Failed'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  try {
    await query('UPDATE shipment SET status = ? WHERE delivery_number = ? AND tenant_id = ?', [status, dn, tid]);

    // Save proof of delivery photo if provided
    if (status === 'Delivered' && proof_photo) {
      try {
        await query('UPDATE shipment SET proof_photo_url = ? WHERE delivery_number = ? AND tenant_id = ?', [proof_photo, dn, tid]);
      } catch(_) { /* column may not exist yet */ }
    }

    const descriptions = {
      'In-Transit':        'Package is in transit. Your package is on its way.',
      'Out for Delivery':  'Package is out for delivery. Your driver is heading to your address.',
      'Delivered':         'Parcel has been delivered. Thank you for using LogistiHub!',
      'Failed':            'Delivery attempt failed. Our team will contact you to reschedule.',
    };

    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dn, tid, status, location || '', descriptions[status] || `Status updated to ${status}`, staffName]
    );

    // Notify customer
    const [ship] = await query('SELECT sender_user_id FROM shipment WHERE delivery_number = ? AND tenant_id = ?', [dn, tid]);
    if (ship[0]?.sender_user_id) {
      await createNotification(
        ship[0].sender_user_id, 'app_user', tid,
        `Shipment ${status}`,
        `Your shipment ${dn} is now ${status}.`,
        'Shipments', dn
      );
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /driver/location/:dn — driver sends live GPS coordinates (called every 10s)
router.put('/driver/location/:dn', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const tid = req.tenantId;
  const dn = req.params.dn;
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required.' });
  try {
    await query(
      `UPDATE shipment SET driver_lat = ?, driver_lng = ?, driver_location_updated_at = NOW()
       WHERE delivery_number = ? AND tenant_id = ? AND assigned_driver_id = ?`,
      [lat, lng, dn, tid, req.staff.staff_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /driver/location]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

router.put('/profile', authMiddleware, async (req, res) => {
  const { phone, first_name, last_name, address } = req.body;
  try {
    if (req.user) {
      await query(
        'UPDATE APP_USER SET phone = ?, first_name = ?, last_name = ?, address = ? WHERE user_id = ? AND tenant_id = ?',
        [phone || null, first_name || null, last_name || null, address || null, req.user.user_id, req.tenantId]
      );
    } else if (req.staff) {
      const name = [first_name, last_name].filter(Boolean).join(' ');
      await query(
        'UPDATE STAFF SET name = ?, phone = ? WHERE staff_id = ? AND tenant_id = ?',
        [name || null, phone || null, req.staff.staff_id, req.tenantId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS BOOK
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/addresses', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Customers only.' });
  try {
    const [rows] = await query(
      'SELECT * FROM SAVED_ADDRESS WHERE user_id = ? AND tenant_id = ? ORDER BY created_at DESC',
      [req.user.user_id, req.tenantId]
    );
    res.json({ addresses: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/addresses', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Customers only.' });
  const { label, full_name, phone, address, city, zip_code } = req.body;
  try {
    const [result] = await query(
      `INSERT INTO SAVED_ADDRESS (user_id, tenant_id, label, full_name, phone, address, city, zip_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, req.tenantId, label || 'Home', full_name || '', phone || '', address || '', city || '', zip_code || '']
    );
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save address.' });
  }
});

router.delete('/addresses/:id', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Customers only.' });
  try {
    await query('DELETE FROM SAVED_ADDRESS WHERE id = ? AND user_id = ? AND tenant_id = ?',
      [req.params.id, req.user.user_id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/notifications', authMiddleware, async (req, res) => {
  const userId = req.user?.user_id || req.staff?.staff_id;
  const userType = req.user ? 'app_user' : 'staff';
  try {
    const [rows] = await query(
      `SELECT * FROM NOTIFICATION WHERE user_id = ? AND user_type = ? AND tenant_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId, userType, req.tenantId]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  const userId = req.user?.user_id || req.staff?.staff_id;
  try {
    await query('UPDATE NOTIFICATION SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMONGO PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════

// Normalize Philippine phone to 10-digit local format (9XXXXXXXXX)
// PayMongo adds its own +63 prefix, so we must NOT include it
function normalizePHPhone(raw) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0'))  digits = digits.slice(1);
  return digits.slice(0, 10);
}

// POST /pay/checkout — create PayMongo checkout session
router.post('/pay/checkout', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Customers only.' });

  const { delivery_number, amount, description } = req.body;

  // Guard: if already Paid, don't create another checkout
  try {
    const [existing] = await query(
      "SELECT invoice_id FROM payment WHERE delivery_number = ? AND tenant_id = ? AND status = 'Paid' LIMIT 1",
      [delivery_number, req.tenantId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'already_paid', message: 'This shipment has already been paid.' });
    }
  } catch (_) {}

  if (!delivery_number || !amount) return res.status(400).json({ error: 'delivery_number and amount required.' });

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Payment gateway not configured.' });

  try {
    // Verify shipment exists and belongs to user
    const [ship] = await query(
      'SELECT * FROM shipment WHERE delivery_number = ? AND tenant_id = ? AND sender_user_id = ? LIMIT 1',
      [delivery_number, req.tenantId, req.user.user_id]
    );
    if (!ship.length) return res.status(404).json({ error: 'Shipment not found.' });

    // Fetch billing info from APP_USER
    const [userRows] = await query(
      'SELECT first_name, last_name, email, phone FROM APP_USER WHERE user_id = ? LIMIT 1',
      [req.user.user_id]
    );
    const userInfo = userRows[0] || {};
    const billingName = [userInfo.first_name, userInfo.last_name].filter(Boolean).join(' ') || 'Customer';
    const billingEmail = userInfo.email || null;
    const billingPhone = userInfo.phone ? normalizePHPhone(userInfo.phone) : '';

    const amountCentavos = Math.round(parseFloat(amount) * 100);
    const slug = req.params.slug;

    const checkoutBody = {
      data: {
        attributes: {
          billing: {
            name: billingName,
            ...(billingEmail && { email: billingEmail }),
            phone: billingPhone || ''
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: description || `Shipment ${delivery_number}`,
          reference_number: delivery_number,
          line_items: [{
            currency: 'PHP',
            amount: amountCentavos,
            name: `Shipment ${delivery_number}`,
            quantity: 1
          }],
          payment_method_types: ['gcash', 'paymaya', 'card', 'dob', 'dob_ubp', 'brankas_bdo', 'brankas_landbank', 'brankas_metrobank'],
          success_url: `https://logistichub.ddns.net/${slug}/api/mobile/pay/success?dn=${delivery_number}`,
          cancel_url:  `https://logistichub.ddns.net/${slug}/api/mobile/pay/cancel?dn=${delivery_number}`,
          metadata: {
            delivery_number,
            tenant_id: req.tenantId.toString(),
            user_id:   req.user.user_id.toString(),
            slug
          }
        }
      }
    };

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64')
      },
      body: JSON.stringify(checkoutBody)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[PayMongo] Checkout error:', JSON.stringify(data?.errors || data));
      const pmErr = data?.errors?.[0]?.detail || 'Payment gateway error.';
      return res.status(500).json({ error: pmErr });
    }

    const checkoutId  = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Create payment record (non-fatal)
    try {
      await query(
        `INSERT INTO payment (delivery_number, tenant_id, total_amount, status, paymongo_checkout_id)
         VALUES (?, ?, ?, 'Pending', ?)`,
        [delivery_number, req.tenantId, amount, checkoutId]
      );
    } catch (dbErr) {
      console.error('[PayMongo] DB insert error (non-fatal):', dbErr.message);
    }

    res.json({ checkout_url: checkoutUrl, checkout_id: checkoutId });
  } catch (err) {
    console.error('[POST /pay/checkout] Unexpected error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create payment.' });
  }
});

// GET /pay/success — redirect after successful payment (marks DB and shows self-closing page)
router.get('/pay/success', async (req, res) => {
  const dn = req.query.dn || '';
  const slug = req.params.slug;

  // Best-effort: mark payment as Paid immediately via DB (webhook backup)
  try {
    await query(
      "UPDATE payment SET status = 'Paid' WHERE delivery_number = ? AND status = 'Pending'",
      [dn]
    );
  } catch (_) {}

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Payment Successful</title>
    <style>body{font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4}h2{color:#16a34a}p{color:#374151}</style>
  </head><body>
    <h2>&#x2705; Payment Successful!</h2>
    <p>Your payment for shipment <b>${dn}</b> has been received.</p>
    <p>You can now close this window and return to the app.</p>
    <script>
      // Auto-close after 2 seconds on mobile
      setTimeout(function() {
        try { window.close(); } catch(e) {}
      }, 2000);
    </script>
  </body></html>`);
});

// GET /pay/cancel — redirect after cancelled/failed/expired payment
router.get('/pay/cancel', async (req, res) => {
  const dn = req.query.dn || '';

  // Mark payment as Failed so it doesn't stay Pending
  if (dn) {
    try {
      await query(
        "UPDATE payment SET status = 'Failed' WHERE delivery_number = ? AND status = 'Pending'",
        [dn]
      );
    } catch (_) {}
  }

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Payment Cancelled</title>
    <style>body{font-family:sans-serif;text-align:center;padding:60px 20px;background:#fef2f2;margin:0}
    h2{color:#dc2626;font-size:22px;margin-bottom:12px}
    p{color:#374151;font-size:15px;line-height:1.6;max-width:400px;margin:0 auto 20px}
    .icon{font-size:48px;margin-bottom:16px}
    .btn{display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:12px;
    text-decoration:none;font-weight:700;font-size:15px;margin-top:8px}</style>
  </head><body>
    <div class="icon">&#x274C;</div>
    <h2>Payment Not Completed</h2>
    <p>Your payment${dn ? ' for shipment <b>' + dn + '</b>' : ''} was cancelled or could not be processed.</p>
    <p style="color:#6b7280;font-size:13px;">You can try again from the app. No charges were made.</p>
    <script>
      // Auto-close after 3 seconds on mobile (Capacitor in-app browser)
      setTimeout(function() {
        try { window.close(); } catch(e) {}
      }, 3000);
    </script>
  </body></html>`);
});

// GET /pay/status/:dn — check payment status
router.get('/pay/status/:dn', authMiddleware, async (req, res) => {
  try {
    // Check for already-Paid record first, then fall back to any Pending record
    // (no ORDER BY — payment table PK column name is unknown; use status filter instead)
    const [paidRows] = await query(
      "SELECT * FROM payment WHERE delivery_number = ? AND tenant_id = ? AND status = 'Paid' LIMIT 1",
      [req.params.dn, req.tenantId]
    );
    if (paidRows.length) {
      return res.json({ status: 'Paid', amount: paidRows[0].total_amount, method: paidRows[0].payment_method });
    }

    const [rows] = await query(
      "SELECT * FROM payment WHERE delivery_number = ? AND tenant_id = ? AND status = 'Pending' LIMIT 1",
      [req.params.dn, req.tenantId]
    );
    if (!rows.length) return res.json({ status: 'none' });

    const payment = rows[0];

    // If still Pending, check with PayMongo API directly
    if (payment.paymongo_checkout_id) {
      const secretKey = process.env.PAYMONGO_SECRET_KEY;
      if (secretKey) {
        try {
          const pmRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${payment.paymongo_checkout_id}`, {
            headers: { 'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64') }
          });
          const pmData = await pmRes.json();
          const attrs = pmData?.data?.attributes || {};
          const pmStatus   = attrs.status;          // 'active', 'expired', etc.
          const pmPayments = attrs.payments || [];

          // A payment is paid when the payments array has an entry with status 'paid'
          const paidPayment = pmPayments.find(p => p?.attributes?.status === 'paid');

          if (paidPayment) {
            const method = paidPayment?.attributes?.source?.type || 'unknown';
            const pmId   = paidPayment?.id || null;

            // Update DB — use delivery_number+tenant_id since PK is invoice_id
            try {
              await query(
                "UPDATE payment SET status = 'Paid', paymongo_payment_id = ?, payment_method = ? WHERE delivery_number = ? AND tenant_id = ?",
                [pmId, method, req.params.dn, req.tenantId]
              );
            } catch (_) {}

            // Notify user
            try {
              const [ship] = await query(
                'SELECT sender_user_id FROM shipment WHERE delivery_number = ? AND tenant_id = ?',
                [req.params.dn, req.tenantId]
              );
              if (ship[0]?.sender_user_id) {
                await createNotification(
                  ship[0].sender_user_id, 'app_user', req.tenantId,
                  'Payment Confirmed',
                  `Payment of \u20B1${payment.total_amount} for ${req.params.dn} confirmed via ${method}.`,
                  'Payments', req.params.dn
                );
              }
            } catch (_) {}

            return res.json({ status: 'Paid', method, amount: payment.total_amount });
          }

          // If checkout expired or failed, mark payment as Failed
          if (pmStatus === 'expired' || pmStatus === 'cancelled') {
            try {
              await query(
                "UPDATE payment SET status = 'Failed' WHERE delivery_number = ? AND tenant_id = ? AND status = 'Pending'",
                [req.params.dn, req.tenantId]
              );
            } catch (_) {}
            return res.json({ status: 'Failed', amount: payment.total_amount });
          }
        } catch (e) {
          console.error('[PayMongo status check]', e.message);
        }
      }
    }

    res.json({ status: payment.status, amount: payment.total_amount, method: payment.payment_method });
  } catch (err) {
    console.error('[GET /pay/status]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMONGO WEBHOOK (mounted globally in server.js — not under /:slug)
// ═══════════════════════════════════════════════════════════════════════════════

// Export the webhook handler separately so server.js can mount it at /api/paymongo-webhook
router.paymongoWebhook = async (req, res) => {
  try {
    const event = req.body?.data;
    if (!event) return res.json({ ok: true });

    const type = event.attributes?.type;
    if (type === 'checkout_session.payment.paid') {
      const checkout = event.attributes?.data;
      const checkoutId = checkout?.id;
      const metadata = checkout?.attributes?.metadata || {};
      const payments = checkout?.attributes?.payments || [];
      const pm = payments[0];
      const method = pm?.data?.attributes?.source?.type || 'unknown';
      const pmId = pm?.data?.id || null;

      if (checkoutId) {
        await query(
          "UPDATE payment SET status = 'Paid', paymongo_payment_id = ?, payment_method = ? WHERE paymongo_checkout_id = ?",
          [pmId, method, checkoutId]
        );

        // Create notification
        if (metadata.user_id && metadata.tenant_id) {
          await createNotification(
            parseInt(metadata.user_id), 'app_user', parseInt(metadata.tenant_id),
            'Payment Confirmed',
            `Your payment for shipment ${metadata.delivery_number || ''} has been confirmed via ${method}.`,
            'Payments', metadata.delivery_number
          );
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[PayMongo Webhook]', err);
    res.json({ ok: true }); // Always 200 to avoid retries
  }
};

module.exports = router;
