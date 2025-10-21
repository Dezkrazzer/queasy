const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'queasy_db';
const DB_PORT = Number(process.env.DB_PORT || 3306);

/**
 * Inisialisasi database otomatis saat server start
 * - Cek apakah database exists
 * - Jika tidak ada, buat database dan jalankan schema
 * - Jika ada, skip initialization
 */
async function initiateDB() {
    let connection;
    
    try {
        console.log('> 🔍 Checking database connection...');
        
        // Koneksi tanpa spesifik database dulu (untuk cek/create database)
        connection = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            connectTimeout: 10000,
            multipleStatements: true, // Allow multiple SQL statements
        });

        console.log(`> ✅ Connected to MySQL server at ${DB_HOST}:${DB_PORT}`);

        // Cek apakah database sudah ada
        const [databases] = await connection.query(
            'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
            [DB_NAME]
        );

        if (databases.length > 0) {
            console.log(`> ✅ Database "${DB_NAME}" already exists. Skipping initialization.`);
            
            // Verifikasi tabel-tabel penting ada
            await connection.query(`USE ${DB_NAME}`);
            const [tables] = await connection.query('SHOW TABLES');
            
            if (tables.length === 0) {
                console.log('> ⚠️ Database exists but empty. Running schema...');
                await runSchema(connection);
            } else {
                console.log(`> ✅ Found ${tables.length} tables in database.`);
            }
        } else {
            console.log(`> 📦 Database "${DB_NAME}" not found. Creating...`);
            
            // Buat database baru
            await connection.query(
                `CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            console.log(`> ✅ Database "${DB_NAME}" created successfully!`);
            
            // Gunakan database yang baru dibuat
            await connection.query(`USE ${DB_NAME}`);
            
            // Jalankan schema dari file
            await runSchema(connection);
        }

        return true;
    } catch (error) {
        console.error('> ❌ Database initialization failed:');
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Hint: MySQL server is not running or not reachable.');
            console.error('   - Check if MySQL/MariaDB service is running');
            console.error('   - Verify DB_HOST and DB_PORT in .env file');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Hint: Authentication failed.');
            console.error('   - Check DB_USER and DB_PASSWORD in .env file');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('\n💡 Hint: Connection timeout.');
            console.error('   - Check if firewall is blocking the connection');
            console.error('   - Verify the remote MySQL server is accessible');
        }
        
        throw error; // Re-throw to stop server startup
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Jalankan schema SQL dari file database-schema.sql
 */
async function runSchema(connection) {
    try {
        console.log('> 📄 Reading database schema from file...');
        
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.warn('> ⚠️ database-schema.sql not found. Skipping schema creation.');
            return;
        }
        
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Hapus semua komentar SQL (single-line dan multi-line)
        schemaSql = schemaSql.replace(/--.*$/gm, ''); // Hapus komentar --
        schemaSql = schemaSql.replace(/\/\*[\s\S]*?\*\//g, ''); // Hapus komentar /* */
        
        // Hapus baris CREATE DATABASE dan USE (sudah dilakukan di atas)
        schemaSql = schemaSql.replace(/CREATE DATABASE.*?;/gis, '');
        schemaSql = schemaSql.replace(/USE\s+\w+\s*;/gi, '');
        
        // Pisahkan statements berdasarkan semicolon
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => {
                // Filter statement yang valid (bukan kosong dan bukan hanya whitespace)
                return stmt.length > 10 && 
                       (stmt.toUpperCase().includes('CREATE') || 
                        stmt.toUpperCase().includes('INSERT') ||
                        stmt.toUpperCase().includes('ALTER'));
            });
        
        console.log(`> 🔧 Executing ${statements.length} SQL statements...`);
        
        for (const statement of statements) {
            if (statement.trim().length > 0) {
                await connection.query(statement);
            }
        }
        
        console.log('> ✅ Database schema created successfully!');
        
        // Tampilkan tabel yang dibuat
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`> ✅ Created ${tables.length} tables:`);
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });
        
    } catch (error) {
        console.error('> ❌ Failed to run schema:', error.message);
        throw error;
    }
}

// Export fungsi untuk digunakan di server.js
module.exports = initiateDB;

// Allow running directly: node initiateDB.js
if (require.main === module) {
    initiateDB()
        .then(() => {
            console.log('\n> 🎉 Database initialization completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n> 💥 Database initialization failed!');
            process.exit(1);
        });
}
