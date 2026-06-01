#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'logistics_os',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  // 1. Show all tenants with their status and plan
  const [tenants] = await conn.execute('SELECT tenant_id, slug, plan, status, created_at FROM TENANT ORDER BY created_at DESC');
  console.log('\n=== ALL TENANTS ===');
  for (const t of tenants) {
    const flag = t.slug.includes('among') ? ' <<<< AMONGIZ' : '';
    console.log(`  ${t.tenant_id} | ${t.slug} | plan=${t.plan} | status=${t.status} | created=${t.created_at}${flag}`);
  }

  // 2. Find amongiz specifically
  const [amongiz] = await conn.execute("SELECT * FROM TENANT WHERE slug LIKE '%among%' LIMIT 1");
  if (amongiz.length) {
    console.log('\n=== AMONGIZ DETAILS ===');
    const a = amongiz[0];
    console.log(JSON.stringify(a, null, 2));

    // 3. Force suspend if user passes --suspend flag
    if (process.argv.includes('--suspend')) {
      await conn.execute("UPDATE TENANT SET status = 'suspended' WHERE tenant_id = ?", [a.tenant_id]);
      console.log(`\n✅ FORCE SUSPENDED tenant_id=${a.tenant_id} slug=${a.slug}`);
    }
  } else {
    console.log('\n❌ No tenant found matching "among"');
  }

  await conn.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
