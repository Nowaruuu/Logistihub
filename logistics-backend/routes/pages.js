'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { query } = require('../config/db');

const router = express.Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Injects tenant-specific configuration into the HTML head
 */
function injectTenantData(html, tenantData) {
  const script = `<script>
window.__TENANT__ = ${JSON.stringify({
    tenant_id:    tenantData.tenant_id,
    company_name: tenantData.company_name,
    slug:         tenantData.slug,
    plan:         tenantData.plan,
    brand_color:  tenantData.brand_color || '#3b82f6',
    logo_url:     tenantData.logo_url || ''
  })};
</script>
<style>
  :root { --primary: ${tenantData.brand_color || '#3b82f6'} !important; }
</style>`;
  
  return html.replace('</head>', script + '\n</head>');
}

/**
 * Reads HTML files from the root directory (based on your EC2 file structure)
 */
function readView(filename) {
    // If your logs show views/views/, it means __dirname is already inside a views context or your join is redundant.
    return fs.readFileSync(path.join(__dirname, '../', filename), 'utf-8');
}

/**
 * Database lookup for active tenants
 */
async function resolveTenant(slug, res) {
  try {
    const [rows] = await query(
      "SELECT * FROM TENANT WHERE slug = ? AND status = 'active' LIMIT 1",
      [slug]
    );
    if (!rows || !rows.length) {
      res.status(404).send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2 style="color:#0f2235;">Workspace not found</h2>
          <p style="color:#64748b;">The workspace you're looking for doesn't exist.</p>
        </body></html>
      `);
      return null;
    }
    return rows[0];
  } catch (err) {
    console.error("Tenant Resolution Error:", err);
    res.status(500).send("Internal Server Error");
    return null;
  }
}

// ─── SUPERADMIN PAGES ────────────────────────────────────────────────────────

router.get('/superadmin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin-login.html'));
});

router.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin.html'));
});
// ─── ONBOARDING ──────────────────────────────────────────────────────────────

router.get('/onboarding', (req, res) => {
  const { invite } = req.query;
  if (!invite) return res.status(400).send('<h2>Invalid Link</h2>');
  res.sendFile(path.join(__dirname, '../admin-onboarding.html'));
});

// ─── STAFF ROUTES ────────────────────────────────────────────────────────────

router.get('/:slug/staff-registration', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-register.html'); 
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/staff-register', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-login.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/staff-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-login.html');
  res.send(injectTenantData(html, tenant));
});

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

router.get('/:slug/admin-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('admin-login.html'), tenant));
});

router.get('/:slug/admin', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('admin-dashboard.html'), tenant));
});

// ─── USER / CLIENT ROUTES ────────────────────────────────────────────────────

router.get('/:slug/register', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('client-register.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('login.html');
  res.send(injectTenantData(html, tenant));
});

// ─── DASHBOARDS ──────────────────────────────────────────────────────────────

router.get('/:slug/driver-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('driver-dashboard.html'), tenant));
});

router.get('/:slug/dc-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('dc-dashboard.html'), tenant));
});

// ─── APP DOWNLOAD ────────────────────────────────────────────────────────────

router.get('/:slug/get-app', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  
  try {
    const html = readView('get-app.html');
    res.send(injectTenantData(html, tenant));
  } catch (err) {
    res.status(404).send("get-app.html file missing in root folder.");
  }
});

module.exports = router;