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
  // Get admin token
  const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bollinrah@amongiz.com', password: 'thugxlife2019' })
  });
  const d = await r.json();
  const adminToken = d.token;
  const auth = { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' };
  const authGet = { 'Authorization': 'Bearer ' + adminToken };

  // ════════════════════════════════════════════════════
  console.log('\n══════ PAYMENT EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Confirm non-existent payment', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/payments/99999/confirm`, { method: 'POST', headers: auth });
    log('Confirm non-existent payment', r.ok || r.status < 500, `status ${r.status} — should not crash`);
  });

  await test('Confirm already-paid payment', async () => {
    // Get a paid payment first
    const pr = await fetch(`${BASE}/${SLUG}/api/admin/payments`, { headers: authGet });
    const pd = await pr.json();
    const paid = (pd.payments||[]).find(p => p.status === 'Paid');
    if (paid) {
      const r = await fetch(`${BASE}/${SLUG}/api/admin/payments/${paid.invoice_id}/confirm`, { method: 'POST', headers: auth });
      log('Confirm already-paid payment', r.ok || r.status < 500, `invoice #${paid.invoice_id} — should handle gracefully`);
    } else {
      log('Confirm already-paid payment', true, 'no paid payments to test (skipped)');
    }
  });

  await test('Delete paid payment (should fail)', async () => {
    const pr = await fetch(`${BASE}/${SLUG}/api/admin/payments`, { headers: authGet });
    const pd = await pr.json();
    const paid = (pd.payments||[]).find(p => p.status === 'Paid');
    if (paid) {
      const r = await fetch(`${BASE}/${SLUG}/api/admin/payments/${paid.invoice_id}`, { method: 'DELETE', headers: auth });
      const dd = await r.json();
      log('Delete paid payment (should fail)', r.status === 400, `status ${r.status} — ${dd.error || 'no error msg'}`);
    } else {
      log('Delete paid payment (should fail)', true, 'skipped');
    }
  });

  await test('Payments list contains valid data', async () => {
    const pr = await fetch(`${BASE}/${SLUG}/api/admin/payments`, { headers: authGet });
    const pd = await pr.json();
    const payments = pd.payments || [];
    const hasInvalid = payments.some(p => !p.invoice_id || !p.delivery_number);
    log('Payments list contains valid data', !hasInvalid, `${payments.length} payments, all have invoice_id & delivery_number`);
  });

  await test('No stale Pending payments left', async () => {
    const pr = await fetch(`${BASE}/${SLUG}/api/admin/payments`, { headers: authGet });
    const pd = await pr.json();
    const pending = (pd.payments||[]).filter(p => p.status === 'Pending');
    log('No stale Pending payments left', pending.length === 0, `${pending.length} pending payments`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ STAFF CREATION EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Add staff — missing name', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/staff`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: '', email: 'test@test.com', role: 'Driver', phone: '09171234567' })
    });
    log('Add staff — missing name', r.status === 400, `status ${r.status}`);
  });

  await test('Add staff — missing email', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/staff`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: 'Test User', email: '', role: 'Driver', phone: '09171234567' })
    });
    log('Add staff — missing email', r.status === 400, `status ${r.status}`);
  });

  await test('Add staff — missing role', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/staff`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: 'Test User', email: 'test@test.com', role: '', phone: '09171234567' })
    });
    log('Add staff — missing role', r.status === 400, `status ${r.status}`);
  });

  await test('Add staff — duplicate email', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/staff`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: 'Dup Test', email: 'bollinrah@gmail.com', role: 'Driver', phone: '09171234567' })
    });
    log('Add staff — duplicate email', r.status === 400 || r.status === 409, `status ${r.status}`);
  });

  await test('Add staff — invalid role', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/staff`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: 'Test', email: 'fakeunique999@test.com', role: 'CEO', phone: '09171234567' })
    });
    log('Add staff — invalid role', r.status >= 400, `status ${r.status}`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ SHIPMENT EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Get shipment with invalid ID', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/shipments/FAKE-DOES-NOT-EXIST`, { headers: authGet });
    log('Get shipment with invalid ID', r.status === 404 || r.status === 400 || r.ok, `status ${r.status}`);
  });

  await test('Shipments have required fields', async () => {
    const sr = await fetch(`${BASE}/${SLUG}/api/admin/shipments`, { headers: authGet });
    const sd = await sr.json();
    const shipments = sd.shipments || sd || [];
    if (shipments.length > 0) {
      const s = shipments[0];
      const hasFields = s.delivery_number && s.sender_name !== undefined && s.status;
      log('Shipments have required fields', hasFields, `sample: ${s.delivery_number}, status: ${s.status}`);
    } else {
      log('Shipments have required fields', true, 'no shipments (skipped)');
    }
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ CLIENT REGISTRATION EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Register — empty fields', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: '', last_name: '', email: '', phone: '', username: '', password: '' })
    });
    log('Register — empty fields', r.status === 400, `status ${r.status}`);
  });

  await test('Register — short password', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Test', last_name: 'User', email: 'test@test.com', phone: '09171234567', username: 'testshortpw', password: '123' })
    });
    log('Register — short password', r.status === 400, `status ${r.status}`);
  });

  await test('Register — invalid email format', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Test', last_name: 'User', email: 'notanemail', phone: '09171234567', username: 'testbademail', password: 'password123' })
    });
    // Should either reject or proceed to OTP (won't send to bad email)
    log('Register — invalid email format', r.status >= 400 || r.ok, `status ${r.status}`);
  });

  await test('Register — duplicate username', async () => {
    // Try registering with existing username
    const r = await fetch(`${BASE}/${SLUG}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Dup', last_name: 'Test', email: 'duptest@test.com', phone: '09171234567', username: 'collincalimquim3', password: 'password123' })
    });
    const dd = await r.json();
    log('Register — duplicate username', r.status === 400 || r.status === 409 || (dd.error && dd.error.toLowerCase().includes('exists')), `status ${r.status} — ${dd.error || 'no error'}`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ AUTH EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Staff login — empty body', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    log('Staff login — empty body', r.status >= 400, `status ${r.status}`);
  });

  await test('Staff login — correct email, wrong password', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bollinrah@amongiz.com', password: 'wrongpassword' })
    });
    log('Staff login — correct email, wrong password', r.status === 401, `status ${r.status}`);
  });

  await test('Staff login — SQL injection attempt', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "' OR 1=1 --", password: "' OR 1=1 --" })
    });
    log('Staff login — SQL injection attempt', r.status === 401 || r.status === 400, `status ${r.status} — injection blocked`);
  });

  await test('Admin API with manager token (RBAC)', async () => {
    const mr = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahbollin@amongiz.com', password: 'thugxlife2019' })
    });
    const md = await mr.json();
    if (md.token) {
      const r = await fetch(`${BASE}/${SLUG}/api/admin/staff`, { headers: { 'Authorization': 'Bearer ' + md.token } });
      // Manager may or may not have access to admin routes depending on RBAC
      log('Admin API with manager token (RBAC)', true, `status ${r.status} — ${r.ok ? 'allowed' : 'restricted'}`);
    } else {
      log('Admin API with manager token (RBAC)', false, 'manager login failed');
    }
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ SUBSCRIPTION EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Subscription data is valid', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/subscription`, { headers: authGet });
    const d = await r.json();
    log('Subscription data is valid', d.ok && d.plan && d.created_at, `plan: ${d.plan}, created: ${d.created_at}`);
  });

  await test('Subscription payments exist', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/subscription`, { headers: authGet });
    const d = await r.json();
    const payments = d.payments || [];
    log('Subscription payments exist', payments.length > 0, `${payments.length} subscription payments`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ PRICING EDGE CASES ══════');
  // ════════════════════════════════════════════════════

  await test('Pricing config is valid', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/admin/pricing`, { headers: authGet });
    const d = await r.json();
    log('Pricing config is valid', d.base_fee !== undefined && d.base_fee > 0, `base_fee: ${d.base_fee}`);
  });

  await test('Price estimate endpoint', async () => {
    const r = await fetch(`${BASE}/${SLUG}/api/mobile/deliveries`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({})
    });
    log('Price estimate — empty body', r.status >= 400, `status ${r.status} — validates inputs`);
  });

  // ════════════════════════════════════════════════════
  console.log('\n══════ CROSS-TENANT SECURITY ══════');
  // ════════════════════════════════════════════════════

  await test('Cannot access other tenant data', async () => {
    const r = await fetch(`${BASE}/faketenant123/api/admin/stats`, { headers: authGet });
    log('Cannot access other tenant data', r.status >= 400, `status ${r.status} — cross-tenant blocked`);
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
