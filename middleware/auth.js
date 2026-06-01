'use strict';

const jwt = require('jsonwebtoken');
const { getTenantById, logAudit } = require('../config/db');

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
  const token = req.cookies?.[`admin_token_${req.params.slug}`] || req.cookies?.manager_token || req.cookies?.[`staff_token_${req.params.slug}`] || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const validRoles = ['admin', 'Admin', 'Manager', 'Document Controller'];
    if (!validRoles.includes(payload.role)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    // Verify tenant still exists and is active (or suspended — admin can still pay)
    const tenant = await getTenantById(payload.tenant_id);
    if (!tenant || (tenant.status !== 'active' && tenant.status !== 'suspended')) {
      return res.status(403).json({ error: 'Workspace is inactive or does not exist.' });
    }

    // Real-time subscription enforcement: auto-suspend if overdue >= 3 days
    if (tenant.status === 'active' && tenant.plan && tenant.plan !== 'free') {
      try {
        const { query: dbQuery } = require('../config/db');
        const created = new Date(tenant.created_at);
        const now = new Date();
        console.log(`[AUTH-BILLING] Tenant ${tenant.slug}: plan=${tenant.plan}, created=${created.toISOString()}, now=${now.toISOString()}`);
        let cycleStart = new Date(created);
        let cycleEnd = new Date(cycleStart);
        cycleEnd.setMonth(cycleEnd.getMonth() + 1);
        while (cycleEnd <= now) {
          cycleStart = new Date(cycleEnd);
          cycleEnd = new Date(cycleStart);
          cycleEnd.setMonth(cycleEnd.getMonth() + 1);
        }
        console.log(`[AUTH-BILLING] Tenant ${tenant.slug}: cycleStart=${cycleStart.toISOString()}, cycleEnd=${cycleEnd.toISOString()}`);
        // Skip first billing cycle (covered by initial payment)
        const firstCycleEnd = new Date(created);
        firstCycleEnd.setMonth(firstCycleEnd.getMonth() + 1);
        console.log(`[AUTH-BILLING] Tenant ${tenant.slug}: firstCycleEnd=${firstCycleEnd.toISOString()}, skip=${cycleStart.getTime() < firstCycleEnd.getTime()}`);
        if (cycleStart.getTime() >= firstCycleEnd.getTime()) {
          const csDate = cycleStart.toISOString().split('T')[0];
          const ceDate = cycleEnd.toISOString().split('T')[0];
          const [pmts] = await dbQuery(
            "SELECT COUNT(*) AS cnt FROM SUBSCRIPTION_PAYMENT WHERE tenant_id = ? AND status = 'paid' AND created_at >= ? AND created_at < ?",
            [tenant.tenant_id, csDate, ceDate]
          );
          console.log(`[AUTH-BILLING] Tenant ${tenant.slug}: payments in cycle [${csDate}, ${ceDate}) = ${pmts[0].cnt}`);
          if (pmts[0].cnt === 0) {
            const cycleStartDate = new Date(csDate);
            const todayDate = new Date(now.toISOString().split('T')[0]);
            const daysOverdue = Math.floor((todayDate - cycleStartDate) / (1000 * 60 * 60 * 24));
            console.log(`[AUTH-BILLING] Tenant ${tenant.slug}: daysOverdue=${daysOverdue}`);
            if (daysOverdue >= 3) {
              console.log(`[AUTH-BILLING] ⛔ SUSPENDING tenant ${tenant.slug} NOW!`);
              // Use simple UPDATE (suspended_at column may not exist yet)
              try {
                await dbQuery(
                  "UPDATE TENANT SET status = 'suspended', suspended_at = NOW(), suspension_reason = 'Subscription payment overdue' WHERE tenant_id = ? AND status = 'active'",
                  [tenant.tenant_id]
                );
              } catch (colErr) {
                // Fallback: columns don't exist, just update status
                console.log(`[AUTH-BILLING] Fallback UPDATE (no suspended_at column): ${colErr.message}`);
                await dbQuery(
                  "UPDATE TENANT SET status = 'suspended' WHERE tenant_id = ? AND status = 'active'",
                  [tenant.tenant_id]
                );
              }
              tenant.status = 'suspended';
              console.log(`[AUTH-BILLING] ✅ Tenant ${tenant.slug} is now SUSPENDED`);
            }
          }
        }
      } catch (billingErr) {
        console.error('[AUTH-BILLING] ❌ ERROR:', billingErr.message, billingErr.stack);
      }
    }

    req.admin   = payload;
    req.tenant  = tenant;
    req.tenantId = tenant.tenant_id;
    next();
  } catch {
    try { const d = jwt.decode(token); if (d) logAudit({ actor: d.email || d.name || 'unknown', actor_type: 'admin', action: 'SESSION_EXPIRED', target: 'Admin Dashboard', tenant_slug: d.slug || req.params.slug || 'unknown', ip_address: req.ip }); } catch (_) {}
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
  const token = req.cookies?.[`staff_token_${req.params.slug}`] || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Staff authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.staff    = payload;
    req.tenantId = payload.tenant_id;
    next();
  } catch {
    try { const d = jwt.decode(token); if (d) logAudit({ actor: d.email || d.name || 'unknown', actor_type: 'staff', action: 'SESSION_EXPIRED', target: 'Staff Session', tenant_slug: d.slug || req.params.slug || 'unknown', ip_address: req.ip }); } catch (_) {}
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// ─── Manager Auth ─────────────────────────────────────────────────────────────
async function requireManager(req, res, next) {
  // Accept both admin_token (admin also has access) and manager_token
  const token = req.cookies?.manager_token || req.cookies?.[`admin_token_${req.params.slug}`] || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Manager authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'Admin', 'manager', 'Manager'].includes(payload.role)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const tenant = await getTenantById(payload.tenant_id);
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ error: 'Workspace is inactive.' });
    }
    req.manager  = payload;
    req.admin    = payload; // alias so requireSlugMatch works
    req.tenant   = tenant;
    req.tenantId = tenant.tenant_id;
    next();
  } catch {
    try { const d = jwt.decode(token); if (d) logAudit({ actor: d.email || d.name || 'unknown', actor_type: 'manager', action: 'SESSION_EXPIRED', target: 'Admin Dashboard', tenant_slug: d.slug || req.params.slug || 'unknown', ip_address: req.ip }); } catch (_) {}
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireSuperadmin, requireAdmin, requireSlugMatch, requireUser, requireStaff, requireManager };

