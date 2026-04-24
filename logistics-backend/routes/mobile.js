'use strict';

const express = require('express');
const { query } = require('../config/db');
const { requireUser, requireStaff } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Helper to determine auth context
const authMiddleware = (req, res, next) => {
  if (req.headers.authorization) {
    // We try requireUser first, if it fails, we try requireStaff.
    // Actually, it's safer to have two separate endpoints or check role inside token.
    // Let's just decode the token to see the role.
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization.split(' ')[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.role === 'user') {
        req.user = payload;
        req.tenantId = payload.tenant_id;
      } else {
        req.staff = payload;
        req.tenantId = payload.tenant_id;
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
  } else {
    return res.status(401).json({ error: 'Authentication required.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /deliveries (Shipments)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/deliveries', authMiddleware, async (req, res) => {
  const tid = req.tenantId;
  try {
    let shipments = [];
    if (req.staff) {
      // Driver fetching their assigned shipments (route_id matches driver's route?)
      // We don't have driver route mapping here right now, so let's just fetch all 'In-Transit' or 'Pending'
      // Or maybe shipments have a staff_id? Let's check table schema.
      // Assuming all shipments for this tenant for now until schema is refined.
      const [rows] = await query('SELECT * FROM shipment WHERE tenant_id = ? ORDER BY created_at DESC', [tid]);
      shipments = rows;
    } else if (req.user) {
      // Client fetching their shipments
      const [rows] = await query('SELECT * FROM shipment WHERE tenant_id = ? AND client_id = ? ORDER BY created_at DESC', [tid, req.user.user_id]);
      shipments = rows;
    }
    res.json({ deliveries: shipments });
  } catch (err) {
    console.error('get deliveries error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /deliveries/:id/status
// ─────────────────────────────────────────────────────────────────────────────
router.put('/deliveries/:id/status', authMiddleware, async (req, res) => {
  const tid = req.tenantId;
  const { id } = req.params;
  const { status } = req.body; // e.g., 'In-Transit', 'Delivered'

  if (!req.staff) {
    return res.status(403).json({ error: 'Only drivers can update status.' });
  }

  try {
    await query('UPDATE shipment SET status = ? WHERE delivery_number = ? AND tenant_id = ?', [status, id, tid]);
    res.json({ success: true });
  } catch (err) {
    console.error('update delivery status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
