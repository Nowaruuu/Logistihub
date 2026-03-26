'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { query } = require('../config/db');

const router = express.Router();

// Helper to read an HTML file and inject tenant data as a window global
// This replaces the placeholder 'Your Company' etc. with real values server-side
function injectTenantData(html, tenantData) {
  const script = `<script>
window.__TENANT__ = ${JSON.stringify({
    tenant_id:    tenantData.tenant_id,
    company_name: tenantData.company_name,
    slug:         tenantData.slug,
    plan:         tenantData.plan,
  })};
</script>`;
  // Inject just before </head>
  return html.replace('</head>', script + '\n</head>');
}

function readView(filename) {
  return fs.readFileSync(path.join(__dirname, '../views', filename), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERADMIN pages
// ─────────────────────────────────────────────────────────────────────────────

router.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin.html'));
});

router.get('/superadmin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin-login.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING (invite → subscribe → create account → customize)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/onboarding', (req, res) => {
  // Must have a valid ?invite= token — server validates before serving page
  const { invite } = req.query;
  if (!invite) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Invalid Link</h2>
        <p>This onboarding link is missing an invitation token. Please use the link from your invitation email.</p>
      </body></html>
    `);
  }
  res.sendFile(path.join(__dirname, '../views/admin-onboarding.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT-SCOPED PAGES
// These resolve the tenant from the slug, verify it exists and is active,
// then serve the correct HTML with tenant data injected.
// ─────────────────────────────────────────────────────────────────────────────

// GET /:slug/admin  — admin dashboard
router.get('/:slug/admin', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;

  const html = readView('admin-dashboard.html');
  res.send(injectTenantData(html, tenant));
});

// GET /:slug/register  — user registration page (ONLY exists if tenant is active)
router.get('/:slug/register', async (req, res) => {
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

router.get('/:slug/login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('login.html');
  res.send(injectTenantData(html, tenant));
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

// GET /:slug/get-app — branded app download page
router.get('/:slug/get-app', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('get-app.html');
  res.send(injectTenantData(html, tenant));
});

// (Moved to user.js)

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
