const mysql = require('mysql2/promise');
require('dotenv').config();

// Read configuration from environment variables with safe defaults
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'queasy_db';
const DB_PORT = Number(process.env.DB_PORT || 3306);

const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10s connect timeout to fail fast with clear error
    enableKeepAlive: true,
});

// Optional: quick ping on first import to surface connectivity issues early (non-fatal)
(async () => {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log(`> ✅ DB connected: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    } catch (err) {
        console.warn('> ⚠️ Database connection check failed:', err.code || err.message);
    }
})();

module.exports = pool;
