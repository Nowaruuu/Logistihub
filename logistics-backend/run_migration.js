
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./config/db');

async function migrate() {
  try {
    console.log('Reading migration_v2.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'migration_v2.sql'), 'utf-8');
    
    // Split by semicolon and filter out empty strings
    // Note: Simple split might not work with complex SQL, but migration_v2.sql is simple.
    const commands = sql.split(';').map(c => c.trim()).filter(c => c.length > 0);
    
    console.log(`Executing ${commands.length} commands...`);
    for (const cmd of commands) {
      if (cmd.startsWith('--')) continue; 
      console.log(`Executing: ${cmd.substring(0, 50)}...`);
      await query(cmd);
    }
    
    console.log('✅  Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
