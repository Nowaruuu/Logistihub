const BASE = 'https://logistichub.ddns.net';
const SLUG = 'amongiz';
let passed = 0, failed = 0, results = [];

// Fetch with 15s timeout
async function F(url, opts = {}) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 30000);
  try { return await fetch(url, { ...opts, signal: c.signal }); }
  finally { clearTimeout(timer); }
}

function log(cat, label, ok, detail) {
  const s = ok ? '✅' : '❌';
  if (ok) passed++; else failed++;
  results.push({ cat, label, ok, detail });
  console.log(`  ${s} ${label} — ${detail}`);
}

async function t(cat, label, fn) {
  try { await fn(); } catch (e) {
    const msg = e.name === 'AbortError' ? 'TIMEOUT (15s)' : e.message;
    log(cat, label, false, msg);
  }
}

async function run() {
  let adminToken, managerToken;

  // ═══ 1. PAGE LOADS ═══
  console.log('\n══ 1. PAGE LOADS ══');
  for (const [name, path] of [
    ['Landing', '/'], ['Superadmin', '/superadmin'], ['Staff Login', `/${SLUG}/staff-login`],
    ['Admin Dashboard', `/${SLUG}/admin`], ['DC Dashboard', `/${SLUG}/dc-dashboard`],
    ['Manager Dashboard', `/${SLUG}/manager-dashboard`], ['Client Register', `/${SLUG}/register`],
    ['Get App', `/${SLUG}/get-app`],
  ]) {
    await t('PAGES', name, async () => {
      const r = await F(BASE + path);
      log('PAGES', name, r.ok, `${r.status}`);
    });
  }

  // ═══ 2. AUTHENTICATION ═══
  console.log('\n══ 2. AUTHENTICATION ══');
  
  await t('AUTH', 'Admin login', async () => {
    const r = await F(`${BASE}/${SLUG}/api/staff-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'bollinrah@amongiz.com',password:'thugxlife2019'}) });
    const d = await r.json(); adminToken = d.token;
    log('AUTH', 'Admin login', r.ok && !!d.token, `role:${d.role}`);
  });

  await t('AUTH', 'Manager login', async () => {
    const r = await F(`${BASE}/${SLUG}/api/staff-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'rahbollin@amongiz.com',password:'thugxlife2019'}) });
    const d = await r.json(); managerToken = d.token;
    log('AUTH', 'Manager login', r.ok && d.role==='Manager', `role:${d.role}`);
  });

  await t('AUTH', 'Superadmin login', async () => {
    const r = await F(`${BASE}/api/superadmin/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'nowaru@logistihub.com',password:'superadmin6767'}) });
    const d = await r.json();
    log('AUTH', 'Superadmin login', r.ok && d.ok, `role:${d.role}`);
  });

  await t('AUTH', 'Wrong password → 401', async () => {
    const r = await F(`${BASE}/${SLUG}/api/staff-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'bollinrah@amongiz.com',password:'WRONG'}) });
    log('AUTH', 'Wrong password → 401', r.status===401, `${r.status}`);
  });

  await t('AUTH', 'Nonexistent user → 401', async () => {
    const r = await F(`${BASE}/${SLUG}/api/staff-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'nobody@x.com',password:'x'}) });
    log('AUTH', 'Nonexistent user → 401', r.status===401, `${r.status}`);
  });

  await t('AUTH', 'Empty body → error', async () => {
    const r = await F(`${BASE}/${SLUG}/api/staff-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
    log('AUTH', 'Empty body → error', r.status>=400, `${r.status}`);
  });

  await t('AUTH', 'SQL injection blocked', async () => {
    const r = await F(`${BASE}/${SLUG}/api/staff-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:"' OR 1=1 --",password:"' OR 1=1 --"}) });
    log('AUTH', 'SQL injection blocked', r.status===401, `${r.status}`);
  });

  await t('AUTH', 'No token → 401', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/stats`);
    log('AUTH', 'No token → 401', r.status===401||r.status===403, `${r.status}`);
  });

  await t('AUTH', 'Bad token → 401', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/stats`, { headers:{'Authorization':'Bearer fake.bad.token'} });
    log('AUTH', 'Bad token → 401', r.status===401||r.status===403, `${r.status}`);
  });

  await t('AUTH', 'Fake tenant → 404', async () => {
    const r = await F(`${BASE}/fakeslug999/staff-login`);
    log('AUTH', 'Fake tenant → 404', r.status===404, `${r.status}`);
  });

  const H = { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' };
  const G = { 'Authorization': 'Bearer ' + adminToken };

  // ═══ 3. ADMIN APIS ═══
  console.log('\n══ 3. ADMIN API ENDPOINTS ══');
  for (const [name, path] of [
    ['Stats','/admin/stats'], ['Shipments','/admin/shipments'], ['Staff','/admin/staff'],
    ['Payments','/admin/payments'], ['Subscription','/admin/subscription'],
    ['Vehicle requests','/admin/vehicle-requests'], ['Pricing','/admin/pricing'],
    ['App users','/admin/app-users'], ['Recent logins','/admin/recent-logins'],
    ['Audit logs','/admin/audit-logs'], ['Sales report','/admin/sales-report'],
  ]) {
    await t('ADMIN', name, async () => {
      const r = await F(`${BASE}/${SLUG}/api${path}`, {headers:G});
      log('ADMIN', name, r.ok, `${r.status}`);
    });
  }

  // ═══ 4. PAYMENT EDGE CASES ═══
  console.log('\n══ 4. PAYMENT EDGE CASES ══');

  await t('PAY', 'No stale Pending payments', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/payments`, {headers:G});
    const d = await r.json();
    const pending = (d.payments||[]).filter(p => p.status === 'Pending');
    log('PAY', 'No stale Pending payments', pending.length===0, `${pending.length} pending`);
  });

  await t('PAY', 'All payments valid', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/payments`, {headers:G});
    const d = await r.json();
    const bad = (d.payments||[]).filter(p => !p.invoice_id || !p.delivery_number);
    log('PAY', 'All payments valid', bad.length===0, `${(d.payments||[]).length} total, ${bad.length} bad`);
  });

  await t('PAY', 'Confirm nonexistent → no crash', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/payments/99999/confirm`, {method:'POST',headers:H});
    log('PAY', 'Confirm nonexistent → no crash', r.status<500, `${r.status}`);
  });

  await t('PAY', 'Delete paid → blocked', async () => {
    const r2 = await F(`${BASE}/${SLUG}/api/admin/payments`, {headers:G});
    const d2 = await r2.json();
    const paid = (d2.payments||[]).find(p => p.status==='Paid');
    if (!paid) { log('PAY','Delete paid → blocked',true,'skip'); return; }
    const r = await F(`${BASE}/${SLUG}/api/admin/payments/${paid.invoice_id}`, {method:'DELETE',headers:H});
    log('PAY', 'Delete paid → blocked', r.status===400, `${r.status}`);
  });

  await t('PAY', 'No zero-amount payments', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/payments`, {headers:G});
    const d = await r.json();
    const zero = (d.payments||[]).filter(p => !p.total_amount || parseFloat(p.total_amount)<=0);
    log('PAY', 'No zero-amount payments', zero.length===0, `${zero.length} bad`);
  });

  await t('PAY', 'Paid payments have paid_at', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/payments`, {headers:G});
    const d = await r.json();
    const bad = (d.payments||[]).filter(p => p.status==='Paid' && !p.paid_at);
    log('PAY', 'Paid payments have paid_at', bad.length===0, `${bad.length} missing`);
  });

  // ═══ 5. STAFF CREATION ═══
  console.log('\n══ 5. STAFF CREATION EDGE CASES ══');
  for (const [label, body, exp] of [
    ['Missing name', {name:'',email:'x@x.com',role:'Driver',phone:'09171234567'}, 400],
    ['Missing email', {name:'T',email:'',role:'Driver',phone:'09171234567'}, 400],
    ['Missing role', {name:'T',email:'x@x.com',role:'',phone:'09171234567'}, 400],
    ['Invalid role', {name:'T',email:'u999@t.com',role:'CEO',phone:'09171234567'}, 400],
    ['Duplicate email', {name:'D',email:'bollinrah@gmail.com',role:'Driver',phone:'09171234567'}, 409],
  ]) {
    await t('STAFF', label, async () => {
      const r = await F(`${BASE}/${SLUG}/api/admin/staff`, {method:'POST',headers:H,body:JSON.stringify(body)});
      log('STAFF', label, r.status===exp, `expect ${exp}, got ${r.status}`);
    });
  }

  // ═══ 6. SHIPMENT EDGE CASES ═══
  console.log('\n══ 6. SHIPMENT EDGE CASES ══');

  await t('SHIP', 'Nonexistent → 404', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/shipments/DLV-FAKE99`, {headers:G});
    log('SHIP', 'Nonexistent → 404', r.status===404, `${r.status}`);
  });

  await t('SHIP', 'Required fields present', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/shipments`, {headers:G});
    const d = await r.json(); const s = (d.shipments||d||[]);
    if (!s.length) { log('SHIP','Required fields present',true,'skip'); return; }
    log('SHIP', 'Required fields present', !!s[0].delivery_number && !!s[0].status, `dn:${s[0].delivery_number}`);
  });

  await t('SHIP', 'Valid statuses', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/shipments`, {headers:G});
    const d = await r.json();
    const valid = ['Pending','Processing','In Transit','Out for Delivery','Delivered','Cancelled','Returned','Declined','Queued'];
    const bad = (d.shipments||d||[]).filter(s => !valid.includes(s.status));
    log('SHIP', 'Valid statuses', bad.length===0, `${bad.length} invalid`);
  });

  // ═══ 7. REGISTRATION ═══
  console.log('\n══ 7. CLIENT REGISTRATION ══');
  for (const [label, body, exp] of [
    ['Empty fields → 400', {first_name:'',last_name:'',email:'',phone:'',username:'',password:''}, 400],
    ['Short password → 400', {first_name:'T',last_name:'U',email:'t@t.com',phone:'09171234567',username:'shortpw99',password:'123'}, 400],
    ['Bad email → 400', {first_name:'T',last_name:'U',email:'notanemail',phone:'09171234567',username:'bademl99',password:'password123'}, 400],
    ['Phone too long → 400', {first_name:'T',last_name:'U',email:'t@t.com',phone:'091712345678901',username:'longph99',password:'password123'}, 400],
  ]) {
    await t('REG', label, async () => {
      const r = await F(`${BASE}/${SLUG}/api/register`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      log('REG', label, r.status===exp, `expect ${exp}, got ${r.status}`);
    });
  }

  // ═══ 8. SUBSCRIPTION ═══
  console.log('\n══ 8. SUBSCRIPTION & BILLING ══');

  await t('SUB', 'Valid plan', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/subscription`, {headers:G});
    const d = await r.json();
    log('SUB', 'Valid plan', d.ok && ['startup','enterprise','global'].includes(d.plan), `plan:${d.plan}`);
  });

  await t('SUB', 'Has payments', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/subscription`, {headers:G});
    const d = await r.json();
    log('SUB', 'Has payments', (d.payments||[]).length>0, `${(d.payments||[]).length}`);
  });

  await t('SUB', 'Pricing valid', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/pricing`, {headers:G});
    const d = await r.json();
    log('SUB', 'Pricing valid', d.base_fee>0, `base_fee:${d.base_fee}`);
  });

  // ═══ 9. SECURITY ═══
  console.log('\n══ 9. SECURITY ══');

  await t('SEC', 'Cross-tenant blocked', async () => {
    const r = await F(`${BASE}/fakeslug/api/admin/stats`, {headers:G});
    log('SEC', 'Cross-tenant blocked', r.status>=400, `${r.status}`);
  });

  await t('SEC', 'Superadmin API no auth', async () => {
    const r = await F(`${BASE}/api/superadmin/tenants`);
    log('SEC', 'Superadmin API no auth', r.status>=400, `${r.status}`);
  });

  // ═══ 10. MOBILE ═══
  console.log('\n══ 10. MOBILE / DRIVER ══');

  await t('MOB', 'Tenant config (public)', async () => {
    const r = await F(`${BASE}/${SLUG}/api/mobile/tenant-config`);
    log('MOB', 'Tenant config (public)', r.ok, `${r.status}`);
  });

  await t('MOB', 'Client login endpoint', async () => {
    const r = await F(`${BASE}/${SLUG}/api/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'fake@f.com',password:'x'})});
    log('MOB', 'Client login endpoint', r.status!==404, `${r.status}`);
  });

  await t('MOB', '/me no auth → 401', async () => {
    const r = await F(`${BASE}/${SLUG}/api/me`);
    log('MOB', '/me no auth → 401', r.status===401, `${r.status}`);
  });

  await t('MOB', '/me with admin token', async () => {
    const r = await F(`${BASE}/${SLUG}/api/me`, {headers:G});
    const d = await r.json();
    log('MOB', '/me with admin token', r.ok && d.user, `name:${d.user?.fullName||'-'}`);
  });

  await t('MOB', 'Deliveries no auth → 401', async () => {
    const r = await F(`${BASE}/${SLUG}/api/mobile/deliveries`);
    log('MOB', 'Deliveries no auth → 401', r.status===401||r.status===403, `${r.status}`);
  });

  // ═══ 11. DATA INTEGRITY ═══
  console.log('\n══ 11. DATA INTEGRITY ══');

  await t('DATA', 'Staff all have roles', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/staff`, {headers:G});
    const d = await r.json();
    const bad = d.filter(s => !s.role);
    log('DATA', 'Staff all have roles', bad.length===0, `${d.length} staff, ${bad.length} missing`);
  });

  await t('DATA', 'Staff all have usernames', async () => {
    const r = await F(`${BASE}/${SLUG}/api/admin/staff`, {headers:G});
    const d = await r.json();
    const bad = d.filter(s => !s.username);
    log('DATA', 'Staff all have usernames', bad.length===0, `${bad.length} missing`);
  });

  await t('DATA', 'Stats match shipment count', async () => {
    const r1 = await F(`${BASE}/${SLUG}/api/admin/stats`, {headers:G});
    const stats = await r1.json();
    const r2 = await F(`${BASE}/${SLUG}/api/admin/shipments`, {headers:G});
    const ships = await r2.json();
    const cnt = (ships.shipments||ships||[]).length;
    log('DATA', 'Stats match shipment count', parseInt(stats.total_shipments)===cnt, `stats:${stats.total_shipments} vs actual:${cnt}`);
  });

  // ═══ RESULTS ═══
  console.log('\n══════════════════════════════════════════');
  console.log(`  FINAL: ${passed} passed, ${failed} failed, ${passed+failed} total`);
  console.log('══════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('❌ FAILED:');
    results.filter(r => !r.ok).forEach(r => console.log(`  [${r.cat}] ${r.label}: ${r.detail}`));
  } else {
    console.log('🎉 ALL TESTS PASSED!');
  }
}

run().catch(e => console.error('Error:', e));
