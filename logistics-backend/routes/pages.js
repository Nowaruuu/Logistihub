'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { query } = require('../config/db');

const router = express.Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function injectTenantData(html, tenantData) {
  const script = `<script>
window.__TENANT__ = ${JSON.stringify({
    tenant_id:        tenantData.tenant_id,
    company_name:     tenantData.company_name,
    slug:             tenantData.slug,
    plan:             tenantData.plan,
    brand_color:      tenantData.brand_color || '#3b82f6',
    logo_url:         tenantData.logo_url || '',
    bg_app_color:     tenantData.bg_app_color || '#f1f5f9',
    bg_sidebar_color: tenantData.bg_sidebar_color || '#0f2235',
    background_url:   tenantData.background_url || ''
  })};
</script>
<style>
  :root { 
    --primary: ${tenantData.brand_color || '#3b82f6'} !important;
    --sidebar-bg: ${tenantData.bg_sidebar_color || '#0f2235'} !important;
    --app-bg: ${tenantData.bg_app_color || '#f1f5f9'} !important;
  }
</style>`;
  
  return html.replace('</head>', script + '\n</head>');
}

function readView(filename) {
    // FIXED: Now looks inside the views folder correctly
    return fs.readFileSync(path.join(__dirname, '../views/', filename), 'utf-8');
}

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
    return rows[0]; // FIXED: Added missing return
  } catch (err) {
    console.error("Tenant Resolution Error:", err);
    res.status(500).send("Internal Server Error");
    return null;
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/superadmin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin-login.html'));
});

router.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/superadmin.html'));
});

router.get('/onboarding', (req, res) => {
  const { invite } = req.query;
  if (!invite) return res.status(400).send('<h2>Invalid Link</h2>');
  res.sendFile(path.join(__dirname, '../views/admin-onboarding.html'));
});

router.get('/:slug/admin', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('admin-dashboard.html'), tenant));
});

router.get('/:slug/login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('login.html'), tenant));
});

router.get('/:slug/admin-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('admin-login.html'), tenant));
});
router.get('/:slug/staff-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('staff-login.html'), tenant));
});
router.get('/:slug/dc-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('dc-dashboard.html'), tenant));
});
router.get('/:slug/manager-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('manager-dashboard.html'), tenant));
});
router.get('/:slug/register', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('client-register.html'), tenant));
});
router.get('/:slug/get-app', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('get-app.html'), tenant));
});

router.get('/:slug', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('tenant-landing.html'), tenant));
});
module.exports = router;
