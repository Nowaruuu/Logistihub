'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('--- FORCED MIGRATION V4 ---');
  
  const config = {
    host:     '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER || 'root',
    password: (process.env.DB_PASS === 'your_password_here' || !process.env.DB_PASS) ? '' : process.env.DB_PASS,
    database: process.env.DB_NAME || 'logistics_os'
  };

  console.log('Connecting to:', { ...config, password: config.password ? '***' : '(empty)' });

  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('✅ Connected.');

    const commands = [
      `ALTER TABLE staff ADD COLUMN first_name VARCHAR(255)`,
      `ALTER TABLE staff ADD COLUMN last_name VARCHAR(255)`,
      `ALTER TABLE staff ADD COLUMN phone VARCHAR(50)`,
      `ALTER TABLE staff ADD COLUMN employee_id VARCHAR(100)`,
      `CREATE TABLE IF NOT EXISTS app_user (
          user_id       INT          PRIMARY KEY AUTO_INCREMENT,
          tenant_id     INT          NOT NULL,
          first_name    VARCHAR(255),
          last_name     VARCHAR(255),
          email         VARCHAR(255) NOT NULL,
          phone         VARCHAR(50),
          employee_id   VARCHAR(100),
          role          VARCHAR(100),
          password_hash VARCHAR(255) NOT NULL,
          status        VARCHAR(50)  DEFAULT 'active',
          created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
          UNIQUE KEY (tenant_id, email)
      )`
    ];

    for (const sql of commands) {
      try {
        console.log(`Executing SQL snippet: ${sql.substring(0, 40).replace(/\n/g, ' ')}...`);
        await conn.query(sql);
        console.log('  -> Success');
      } catch (e) {
        if (e.message.includes('Duplicate column name') || e.message.includes('already exists')) {
          console.log(`  -> Already exists (skipping)`);
        } else {
          console.error(`  -> ❌ Error: ${e.message}`);
        }
      }
    }

    console.log('\n--- VERIFICATION ---');
    try {
        const [cols] = await conn.query('DESCRIBE staff');
        console.log('STAFF columns:', cols.map(c => c.Field).join(', '));
    } catch(e) {}
    
    await conn.end();
    console.log('\n✅ DONE.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Primary connection failed:');
    console.error(err);
    process.exit(1);
  }
}

migrate();
