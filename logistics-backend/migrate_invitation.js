const { query } = require('./config/db');
require('dotenv').config();

async function migrate() {
  console.log('Migrating: Creating INVITATION table...');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS INVITATION (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        token TEXT NOT NULL,
        status ENUM('Pending', 'Accepted', 'Expired') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ INVITATION table created or already exists.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
