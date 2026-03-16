'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { query } = require('../config/db');

const router = express.Router();

function injectTenantData(html, tenantData) {
  const script = `<script>
window.__TENANT__ = ${JSON.stringify({
    tenant_id:    tenantData.tenant_id,
    company_name: tenantData.company_name,
    slug:         tenantData.slug,
    plan:         tenantData.plan,
  })};
</script>`;
  return html.replace('</head>', script + '\n</head>');
}

function readView(filename) {
  return fs.readFileSync(path.join(__dirname, '../views', filename), 'utf-8');
}

function requireSuperadminPage(req, res, next) {
  const token = req.cookies && req.cookies.sa_token;
  if (!token) { return res.redirect('/superadmin-login'); }
  try {
    jwt.verify(token, process.env.SUPERADMIN_JWT_SECRET);
    next();
  } catch (e) {
    return res.redirect('/superadmin-login');
  }
}

// Root → superadmin login or registration landing
router.get('/', (req, res) => {
  if (req.isRegistrationSubdomain) {
    return res.send(readView('client-register.html'));
  }
  res.redirect('/superadmin-login');
});
// Login page
router.get('/superadmin-login', (req, res) => {
  const token = req.cookies && req.cookies.sa_token;
  try {
    if (token) { jwt.verify(token, process.env.SUPERADMIN_JWT_SECRET); return res.redirect('/superadmin'); }
  } catch (e) {}
  res.sendFile(path.join(__dirname, '../views/superadmin-login.html'));
});

// Dashboard — protected
router.get('/superadmin', requireSuperadminPage, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin.html'));
});

// Onboarding
router.get('/admin-onboarding', (req, res) => {
  const { invite } = req.query;
  if (!invite) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Invalid Link</h2>
        <p>This onboarding link is missing an invitation token.</p>
      </body></html>
    `);
  }
  res.sendFile(path.join(__dirname, '../views/admin-onboarding.html'));
});


// Tenant pages
router.get('/:slug/admin', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('admin-dashboard.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/register', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('client-register.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/staff-registration', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('user-register.html');
  res.send(injectTenantData(html, tenant));
});

// User/Client Registration (General)
router.get('/register', (req, res) => {
  // Serving client-registration only if on registration subdomain
  const html = readView('client-register.html');
  res.send(html);
});

router.get('/:slug/staff-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-login.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/driver-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('driver-dashboard.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/dc-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('dc-dashboard.html');
  res.send(injectTenantData(html, tenant));
});


// POST /:slug/api/staff-login
router.post('/:slug/api/staff-login', async (req, res) => {
  const { slug } = req.params;
  const { email, password } = req.body;

  const [tenants] = await query(
    "SELECT tenant_id, status FROM TENANT WHERE slug = ? LIMIT 1",
    [slug]
  );
  if (!tenants.length || tenants[0].status !== 'active') {
    return res.status(404).json({ error: 'Workspace not found.' });
  }
  const tenantId = tenants[0].tenant_id;

  const [rows] = await query(
    "SELECT * FROM STAFF WHERE tenant_id = ? AND username = ? AND status = 'Available' LIMIT 1",
    [tenantId, email]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });

  const staff = rows[0];
  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { role: staff.role, staff_id: staff.staff_id, tenant_id: tenantId, slug, name: staff.name, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.cookie('staff_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000,
  });

  res.json({ ok: true, name: staff.name, role: staff.role, slug });
});

router.get('/:slug/admin-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('admin-login.html');
  res.send(injectTenantData(html, tenant));
});
async function resolveTenant(slug, res) {
  const [rows] = await query(
    "SELECT * FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1",
    [slug]
  );
  if (!rows.length) {
    res.status(404).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2 style="color:#0f2235;">Workspace not found</h2>
        <p style="color:#64748b;">The workspace you're looking for doesn't exist or has been deactivated.</p>
      </body></html>
    `);
    return null;
  }
  return rows[0];
}

module.exports = router;