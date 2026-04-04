'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { sendWelcomeEmail } = require('../config/mailer');

const router = express.Router();

const PLAN_PRICES = { startup: 99, enterprise: 499, global: 999 };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/verify-invite?invite=<token>
// Called by the frontend to validate the invite token before showing plans
// ─────────────────────────────────────────────────────────────────────────────
router.get('/verify-invite', (req, res) => {
  const { invite } = req.query;
  if (!invite) return res.status(400).json({ error: 'Missing invite token.' });

  try {
    const payload = jwt.verify(invite, process.env.JWT_SECRET);
    if (payload.type !== 'invite') {
      return res.status(400).json({ error: 'Invalid invite token.' });
    }
    res.json({
      ok:           true,
      email:        payload.email,
      company_name: payload.company_name,
    });
  } catch {
    res.status(400).json({ error: 'Invite link is invalid or has expired (48-hour limit).' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/create
// Step 2+3 combined: create the TENANT row, the admin STAFF row, and the
// workspace. Called after plan selection + account form + customize form.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create', async (req, res) => {
  const {
    invite_token,   // original invite JWT
    plan,           // startup | enterprise | global
    // Admin account
    name,
    email,
    company_name,
    phone,
    password,
    // Customize
    org_name,
    slug,
    tagline,
    brand_color,
  } = req.body;

  // ── Validate invite token ──
  if (!invite_token) return res.status(400).json({ error: 'Missing invite token.' });
  let invitePayload;
  try {
    invitePayload = jwt.verify(invite_token, process.env.JWT_SECRET);
    if (invitePayload.type !== 'invite') throw new Error();
  } catch {
    return res.status(400).json({ error: 'Invite token is invalid or expired.' });
  }

  // ── Validate plan ──
  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ error: 'Invalid plan. Choose startup, enterprise, or global.' });
  }

  // ── Validate required fields ──
  if (!name || !email || !password || !slug) {
    return res.status(400).json({ error: 'name, email, password, and slug are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // ── Slug: lowercase, alphanumeric + hyphens only ──
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!safeSlug) return res.status(400).json({ error: 'Invalid slug.' });

  // ── Check slug uniqueness ──
  const [slugCheck] = await query('SELECT tenant_id FROM TENANT WHERE slug = ? LIMIT 1', [safeSlug]);
  if (slugCheck.length > 0) {
    return res.status(409).json({ error: 'That workspace URL is already taken. Choose a different one.' });
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // ── Insert TENANT ──────────────────────────────────
  const [tenantResult] = await query(
    `INSERT INTO TENANT (company_name, slug, plan, status, created_at)
     VALUES (?, ?, ?, 'active', NOW())`,
    [org_name || company_name, safeSlug, plan]
  );
  const tenantId = tenantResult.insertId;

  // ── Insert admin STAFF row ─────────────────────────
  await query(
    `INSERT INTO STAFF (tenant_id, name, role, username, password_hash, status)
     VALUES (?, ?, 'Admin', ?, ?, 'Available')`,
    [tenantId, name, email, passwordHash]
  );

  // ── Build JWT for immediate login ──────────────────
  const adminToken = jwt.sign(
    {
      role:      'admin',
      tenant_id: tenantId,
      slug:      safeSlug,
      name,
      email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  // ── Set auth cookie ────────────────────────────────
  res.cookie('admin_token', adminToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000,
  });

  // ── Send welcome email (non-blocking) ─────────────
  sendWelcomeEmail(email, name, org_name || company_name, safeSlug).catch(e =>
    console.error('Welcome mail failed:', e.message)
  );

  res.status(201).json({
    ok: true,
    tenant_id:    tenantId,
    slug:         safeSlug,
    admin_url:    `${process.env.BASE_URL}/${safeSlug}/admin`,
    register_url: `${process.env.BASE_URL}/${safeSlug}/register`,
    plan,
    message: 'Workspace created successfully.',
  });
});

module.exports = router;
