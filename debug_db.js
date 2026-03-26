require('dotenv').config();
const mysql = require('mysql2/promise');

async function debug() {
  console.log('--- DB DIAGNOSTIC ---');
  console.log('Env Port:', process.env.DB_PORT);
  console.log('Env Host:', process.env.DB_HOST);
  console.log('Env User:', process.env.DB_USER);
  console.log('Env DB:', process.env.DB_NAME);

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'logistics_os'
    });

    const [version] = await conn.query('SELECT VERSION() as v');
    console.log('MySQL Version:', version[0].v);

    console.log('\nChecking table: staff');
    try {
      const [cols] = await conn.query('DESCRIBE staff');
      cols.forEach(c => console.log(` - ${c.Field}`));
    } catch (e) {
      console.log(' ! staff table error:', e.message);
    }

    console.log('\nChecking table: app_user');
    try {
      const [cols] = await conn.query('DESCRIBE app_user');
      cols.forEach(c => console.log(` - ${c.Field}`));
    } catch (e) {
      console.log(' ! app_user table error:', e.message);
    }

    await conn.end();
  } catch (err) {
    console.error('\n❌ Primary connection failed:', err.message);
    
    // Try without password if it failed with access denied
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('\nRetrying without password...');
        try {
            const conn2 = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '3306'),
                user: process.env.DB_USER || 'root'
            });
            console.log('✅ Connected without password.');
            const [dbs] = await conn2.query('SHOW DATABASES');
            console.log('Available databases:', dbs.map(d => d.Database).join(', '));
            await conn2.end();
        } catch (e2) {
            console.error('Retry failed:', e2.message);
        }
    }
  }
}

debug();
