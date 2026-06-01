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
    status:           tenantData.status,
    brand_color:      tenantData.brand_color || '#3b82f6',
    logo_url:         tenantData.logo_url || '',
    bg_app_color:     tenantData.bg_app_color || '#f1f5f9',
    bg_sidebar_color: tenantData.bg_sidebar_color || '#0f2235',
    background_url:   tenantData.background_url || '',
    bg_hero_color:    tenantData.bg_hero_color || '',
    bg_page_color:    tenantData.bg_page_color || ''
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

    // If tenant is suspended for non-payment, show payment-required page
    // (allow login page and API routes to still work)
    if (tenant.status === 'suspended' && !opts.allowSuspended) {
      res.status(403).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Suspended</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
        <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);}
        .card{background:#fff;border-radius:24px;padding:48px 40px;text-align:center;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
        .ico{width:72px;height:72px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;}
        .material-symbols-outlined{font-variation-settings:'FILL' 1;}
        h1{font-size:24px;font-weight:800;color:#0f172a;margin-bottom:10px;}p{font-size:14px;color:#64748b;line-height:1.7;margin-bottom:24px;}
        .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;transition:all .15s;cursor:pointer;border:none;font-family:inherit;}
        .btn-pay{background:#ea580c;color:#fff;box-shadow:0 4px 16px rgba(234,88,12,0.3);}.btn-pay:hover{background:#dc2626;}
        .btn-login{background:#f1f5f9;color:#0f172a;margin-left:8px;}.btn-login:hover{background:#e2e8f0;}
        .company{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:20px;}
        </style></head><body><div class="card">
        <div class="company">${tenant.company_name || slug}</div>
        <div class="ico"><span class="material-symbols-outlined" style="font-size:36px;color:#ef4444;">block</span></div>
        <h1>Account Suspended</h1>
        <p>Your workspace has been suspended due to an overdue subscription payment.<br>Please pay your outstanding balance to restore access.</p>
        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
          <a href="/${slug}/admin-login" class="btn btn-login"><span class="material-symbols-outlined" style="font-size:18px;">login</span>Admin Login</a>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#94a3b8;">Contact support if you believe this is an error.</p>
        </div></body></html>`);
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
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
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
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
  if (!tenant) return;
  res.send(injectTenantData(readView('staff-login.html'), tenant));
});
router.get('/:slug/dc-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
  if (!tenant) return;
  res.send(injectTenantData(readView('dc-dashboard.html'), tenant));
});
router.get('/:slug/manager-dashboard', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
  if (!tenant) return;
  res.send(injectTenantData(readView('manager-dashboard.html'), tenant));
});
router.get('/:slug/register', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
  if (!tenant) return;
  res.send(injectTenantData(readView('client-register.html'), tenant));
});
router.get('/:slug/get-app', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
  if (!tenant) return;
  res.send(injectTenantData(readView('get-app.html'), tenant));
});

router.get('/:slug', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res, { allowSuspended: true });
  if (!tenant) return;
  res.send(injectTenantData(readView('tenant-landing.html'), tenant));
});
module.exports = router;
