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
    if (payload.role === 'user') {
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
// SHIPMENT ENDPOINTS
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
      // Customer: their own shipments
      [rows] = await query(
        `SELECT * FROM shipment WHERE tenant_id = ? AND sender_user_id = ?
         ORDER BY created_at DESC LIMIT 50`,
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
    dropoff_lat, dropoff_lng, receiver_name, receiver_phone,
    receiver_address, item_type_flag, weight, size,
    shipping_method, total_fee, content_description, estimated_arrival
  } = req.body;

  if (!pickup_location || !dropoff_location) {
    return res.status(400).json({ error: 'Pickup and dropoff locations are required.' });
  }

  const deliveryNumber = generateDeliveryNumber();
  const itemType = item_type_flag || 'PACKAGE';

  try {
    await query(
      `INSERT INTO shipment (
        delivery_number, tenant_id, sender_user_id, pickup_location, dropoff_location,
        pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
        receiver_name, receiver_phone, receiver_address,
        item_type_flag, weight, size, shipping_method, total_fee,
        estimated_arrival, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
      [
        deliveryNumber, tid, userId, pickup_location, dropoff_location,
        pickup_lat || null, pickup_lng || null, dropoff_lat || null, dropoff_lng || null,
        receiver_name || null, receiver_phone || null, receiver_address || null,
        itemType, weight || null, size || null, shipping_method || 'Standard',
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

    // Create shipment history entry
    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, 'Pending', ?, 'Shipment created via mobile app', ?)`,
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
      'SELECT * FROM shipment WHERE delivery_number = ? AND tenant_id = ? LIMIT 1',
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

// GET /deliveries/:dn/track — public tracking (no auth)
router.get('/track/:dn', async (req, res) => {
  const { slug } = req.params;
  const dn = req.params.dn;
  try {
    const [tenants] = await query("SELECT tenant_id FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1", [slug]);
    if (!tenants.length) return res.status(404).json({ error: 'Workspace not found.' });
    const tid = tenants[0].tenant_id;

    const [rows] = await query(
      'SELECT delivery_number, status, pickup_location, dropoff_location, estimated_arrival, created_at FROM shipment WHERE delivery_number = ? AND tenant_id = ? LIMIT 1',
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

// GET /driver/jobs — available pending shipments
router.get('/driver/jobs', authMiddleware, async (req, res) => {
  if (!req.staff) return res.status(403).json({ error: 'Drivers only.' });
  const tid = req.tenantId;
  try {
    const [rows] = await query(
      `SELECT * FROM shipment WHERE tenant_id = ? AND status = 'Pending' AND assigned_driver_id IS NULL
       ORDER BY created_at DESC LIMIT 30`,
      [tid]
    );
    res.json({ jobs: rows });
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

    await query(
      "UPDATE shipment SET assigned_driver_id = ?, status = 'In-Transit' WHERE delivery_number = ? AND tenant_id = ?",
      [staffId, dn, tid]
    );

    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, 'In-Transit', ?, ?, ?)`,
      [dn, tid, rows[0].pickup_location || 'Origin', 'Driver accepted the delivery', staffName]
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
  const { status, location } = req.body;
  const staffName = req.staff.name || 'Driver';

  const VALID = ['In-Transit', 'Out for Delivery', 'Delivered', 'Failed'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  try {
    await query('UPDATE shipment SET status = ? WHERE delivery_number = ? AND tenant_id = ?', [status, dn, tid]);

    await query(
      `INSERT INTO SHIPMENT_HISTORY (delivery_number, tenant_id, status, location, description, actor_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dn, tid, status, location || '', `Status updated to ${status}`, staffName]
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

// POST /pay/checkout — create PayMongo checkout session
router.post('/pay/checkout', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(403).json({ error: 'Customers only.' });

  const { delivery_number, amount, description } = req.body;
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

    const amountCentavos = Math.round(parseFloat(amount) * 100);
    const slug = req.params.slug;

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64')
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: description || `Payment for shipment ${delivery_number}`,
            line_items: [{
              currency: 'PHP',
              amount: amountCentavos,
              name: `Shipment ${delivery_number}`,
              quantity: 1
            }],
            payment_method_types: ['gcash', 'grab_pay', 'paymaya', 'card', 'dob', 'dob_ubp', 'brankas_bdo', 'brankas_landbank', 'brankas_metrobank'],
            success_url: `https://logistichub.ddns.net/${slug}/api/mobile/pay/success?dn=${delivery_number}`,
            cancel_url: `https://logistichub.ddns.net/${slug}/api/mobile/pay/cancel?dn=${delivery_number}`,
            metadata: {
              delivery_number,
              tenant_id: req.tenantId.toString(),
              user_id: req.user.user_id.toString(),
              slug
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[PayMongo] Checkout error:', JSON.stringify(data?.errors || data));
      const pmErr = data?.errors?.[0]?.detail || 'Payment gateway error.';
      return res.status(500).json({ error: pmErr });
    }

    const checkoutId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Create payment record (non-fatal — checkout URL is the primary deliverable)
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

// GET /pay/success — redirect after successful payment
router.get('/pay/success', (req, res) => {
  res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
    <h2 style="color:#16a34a;">✅ Payment Successful!</h2>
    <p>Your payment for shipment <b>${req.query.dn || ''}</b> has been received.</p>
    <p>You can close this window and return to the app.</p>
  </body></html>`);
});

// GET /pay/cancel — redirect after cancelled payment
router.get('/pay/cancel', (req, res) => {
  res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
    <h2 style="color:#dc2626;">Payment Cancelled</h2>
    <p>Your payment was not completed. You can try again from the app.</p>
  </body></html>`);
});

// GET /pay/status/:dn — check payment status
router.get('/pay/status/:dn', authMiddleware, async (req, res) => {
  try {
    const [rows] = await query(
      'SELECT * FROM payment WHERE delivery_number = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.dn, req.tenantId]
    );
    if (!rows.length) return res.json({ status: 'none' });

    const payment = rows[0];

    // If pending and has checkout_id, check with PayMongo
    if (payment.status === 'Pending' && payment.paymongo_checkout_id) {
      const secretKey = process.env.PAYMONGO_SECRET_KEY;
      if (secretKey) {
        try {
          const pmRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${payment.paymongo_checkout_id}`, {
            headers: { 'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64') }
          });
          const pmData = await pmRes.json();
          const pmStatus = pmData?.data?.attributes?.status;
          const pmPayments = pmData?.data?.attributes?.payments || [];

          if (pmStatus === 'active' && pmPayments.length > 0) {
            const pm = pmPayments[0];
            const method = pm?.data?.attributes?.source?.type || 'unknown';
            const pmId = pm?.data?.id || null;

            await query(
              "UPDATE payment SET status = 'Paid', paymongo_payment_id = ?, payment_method = ?, paid_at = NOW() WHERE id = ?",
              [pmId, method, payment.id]
            );

            // Notify
            const [ship] = await query('SELECT sender_user_id FROM shipment WHERE delivery_number = ? AND tenant_id = ?', [req.params.dn, req.tenantId]);
            if (ship[0]?.sender_user_id) {
              await createNotification(ship[0].sender_user_id, 'app_user', req.tenantId,
                'Payment Confirmed', `Payment of ₱${payment.total_amount} for ${req.params.dn} confirmed.`,
                'Payments', req.params.dn);
            }

            return res.json({ status: 'Paid', method, amount: payment.total_amount });
          }
        } catch (e) {
          console.error('[PayMongo status check]', e.message);
        }
      }
    }

    res.json({ status: payment.status, amount: payment.total_amount, method: payment.payment_method });
  } catch (err) {
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
          "UPDATE payment SET status = 'Paid', paymongo_payment_id = ?, payment_method = ?, paid_at = NOW() WHERE paymongo_checkout_id = ?",
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
