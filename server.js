'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

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

    console.log('   ✅ Schema columns verified');
  } catch (e) { console.error('Cleanup error:', e.message); }
});

module.exports = app;
