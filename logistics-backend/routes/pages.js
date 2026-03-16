'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
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

// Root → superadmin login
router.get('/', (req, res) => res.redirect('/superadmin-login'));

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
  const html = readView('user-register.html');
  res.send(injectTenantData(html, tenant));
});

router.get('/:slug/staff-login', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug, res);
  if (!tenant) return;
  const html = readView('staff-login.html');
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