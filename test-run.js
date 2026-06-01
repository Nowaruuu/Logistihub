const BASE = 'https://logistichub.ddns.net';
const SLUG = 'amongiz';
let passed = 0, failed = 0, results = [];

function log(label, ok, detail) {
  const status = ok ? '✅ PASS' : '❌ FAIL';
  if (ok) passed++; else failed++;
  results.push({ label, status, detail });
  console.log(`  ${status} | ${label}${detail ? ' — ' + detail : ''}`);
}

async function test(label, fn) {
  try { await fn(); } catch (e) { log(label, false, e.message); }
}

async function run() {
  // ════════════════════════════════════════════════════
  console.log('\n══════ WEB: PAGE LOADS ══════');
  // ════════════════════════════════════════════════════

  for (const [name, path] of [
    ['Landing page', '/'],
    ['Superadmin page', '/superadmin'],
    ['Staff login page', `/${SLUG}/staff-login`],
    ['Admin dashboard', `/${SLUG}/admin`],
    ['Client register', `/${SLUG}/register`],
    ['Get-app page', `/${SLUG}/get-app`],
    ['DC dashboard', `/${SLUG}/dc-dashboard`],
    ['Manager dashboard', `/${SLUG}/manager-dashboard`],
  ]) {
    await test(name, async () => {
      const r = await fetch(BASE + path);
      log(name, r.ok, `status ${r.status}`);
    });
  }

  // ════════════════════════════════════════════════════
  console.log('\n══════ WEB: ADMIN AUTH & APIs ══════');
  // ════════════════════════════════════════════════════

  let adminToken = null;
  await test('Admin login', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bollinrah@amongiz.com', password: 'thugxlife2019' })
    });
    const d = await r.json();
    adminToken = d.token;
    log('Admin login', r.ok && !!d.token, `role: ${d.role}`);
  });

  const auth = () => ({ 'Authorization': 'Bearer ' + adminToken });

  const adminEndpoints = [
    ['Stats', '/admin/stats'],
    ['Shipments', '/admin/shipments'],
    ['Staff', '/admin/staff'],
    ['Payments', '/admin/payments'],
    ['Subscription', '/admin/subscription'],
    ['Vehicle requests', '/admin/vehicle-requests'],
    ['Pricing', '/admin/pricing'],
    ['App users', '/admin/app-users'],
    ['Recent logins', '/admin/recent-logins'],
    ['Audit logs', '/admin/audit-logs'],
    ['Sales report', '/admin/sales-report'],
  ];

  for (const [name, path] of adminEndpoints) {
    await test(`Admin GET ${name}`, async () => {
      const r = await fetch(`${BASE}/${SLUG}/api${path}`, { headers: auth() });
      const d = await r.json();
      log(`Admin GET ${name}`, r.ok, `status ${r.status}`);
    });
  }

  // ════════════════════════════════════════════════════
  console.log('\n══════ WEB: SUPERADMIN ══════');
  // ════════════════════════════════════════════════════

  let saToken = null;
  await test('Superadmin login', async () => {
    const r = await fetch(`${BASE}/api/superadmin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nowaru@logistihub.com', password: 'superadmin6767' })
    });
    const d = await r.json();
    saToken = d.token;
    log('Superadmin login', r.ok && !!d.token, `ok:${d.ok || r.ok}, role:${d.role}`);
  });

  if (saToken) {
    await test('Superadmin GET /tenants', async () => {
      const r = await fetch(`${BASE}/api/superadmin/tenants`, { headers: { 'Authorization': 'Bearer ' + saToken } });
      const d = await r.json();
      const count = Array.isArray(d) ? d.length : (d.tenants||[]).length;
      log('Superadmin GET /tenants', r.ok, `${count} tenants`);
    });
  }

  // ════════════════════════════════════════════════════
  console.log('\n══════ WEB: STAFF ROLES ══════');
  // ════════════════════════════════════════════════════

  await test('Manager login', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahbollin@amongiz.com', password: 'thugxlife2019' })
    });
    const d = await r.json();
    log('Manager login', r.ok && d.role === 'Manager', `role: ${d.role}`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ MOBILE: DRIVER LOGIN & API ══════');
  // ════════════════════════════════════════════════════

  let driverToken = null;
  await test('Driver login (via /login)', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'collincalimquim3@amongiz.com', password: 'thugxlife2019' })
    });
    const d = await r.json();
    driverToken = d.token;
    log('Driver login (via /login)', r.ok && !!d.token, `role: ${d.role}, name: ${d.name||'-'}`);
  });

  if (!driverToken) {
    // Try staff-login as fallback
    await test('Driver login (via /staff-login)', async () => {
      const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'collincalimquim3@amongiz.com', password: 'thugxlife2019' })
      });
      const d = await r.json();
      driverToken = d.token;
      log('Driver login (via /staff-login)', r.ok && !!d.token, `role: ${d.role}`);
    });
  }

  if (driverToken) {
    const dAuth = { 'Authorization': 'Bearer ' + driverToken };

    const driverEndpoints = [
      ['Tenant config', '/mobile/tenant-config'],
      ['Deliveries', '/mobile/deliveries'],
      ['Driver documents', '/mobile/driver/documents'],
      ['Driver vehicle', '/mobile/driver/vehicle'],
      ['Driver fleet', '/mobile/driver/fleet-vehicles'],
      ['Driver vehicle requests', '/mobile/driver/vehicle-requests'],
      ['Driver earnings', '/mobile/driver/earnings'],
    ];

    for (const [name, path] of driverEndpoints) {
      await test(`Driver ${name}`, async () => {
        const r = await fetch(`${BASE}/${SLUG}/api${path}`, { headers: dAuth });
        log(`Driver ${name}`, r.ok || r.status === 200, `status ${r.status}`);
      });
    }
  }

  // ════════════════════════════════════════════════════
  console.log('\n══════ MOBILE: CLIENT REGISTRATION ══════');
  // ════════════════════════════════════════════════════

  await test('Register endpoint (validation)', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: '', last_name: '', email: '', phone: '', username: '', password: '' })
    });
    log('Register endpoint (validation)', r.status === 400, `status ${r.status} — validation error expected`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ EDGE CASES & SECURITY ══════');
  // ════════════════════════════════════════════════════

  await test('Invalid login → 401', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@wrong.com', password: 'wrong' })
    });
    log('Invalid login → 401', r.status === 401, `status ${r.status}`);
  });

  await test('No auth → 401', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/stats`);
    log('No auth → 401', r.status === 401 || r.status === 403, `status ${r.status}`);
  });

  await test('Fake tenant → error', async () => {
    const r = await fetch(`${BASE}/fakeslug999/staff-login`);
    log('Fake tenant → error', r.status >= 400, `status ${r.status}`);
  });

  await test('Expired/bad token → rejected', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/stats`, { headers: { 'Authorization': 'Bearer faketoken123' } });
    log('Expired/bad token → rejected', r.status === 401 || r.status === 403, `status ${r.status}`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('══════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => r.status.includes('FAIL')).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
  }
}

run().catch(e => console.error('Test runner error:', e));
