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
    tenant_id:          tenantData.tenant_id,
    company_name:       tenantData.company_name,
    slug:               tenantData.slug,
    plan:               tenantData.plan,
    status:             tenantData.status,
    suspension_reason:  tenantData.suspension_reason || '',
    brand_color:        tenantData.brand_color || '#3b82f6',
    logo_url:           tenantData.logo_url || '',
    bg_app_color:       tenantData.bg_app_color || '#f1f5f9',
    bg_sidebar_color:   tenantData.bg_sidebar_color || '#0f2235',
    background_url:     tenantData.background_url || '',
    bg_hero_color:      tenantData.bg_hero_color || '',
    bg_page_color:      tenantData.bg_page_color || ''
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

async function resolveTenant(slug, res, opts = {}) {
  try {
    // Also load suspended tenants so we can show payment page
    const [rows] = await query(
      "SELECT * FROM TENANT WHERE slug = ? AND status IN ('active', 'suspended') LIMIT 1",
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
    const tenant = rows[0];

    // If tenant is suspended, serve the appropriate suspension page
    if (tenant.status === 'suspended' && !opts.allowSuspended) {
      const view = opts.suspendedView === 'admin' ? 'suspended.html' : 'suspended-public.html';
      res.status(403).send(injectTenantData(readView(view), tenant));
      return null;
    }

    return tenant;
  } catch (err) {
    console.error("Tenant Resolution Error:", err);
    const loginLink = slug ? `/${slug}/admin-login` : '/';
    res.status(503).send(`
      <html>
        <head>
          <title>Service Unavailable — LogistiHub</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
        </head>
        <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:'Segoe UI',sans-serif;">
          <div style="text-align:center;max-width:420px;padding:40px 24px;">
            <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
            <h2 style="color:#0f2235;font-size:22px;font-weight:800;margin:0 0 10px;">Temporarily Unavailable</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px;">
              We couldn't connect to the service right now.<br>
              This is usually a temporary issue — please try again in a moment.
            </p>
            <a href="${loginLink}" style="display:inline-block;background:#0f2235;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
              ← Back to Login
            </a>
            <p style="margin-top:20px;font-size:12px;color:#94a3b8;">
              If this persists, contact your system administrator.
            </p>
          </div>
        </body>
      </html>
    `);
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
  res.sendFile(path.join(__dirname, '../views/admin-onboarding.html'));
});

router.get('/:slug/admin', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { suspendedView: 'admin' });
  if (!tenant) return;
  res.send(injectTenantData(readView('admin-dashboard.html'), tenant));
});

router.get('/:slug/login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  res.send(injectTenantData(readView('login.html'), tenant));
});

router.get('/:slug/admin-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
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
