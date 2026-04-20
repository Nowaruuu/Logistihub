// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS TO: logistics-backend/routes/user.js (or pages.js)
//
// This endpoint is called by the mobile app to:
//   1) Verify a slug is valid before showing the login screen
//   2) Load tenant branding (company name, plan, etc.) for the mobile UI
// ─────────────────────────────────────────────────────────────────────────────

// GET /:slug/api/tenant-info  (PUBLIC — no auth required)
router.get('/:slug/api/tenant-info', async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await db.query(
      'SELECT tenant_id, company_name, business_type, slug, plan, status FROM TENANT WHERE slug = ? AND status = "active" LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).json({ message: 'Workspace not found.' });
    res.json({ tenant: rows[0] });
  } catch (err) {
    console.error('tenant-info error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// ALSO ADD: GET /:slug/api/me  — returns logged-in user's profile
// (needs requireUser middleware from auth.js)
// ─────────────────────────────────────────────────────────────────────────────

// GET /:slug/api/me  (PROTECTED)
router.get('/:slug/api/me', requireUser, async (req, res) => {
  try {
    const userId = req.user.user_id; // set by requireUser middleware
    const [rows] = await db.query(
      `SELECT user_id, tenant_id, first_name, last_name, email, phone, address, status, created_at
       FROM APP_USER WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// ALSO VERIFY: POST /:slug/api/login — should return { token, user }
// ALSO VERIFY: POST /:slug/api/register — should return { token, user }
// ALSO VERIFY: POST /:slug/api/logout — clears session/token
//
// The mobile app expects both login and register to return:
//   { token: "jwt_string", user: { user_id, first_name, last_name, email, ... } }
// ─────────────────────────────────────────────────────────────────────────────
