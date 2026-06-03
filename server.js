'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const { sendSuspensionEmail } = require('./config/mailer');

// ─── Route modules ────────────────────────────────────────────────────────────
const pagesRouter      = require('./routes/pages');
const superadminRouter = require('./routes/superadmin');
const onboardingRouter = require('./routes/onboarding');
const adminRouter      = require('./routes/admin');
const userRouter       = require('./routes/user');
const mobileRouter     = require('./routes/mobile');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS — in production lock this down to your real domain
app.use(cors({
  origin:      process.env.NODE_ENV === 'production'
                 ? process.env.BASE_URL
                 : true,
  credentials: true,
}));

// Serve uploaded files / public assets
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max:      10,                // max 10 login attempts per IP per 15 min
  message:  { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      20,
  message:  { error: 'Too many requests. Please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      30,
  message:  { error: 'Too many registration attempts.' },
});

// Apply rate limiters to sensitive endpoints
app.use('/api/superadmin/login',     authLimiter);
app.use('/api/onboarding',           inviteLimiter);
app.use(/^\/.+\/api\/admin\/login$/, authLimiter);
app.use(/^\/.+\/api\/register$/,     registerLimiter);
app.use(/^\/.+\/api\/login$/,        authLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY HEADERS (basic — use helmet in production for more)
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────


// Public platform settings (no auth — used by landing page)
const fs = require('fs');
const platformFile = require('path').join(__dirname, 'config/platform.json');
app.get('/api/platform', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(platformFile, 'utf8'))); }
  catch { res.json({ platform_name: 'LogistiHub', primary_color: '#3b82f6' }); }
});

// Superadmin API  →  /api/superadmin/...
app.use('/api/superadmin', superadminRouter);

// Onboarding API  →  /api/onboarding/...
app.use('/api/onboarding', onboardingRouter);

// Tenant admin API  →  /:slug/api/admin/...
app.use('/', adminRouter);

// User/app API  →  /:slug/api/...
app.use('/:slug/api', userRouter);

// Mobile API  →  /:slug/api/mobile/...
app.use('/:slug/api/mobile', mobileRouter);

// PayMongo Webhook (global — not under /:slug)
if (mobileRouter.paymongoWebhook) {
  app.post('/api/paymongo-webhook', mobileRouter.paymongoWebhook);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ROUTES (serve HTML files)
// Must come AFTER API routes so /:slug doesn't swallow API calls
// ─────────────────────────────────────────────────────────────────────────────
app.use('/', pagesRouter);

// ─────────────────────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  res.status(404).send(`
    <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
      <h2 style="color:#0f2235;">404 — Page not found</h2>
      <p style="color:#64748b;">The page you're looking for doesn't exist.</p>
    </body></html>
  `);
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);

  // Don't leak stack traces in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred.'
    : err.message;

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: message });
  }
  res.status(500).send(`<p>Server error: ${message}</p>`);
});

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

// Handle malformed URL params (prevents URIError crash)
app.use((err, req, res, next) => {
  if (err instanceof URIError) return res.status(400).send('Bad Request');
  next(err);
});

app.listen(PORT, async () => {
  console.log(`\n🚀  Logistics OS backend running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Env:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB:      ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);

  // Ensure schema columns exist
  try {
    const { query } = require('./config/db');
    try { await query('ALTER TABLE shipment ADD COLUMN vehicle_type VARCHAR(50) DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE shipment ADD COLUMN sender_name VARCHAR(255) DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE shipment ADD COLUMN sender_phone VARCHAR(20) DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE vehicle ADD COLUMN image_url LONGTEXT DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE vehicle MODIFY COLUMN image_url LONGTEXT'); } catch(_) {}
    try { await query('ALTER TABLE vehicle ADD COLUMN ownership_type VARCHAR(20) DEFAULT "company"'); } catch(_) {}
    try { await query('ALTER TABLE TENANT ADD COLUMN pricing_config JSON DEFAULT NULL'); } catch(_) {}
    // Ensure photo columns are LONGTEXT (base64 images are large)
    try { await query('ALTER TABLE shipment MODIFY COLUMN proof_photo_url LONGTEXT DEFAULT NULL'); } catch(_) {}
    try { await query('ALTER TABLE shipment MODIFY COLUMN pickup_photo_url LONGTEXT DEFAULT NULL'); } catch(_) {}

    // Backfill distance_km for existing shipments that have lat/lng but no distance
    try {
      const [needDist] = await query(
        `SELECT delivery_number, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
         FROM shipment WHERE distance_km IS NULL AND pickup_lat IS NOT NULL AND dropoff_lat IS NOT NULL`
      );
      if (needDist && needDist.length) {
        for (const s of needDist) {
          const R = 6371;
          const dLat = (s.dropoff_lat - s.pickup_lat) * Math.PI / 180;
          const dLon = (s.dropoff_lng - s.pickup_lng) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(s.pickup_lat*Math.PI/180)*Math.cos(s.dropoff_lat*Math.PI/180)*Math.sin(dLon/2)**2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const km = Math.round(dist * 10) / 10;
          await query('UPDATE shipment SET distance_km = ? WHERE delivery_number = ?', [km, s.delivery_number]);
        }
        console.log(`   ✅ Backfilled distance_km for ${needDist.length} shipments`);
      }
    } catch(e) { console.error('Distance backfill error:', e.message); }

    // ── Cleanup: Remove bogus ₱50 test payments from failed PayMongo checkouts ──
    try {
      const [deleted] = await query(
        "DELETE FROM payment WHERE total_amount <= 50 AND status = 'Paid' AND payment_type IN ('full','deposit')"
      );
      if (deleted.affectedRows > 0) {
        console.log(`   🧹 Cleaned up ${deleted.affectedRows} bogus ₱50 test payment(s)`);
      }
    } catch(e) { /* table may not exist yet */ }

    console.log('   ✅ Schema columns verified');

    // ── Subscription Billing Enforcement ─────────────────────────────
    // Runs on startup and then every hour
    async function checkSubscriptionBilling() {
      try {
        // Ensure suspension columns exist
        try { await query('ALTER TABLE TENANT ADD COLUMN suspended_at DATETIME DEFAULT NULL'); } catch(_) {}
        try { await query('ALTER TABLE TENANT ADD COLUMN suspension_reason VARCHAR(255) DEFAULT NULL'); } catch(_) {}

        // Get all active tenants with a paid plan
        const [tenants] = await query(
          "SELECT tenant_id, slug, plan, created_at, status FROM TENANT WHERE status = 'active' AND plan IS NOT NULL AND plan != 'free'"
        );

        const now = new Date();
        for (const t of tenants) {
          const planKey = (t.plan || '').toLowerCase();
          if (!planKey || planKey === 'free') continue;

          const created = new Date(t.created_at);
          let cycleStart = new Date(created);
          let cycleEnd = new Date(cycleStart);
          cycleEnd.setMonth(cycleEnd.getMonth() + 1);
          while (cycleEnd <= now) {
            cycleStart = new Date(cycleEnd);
            cycleEnd = new Date(cycleStart);
            cycleEnd.setMonth(cycleEnd.getMonth() + 1);
          }

          const firstCycleEnd = new Date(created);
          firstCycleEnd.setMonth(firstCycleEnd.getMonth() + 1);
          if (cycleStart.getTime() < firstCycleEnd.getTime()) continue;

          const csDate = cycleStart.toISOString().split('T')[0];
          const ceDate = cycleEnd.toISOString().split('T')[0];
          const [payments] = await query(
            "SELECT COUNT(*) AS cnt FROM SUBSCRIPTION_PAYMENT WHERE tenant_id = ? AND status = 'paid' AND created_at >= ? AND created_at < ?",
            [t.tenant_id, csDate, ceDate]
          );
          if (payments[0].cnt > 0) continue;

          const cycleStartDate = new Date(csDate);
          const todayDate = new Date(now.toISOString().split('T')[0]);
          const daysOverdue = Math.floor((todayDate - cycleStartDate) / (1000 * 60 * 60 * 24));

          if (daysOverdue >= 3) {
            try {
              await query("UPDATE TENANT SET status = 'suspended', suspended_at = NOW(), suspension_reason = 'Subscription payment overdue' WHERE tenant_id = ? AND status = 'active'", [t.tenant_id]);
            } catch (colErr) {
              await query("UPDATE TENANT SET status = 'suspended' WHERE tenant_id = ? AND status = 'active'", [t.tenant_id]);
            }
            console.log(`   ⚠️  Suspended tenant ${t.slug} (${daysOverdue} days overdue)`);

            // Send suspension email to tenant admin
            try {
              const PLAN_MAP = { startup: { label: 'Padala', price: 1499 }, enterprise: { label: 'Negosyo', price: 4999 }, global: { label: 'Korporasyon', price: 14999 } };
              const planInfo = PLAN_MAP[planKey] || PLAN_MAP['startup'];
              const [[adminRow]] = await query(
                "SELECT s.name, s.contact_email, s.username FROM STAFF s WHERE s.tenant_id = ? AND s.role = 'Admin' LIMIT 1",
                [t.tenant_id]
              );
              if (adminRow) {
                const adminEmail = adminRow.contact_email || adminRow.username;
                const [[tenantRow]] = await query('SELECT company_name FROM TENANT WHERE tenant_id = ?', [t.tenant_id]);
                if (adminEmail) {
                  await sendSuspensionEmail(adminEmail, adminRow.name || 'Admin', tenantRow?.company_name || t.slug, t.slug, planInfo.label, planInfo.price);
                  console.log(`   📧 Suspension email sent to ${adminEmail} (${t.slug})`);
                }
              }
            } catch (emailErr) {
              console.error(`   [EMAIL] Failed to send suspension email for ${t.slug}:`, emailErr.message);
            }
          }
        }
      } catch (err) {
        console.error('   Billing check error:', err.message);
      }
    }

    // Run immediately on startup
    await checkSubscriptionBilling();
    console.log('   ✅ Subscription billing checked');

    // Then run every hour
    setInterval(checkSubscriptionBilling, 60 * 60 * 1000);

  } catch (e) { console.error('Cleanup error:', e.message); }
});

module.exports = app;
