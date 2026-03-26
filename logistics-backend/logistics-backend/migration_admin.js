'use strict';
require('dotenv').config();
const { query } = require('./config/db');

async function migrateAdmin() {
  try {
    const commands = [
      `CREATE TABLE IF NOT EXISTS SUPERADMIN_SETTINGS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform_name VARCHAR(100) DEFAULT 'Logistics OS',
        support_email VARCHAR(100) DEFAULT 'support@logistics.com',
        base_domain VARCHAR(100) DEFAULT 'logistihub.ddns.net',
        default_tenant_max_users INT DEFAULT 50,
        default_tenant_storage_mb INT DEFAULT 1024,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS AUDIT_LOG (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        admin_email VARCHAR(100),
        action VARCHAR(100),
        entity_type VARCHAR(100),
        entity_id VARCHAR(50),
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS BACKUP_LOG (
        backup_id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255),
        status VARCHAR(20),
        size_bytes BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const cmd of commands) {
      console.log('Executing:', cmd.substring(0, 50));
      await query(cmd);
    }

    try {
      await query('ALTER TABLE TENANT ADD COLUMN max_users INT DEFAULT 50');
      console.log('Added max_users to TENANT');
    } catch(e) { console.log('max_users exists or failed:', e.message); }

    try {
      await query('ALTER TABLE TENANT ADD COLUMN storage_limit_mb INT DEFAULT 1024');
      console.log('Added storage_limit_mb to TENANT');
    } catch(e) { console.log('storage_limit_mb exists or failed:', e.message); }

    const [rows] = await query('SELECT COUNT(*) as c FROM SUPERADMIN_SETTINGS');
    if (rows[0].c === 0) {
      await query(`INSERT INTO SUPERADMIN_SETTINGS (platform_name) VALUES ('Logistics OS')`);
    }

    console.log('✅ Admin Database Migration complete.');
    process.exit(0);
  } catch(e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
}

migrateAdmin();
