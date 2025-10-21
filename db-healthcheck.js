require('dotenv').config();
const db = require('./src/utils/db');

(async () => {
  console.log('> Running DB healthcheck with config:');
  console.log({
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
  });

  try {
    const conn = await db.getConnection();
    await conn.query('SELECT 1 AS ok');
    conn.release();
    console.log('> ✅ Database reachable and responding to queries.');
    process.exit(0);
  } catch (err) {
    console.error('> ❌ Database healthcheck failed:');
    console.error('   code:', err.code);
    console.error('   message:', err.message);
    console.error('   hint: Ensure MySQL is running, credentials are correct, and firewall allows port 3306.');
    process.exit(1);
  }
})();
