const pool = require('./src/utils/db');
const bcrypt = require('bcrypt');

async function seedDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Koneksi ke database berhasil!');

        // 1. Buat Host contoh
        const passwordHash = await bcrypt.hash('password123', 10);
        const [hostResult] = await connection.query(
            'INSERT INTO hosts (username, email, password_hash) VALUES (?, ?, ?)',
            ['admin', 'admin@queasy.com', passwordHash]
        );
        const hostId = hostResult.insertId;
        console.log('✅ Host "admin" berhasil dibuat (password: password123)');

        // 2. Buat Quiz contoh
        const [quizResult] = await connection.query(
            'INSERT INTO quizzes (host_id, title, description) VALUES (?, ?, ?)',
            [hostId, 'Kuis Pengetahuan Umum', 'Kuis seputar pengetahuan umum untuk menguji wawasan Anda']
        );
        const quizId = quizResult.insertId;
        console.log('✅ Quiz "Pengetahuan Umum" berhasil dibuat');

        // 3. Buat Pertanyaan & Jawaban
        const questions = [
            {
                question_text: 'Apa ibukota Indonesia?',
                time_limit: 15,
                answers: [
                    { answer_text: 'Jakarta', is_correct: true },
                    { answer_text: 'Bandung', is_correct: false },
                    { answer_text: 'Surabaya', is_correct: false },
                    { answer_text: 'Medan', is_correct: false }
                ]
            },
            {
                question_text: 'Siapa presiden pertama Indonesia?',
                time_limit: 20,
                answers: [
                    { answer_text: 'Soekarno', is_correct: true },
                    { answer_text: 'Soeharto', is_correct: false },
                    { answer_text: 'Habibie', is_correct: false },
                    { answer_text: 'Megawati', is_correct: false }
                ]
            },
            {
                question_text: 'Berapa jumlah pulau di Indonesia (perkiraan)?',
                time_limit: 20,
                answers: [
                    { answer_text: '17.000 lebih', is_correct: true },
                    { answer_text: '5.000', is_correct: false },
                    { answer_text: '1.000', is_correct: false },
                    { answer_text: '50.000', is_correct: false }
                ]
            }
        ];

        for (const q of questions) {
            // Insert pertanyaan
            const [questionResult] = await connection.query(
                'INSERT INTO questions (quiz_id, question_text, time_limit) VALUES (?, ?, ?)',
                [quizId, q.question_text, q.time_limit]
            );
            const questionId = questionResult.insertId;

            // Insert jawaban
            for (const a of q.answers) {
                await connection.query(
                    'INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)',
                    [questionId, a.answer_text, a.is_correct]
                );
            }

            console.log(`✅ Pertanyaan "${q.question_text}" beserta jawabannya berhasil dibuat`);
        }

        console.log('\n🎉 Seeding database selesai!');
        console.log('\n📝 Informasi Login Host:');
        console.log('   Username: admin');
        console.log('   Password: password123');

    } catch (error) {
        console.error('❌ Error saat seeding database:', error);
        throw error;
    } finally {
        if (connection) connection.release();
        await pool.end();
    }
}

// Jalankan fungsi seeding
seedDatabase()
    .then(() => {
        console.log('✅ Proses seeding database selesai.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Proses seeding database gagal:', error);
        process.exit(1);
    });
