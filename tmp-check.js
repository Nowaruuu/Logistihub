require('dotenv').config();
const m = require('mysql2/promise');
(async () => {
  const p = await m.createPool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD
  });
  const [r] = await p.execute("SELECT staff_id, name, email, vehicle_type, role FROM STAFF WHERE tenant_id = 40 AND role = 'Driver'");
  console.log('Drivers:');
  r.forEach(d => console.log(`  ID:${d.staff_id} | ${d.name} | email:${d.email || 'NULL'} | vehicle:${d.vehicle_type || 'NULL'}`));
  
  // Also check all staff to find any with emails
  const [all] = await p.execute("SELECT staff_id, name, email, role, vehicle_type FROM STAFF WHERE tenant_id = 40");
  console.log('\nAll staff:');
  all.forEach(s => console.log(`  ID:${s.staff_id} | ${s.name} | ${s.email || 'no email'} | role:${s.role} | vehicle:${s.vehicle_type || 'none'}`));
  
  await p.end();
})();
