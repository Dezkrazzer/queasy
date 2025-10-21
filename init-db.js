const pool = require('./src/utils/db');

async function initializeDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Koneksi ke database berhasil!');

        // Tabel 1: hosts
        await connection.query(`
            CREATE TABLE IF NOT EXISTS hosts (
                host_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabel "hosts" berhasil dibuat/sudah ada.');

        // Tabel 2: quizzes
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                quiz_id INT AUTO_INCREMENT PRIMARY KEY,
                host_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES hosts(host_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabel "quizzes" berhasil dibuat/sudah ada.');

        // Tabel 3: questions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS questions (
                question_id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                question_text TEXT NOT NULL,
                time_limit INT DEFAULT 30,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabel "questions" berhasil dibuat/sudah ada.');

        // Tabel 4: answers
        await connection.query(`
            CREATE TABLE IF NOT EXISTS answers (
                answer_id INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL,
                answer_text VARCHAR(255) NOT NULL,
                is_correct BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabel "answers" berhasil dibuat/sudah ada.');

        // Tabel 5: game_sessions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS game_sessions (
                session_id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                host_id INT NOT NULL,
                game_code VARCHAR(10) UNIQUE NOT NULL,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
                FOREIGN KEY (host_id) REFERENCES hosts(host_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabel "game_sessions" berhasil dibuat/sudah ada.');

        // Tabel 6: player_scores
        await connection.query(`
            CREATE TABLE IF NOT EXISTS player_scores (
                score_id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                player_name VARCHAR(100) NOT NULL,
                score INT DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabel "player_scores" berhasil dibuat/sudah ada.');

        console.log('\n🎉 Semua tabel berhasil diinisialisasi!');
    } catch (error) {
        console.error('❌ Error saat inisialisasi database:', error);
        throw error;
    } finally {
        if (connection) connection.release();
        await pool.end();
    }
}

// Jalankan fungsi inisialisasi
initializeDatabase()
    .then(() => {
        console.log('✅ Proses inisialisasi database selesai.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Proses inisialisasi database gagal:', error);
        process.exit(1);
    });
