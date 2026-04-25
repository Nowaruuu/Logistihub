const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'logistics_os'
  });

  const query = `UPDATE TENANT SET app_download_url = 'https://logistichub.ddns.net/public/LogistiHub-v1.apk' WHERE status = 'active'`;
  const [result] = await connection.execute(query);
  console.log('Fixed', result.affectedRows, 'tenants');
  connection.end();
}

fixDb().catch(console.error);
