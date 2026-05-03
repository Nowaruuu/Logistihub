'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, logAudit } = require('../config/db');
const { sendWelcomeEmail } = require('../config/mailer');

const router = express.Router();

const PLAN_PRICES = { startup: 1499, enterprise: 4999, global: 14999 };

// Normalize Philippine phone to 10-digit local format (9XXXXXXXXX)
// PayMongo adds its own +63 prefix, so we must NOT include it
function normalizePHPhone(raw) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');        // strip non-digits
  if (digits.startsWith('63')) digits = digits.slice(2);  // remove country code 63
  if (digits.startsWith('0'))  digits = digits.slice(1);  // remove leading 0
  return digits.slice(0, 10);                 // max 10 digits
}

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
// POST /api/onboarding/check-email
// Validate if the email prefix is already associated with another Admin workspace
// ─────────────────────────────────────────────────────────────────────────────
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const emailPrefix = email.split('@')[0];
    const [rows] = await query("SELECT staff_id FROM STAFF WHERE role = 'Admin' AND username LIKE ?", [`${emailPrefix}@%`]);
    
    if (rows.length > 0) {
      return res.status(400).json({ error: 'This email is already associated with an existing workspace.' });
    }
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Database check failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/checkout
// Step 2+3 combined: validates payload, creates PayMongo checkout session,
// and returns the checkout URL.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/checkout', async (req, res) => {
  const payload = req.body;
  const { plan, name, email, password, slug, phone } = payload;

  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan.' });
  if (!name || !email || !password || !slug) return res.status(400).json({ error: 'name, email, password, and slug are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!safeSlug) return res.status(400).json({ error: 'Invalid slug.' });

  const [slugCheck] = await query('SELECT tenant_id FROM TENANT WHERE slug = ? LIMIT 1', [safeSlug]);
  if (slugCheck.length > 0) return res.status(409).json({ error: 'Workspace URL is already taken.' });

  // Create token with all payload data
  const checkoutToken = jwt.sign({ type: 'checkout', payload: { ...payload, slug: safeSlug } }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const paymongoSecret = process.env.PAYMONGO_SECRET_KEY;
  const baseUrl = process.env.BASE_URL || 'https://logistichub.ddns.net';
  const successUrl = `${baseUrl}/api/onboarding/paymongo-success?token=${checkoutToken}`;

  if (!paymongoSecret) {
    // If no API key is set, use a mock checkout page
    return res.json({ checkout_url: `${baseUrl}/api/onboarding/mock-paymongo?token=${checkoutToken}` });
  }

  // Real PayMongo Integration
  try {
    const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(paymongoSecret + ':').toString('base64')
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: { email, name, ...(phone && { phone: normalizePHPhone(phone) }) },
            line_items: [{
              amount: PLAN_PRICES[plan] * 100, // converted to cents
              currency: 'PHP',
              description: `Logistics OS - ${plan} Plan Subscription`,
              name: `${plan.toUpperCase()} Plan`,
              quantity: 1
            }],
            payment_method_types: ['card', 'gcash', 'paymaya'],
            success_url: successUrl,
            cancel_url: `${baseUrl}/onboarding`
          }
        }
      })
    });
    
    const pmData = await paymongoRes.json();
    if (!paymongoRes.ok) throw new Error(pmData.errors?.[0]?.detail || 'PayMongo API Error');
    
    res.json({ checkout_url: pmData.data.attributes.checkout_url });
  } catch (err) {
    console.error('PayMongo Error:', err);
    res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/mock-paymongo
// Displays a fake PayMongo page if no API key is configured.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mock-paymongo', (req, res) => {
  const { token } = req.query;
  const baseUrl = process.env.BASE_URL || 'https://logistichub.ddns.net';
  res.send(`
    <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f3f4f6;margin:0;">
      <div style="background:#fff;padding:40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.05);text-align:center;max-width:400px;width:100%;">
        <h2 style="color:#10b981;margin-bottom:10px;">PayMongo Test Mode</h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:30px;">(Simulated checkout because PAYMONGO_SECRET_KEY is not set in .env)</p>
        <button onclick="window.location.href='${baseUrl}/api/onboarding/paymongo-success?token=${token}'" style="background:#0a1628;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
          Simulate Successful Payment
        </button>
      </div>
    </body></html>
  `);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/paymongo-success
// Called after successful payment. Verifies token and creates the tenant.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/paymongo-success', async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'checkout') throw new Error('Invalid token type');
    
    const p = decoded.payload;

    // Check if this tenant was already created (e.g. user refreshed the success page)
    const [existing] = await query('SELECT tenant_id FROM TENANT WHERE slug = ? LIMIT 1', [p.slug]);
    if (existing.length > 0) {
      // Tenant already exists — just redirect to success
      const successToken = jwt.sign({ 
        type: 'setup_success', 
        tenant_id: existing[0].tenant_id, 
        slug: p.slug, 
        plan: p.plan, 
        name: p.name, 
        email: p.email, 
        company: p.company_name 
      }, process.env.JWT_SECRET, { expiresIn: '15m' });
      return res.redirect(`/onboarding?success=true&token=${successToken}`);
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(p.password, saltRounds);

    // ── Insert tenant ──────────────────────────────────
    const [tenantResult] = await query(
      `INSERT INTO TENANT (company_name, slug, plan, status, brand_color, created_at)
       VALUES (?, ?, ?, 'active', ?, NOW())`,
      [p.org_name || p.company_name, p.slug, p.plan, p.brand_color || '#3b82f6']
    );
    const tenantId = tenantResult.insertId;

    // ── Construct Username (@slug.com) ───────────────
    const emailPrefix = p.email.split('@')[0];
    const staffUsername = `${emailPrefix}@${p.slug}.com`;

    // ── Insert admin staff row ─────────────────────────
    await query(
      `INSERT INTO STAFF (tenant_id, name, role, username, password_hash, status, contact_email)
       VALUES (?, ?, 'Admin', ?, ?, 'Available', ?)`,
      [tenantId, p.name, staffUsername, passwordHash, p.email]
    );

    // ── Non-critical: welcome email ─────────────────
    sendWelcomeEmail(p.email, p.name, p.org_name || p.company_name, p.slug, staffUsername).catch(e => console.error('Welcome email error:', e.message));

    // ── Non-critical: subscription payment record ─────
    try {
      const isTest = !process.env.PAYMONGO_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY.startsWith('sk_test_');
      await query(`INSERT INTO SUBSCRIPTION_PAYMENT (tenant_id, plan, amount, currency, status, is_test_mode) VALUES (?, ?, ?, 'PHP', 'paid', ?)`, [tenantId, p.plan, PLAN_PRICES[p.plan], isTest ? 1 : 0]);
    } catch (subErr) {
      console.error('Subscription payment record error (non-fatal):', subErr.message);
    }

    // ── Non-critical: audit log ─────────────────────
    try {
      logAudit({ actor: p.email, actor_type: 'tenant', action: 'TENANT_REGISTERED', target: p.org_name || p.company_name, tenant_slug: p.slug, ip_address: req.ip, metadata: { plan: p.plan, amount: PLAN_PRICES[p.plan] } });
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr.message);
    }

    // Sign a success token so the onboarding UI can show Step 4
    const successToken = jwt.sign({ 
      type: 'setup_success', 
      tenant_id: tenantId, 
      slug: p.slug, 
      plan: p.plan, 
      name: p.name, 
      email: p.email, 
      company: p.company_name 
    }, process.env.JWT_SECRET, { expiresIn: '15m' });

    res.redirect(`/onboarding?success=true&token=${successToken}`);
  } catch (err) {
    console.error('Success handler error:', err.message, err.stack);
    res.redirect('/onboarding?error=Payment+Verification+Failed.+Please+contact+support.+Error:+' + encodeURIComponent(err.message));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/create
// Legacy fallback, you can remove this or keep it just in case.
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

  // ── Validate invite token (Optional) ──
  let invitePayload = null;
  if (invite_token) {
    try {
      invitePayload = jwt.verify(invite_token, process.env.JWT_SECRET);
      if (invitePayload.type !== 'invite') throw new Error();
    } catch {
      return res.status(400).json({ error: 'Invite token is invalid or expired.' });
    }
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

  // ── Insert tenant ──────────────────────────────────
  const [tenantResult] = await query(
    `INSERT INTO TENANT (company_name, slug, plan, status, brand_color, created_at)
     VALUES (?, ?, ?, 'active', ?, NOW())`,
    [org_name || company_name, safeSlug, plan, brand_color || '#3b82f6']
  );
  const tenantId = tenantResult.insertId;

  // ── Construct Username (@slug.com) ───────────────
  const emailPrefix = email.split('@')[0];
  const staffUsername = `${emailPrefix}@${safeSlug}.com`;

  // ── Insert admin staff row ─────────────────────────
  await query(
    `INSERT INTO STAFF (tenant_id, name, role, username, password_hash, status, contact_email)
     VALUES (?, ?, 'Admin', ?, ?, 'Available', ?)`,
    [tenantId, name, staffUsername, passwordHash, email]
  );

  // ── Send welcome email (non-blocking) ─────────────
  sendWelcomeEmail(email, name, org_name || company_name, safeSlug, staffUsername).catch(e =>
    console.error('Welcome mail failed:', e.message)
  );

  res.status(201).json({
    ok: true,
    tenant_id:    tenantId,
    slug:         safeSlug,
    admin_url:    `${process.env.BASE_URL}/${safeSlug}/admin`,
    register_url: `${process.env.BASE_URL}/${safeSlug}/register`,
    plan,
    message: 'Workspace created successfully. Please log in to your new dashboard.',
  });
});

module.exports = router;
