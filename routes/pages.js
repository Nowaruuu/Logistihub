'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { query } = require('../config/db');

const router = express.Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Inject tenant data into the HTML so the frontend knows the Slug/Company Name
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

// ─── SUPERADMIN PAGES ────────────────────────────────────────────────────────

router.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin.html'));
});

router.get('/superadmin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin-login.html'));
});

// ─── ONBOARDING ──────────────────────────────────────────────────────────────

router.get('/onboarding', (req, res) => {
  const { invite } = req.query;
  if (!invite) {
    return res.status(400).send('<h2>Invalid Link</h2><p>Invitation token missing.</p>');
  }
  res.sendFile(path.join(__dirname, '../views/admin-onboarding.html'));
});

// ─── TENANT PAGES (STAFF & ADMIN) ────────────────────────────────────────────

// Staff Registration (FIXED 404)
router.get('/:slug/staff-registration', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-register.html');
  res.send(injectTenantData(html, tenant));
});

// Staff Login
router.get('/:slug/staff-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-login.html');
  res.send(injectTenantData(html, tenant));
});

// Admin Dashboard
router.get('/:slug/admin', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('admin-dashboard.html');
  res.send(injectTenantData(html, tenant));
});

// Admin Login
router.get('/:slug/admin-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('admin-login.html');
  res.send(injectTenantData(html, tenant));
});

// ─── TENANT PAGES (USER / CUSTOMER) ──────────────────────────────────────────

// User Registration (FIXED SWAP ISSUE)
router.get('/:slug/register', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('user-register.html');
  res.send(injectTenantData(html, tenant));
});

// User Login
router.get('/:slug/login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('login.html');
  res.send(injectTenantData(html, tenant));
});

// ─── ADDITIONAL DASHBOARDS ───────────────────────────────────────────────────

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

router.get('/:slug/get-app', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('get-app.html');
  res.send(injectTenantData(html, tenant));
});

module.exports = router;