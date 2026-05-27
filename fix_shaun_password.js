// One-time fix: Reset Shaun's STAFF password to match his APP_USER password
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  const newPassword = 'Shaun@12345';
  const hash = await bcrypt.hash(newPassword, 12);

  const [result] = await pool.execute(
    "UPDATE STAFF SET password_hash = ? WHERE username = 'shaunilov4@amongiz.com'",
    [hash]
  );

  console.log(`Updated ${result.affectedRows} row(s). Shaun's STAFF password is now: ${newPassword}`);
  await pool.end();
})();
