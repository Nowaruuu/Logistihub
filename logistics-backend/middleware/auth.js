'use strict';

const jwt = require('jsonwebtoken');
const { getTenantById } = require('../config/db');

// ─── Superadmin Auth ──────────────────────────────────────────────────────────
function requireSuperadmin(req, res, next) {
  const token = req.cookies?.sa_token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Superadmin authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.SUPERADMIN_JWT_SECRET);
    if (payload.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    req.superadmin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// ─── Tenant Admin Auth ────────────────────────────────────────────────────────
async function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin' && payload.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    // Verify tenant still exists and is active
    const tenant = await getTenantById(payload.tenant_id);
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ error: 'Workspace is inactive or does not exist.' });
    }

    req.admin   = payload;
    req.tenant  = tenant;
    req.tenantId = tenant.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// ─── Tenant Slug Isolation Guard ─────────────────────────────────────────────
// Ensures the JWT tenant matches the :slug in the URL.
// Prevents admin of "kyoob" from calling "/elmo-delivery/api/..."
function requireSlugMatch(req, res, next) {
  const urlSlug     = req.params.slug;
  const tokenSlug   = req.admin?.slug || req.tenant?.slug;

  if (!urlSlug || !tokenSlug) {
    return res.status(400).json({ error: 'Slug mismatch check failed.' });
  }
  if (urlSlug !== tokenSlug) {
    return res.status(403).json({ error: 'Access denied: tenant slug mismatch.' });
  }
  next();
}

// ─── App User Auth (driver / field staff) ────────────────────────────────────
async function requireUser(req, res, next) {
  const token = req.cookies?.user_token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'user') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    req.user     = payload;
    req.tenantId = payload.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// ─── Staff Auth (driver / field staff) ───────────────────────────────────────
async function requireStaff(req, res, next) {
  const token = req.cookies?.staff_token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Staff authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.staff    = payload;
    req.tenantId = payload.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

module.exports = { requireSuperadmin, requireAdmin, requireSlugMatch, requireUser, requireStaff };
