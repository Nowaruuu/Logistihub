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

  // 1. Show all tenants (only key columns)
  const [tenants] = await conn.execute('SELECT tenant_id, slug, plan, status, created_at FROM TENANT ORDER BY created_at DESC');
  console.log('\n=== ALL TENANTS ===');
  for (const t of tenants) {
    console.log(`  id=${t.tenant_id} | slug=${t.slug} | plan=${t.plan} | status=${t.status} | created=${t.created_at}`);
  }

  // 2. Find amongiz
  const [amongiz] = await conn.execute("SELECT tenant_id, slug, plan, status, created_at FROM TENANT WHERE slug LIKE '%among%' LIMIT 1");
  if (amongiz.length) {
    const a = amongiz[0];
    console.log(`\n=== AMONGIZ FOUND ===`);
    console.log(`  id=${a.tenant_id} | slug=${a.slug} | plan=${a.plan} | status=${a.status} | created=${a.created_at}`);

    if (process.argv.includes('--suspend')) {
      await conn.execute("UPDATE TENANT SET status = 'suspended' WHERE tenant_id = ?", [a.tenant_id]);
      console.log(`\n✅ FORCE SUSPENDED tenant_id=${a.tenant_id}`);
    }
  } else {
    console.log('\n❌ No tenant matching "among" found');
  }

  await conn.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
