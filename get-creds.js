const BASE = 'https://logistichub.ddns.net';
const SLUG = 'amongiz';

async function run() {
  // Login as admin
  const r = await fetch(`${BASE}/${SLUG}/api/staff-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bollinrah@amongiz.com', password: 'thugxlife2019' })
  });
  const d = await r.json();
  const auth = { 'Authorization': 'Bearer ' + d.token };

  // Get staff
  const sr = await fetch(`${BASE}/${SLUG}/api/admin/staff`, { headers: auth });
  const staff = await sr.json();
  console.log('=== STAFF ACCOUNTS ===');
  if (Array.isArray(staff)) {
    staff.forEach(s => console.log(`  ${s.role} | ${s.name} | email: ${s.contact_email || '-'} | username: ${s.username || '-'} | status: ${s.status}`));
  }

  // Get app users (customers)
  const ur = await fetch(`${BASE}/${SLUG}/api/admin/app-users`, { headers: auth });
  const users = await ur.json();
  console.log('\n=== APP USERS (Customers) ===');
  if (Array.isArray(users)) {
    users.forEach(u => console.log(`  ${u.role || 'user'} | ${u.first_name} ${u.last_name} | email: ${u.email} | status: ${u.status}`));
  }

  // Check superadmin
  console.log('\n=== SUPERADMIN ===');
  const sar = await fetch(`${BASE}/superadmin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'superadmin@logistihub.com', password: 'admin123' }) });
  console.log('  Login test status:', sar.status);
}

run().catch(e => console.error(e.message));
