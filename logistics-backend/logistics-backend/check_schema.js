
'use strict';
require('dotenv').config();
const { query } = require('./config/db');

async function check() {
  try {
    console.log('Checking STAFF table...');
    const [staff] = await query('DESCRIBE STAFF');
    console.table(staff);

    console.log('\nChecking APP_USER table...');
    const [users] = await query('DESCRIBE APP_USER');
    console.table(users);

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err.message);
    process.exit(1);
  }
}

check();
