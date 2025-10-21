const express = require("express");
const app = express();
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const http = require('http');
const { Server } = require("socket.io");

const { json, urlencoded } = require("body-parser");
const bcrypt = require('bcrypt');
const db = require('./src/utils/db');
const initiateDB = require('./initiateDB');

const server = http.createServer(app);
const io = new Server(server, {
    path: "/queasy-socket/"
});

const activeGames = {};

function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.use(json());
app.use(urlencoded({ extended: true }));

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'queasy-unique-secret',
    resave: false,
    saveUninitialized: true
});

app.use(sessionMiddleware);

// Share session dengan Socket.IO
// Untuk Socket.IO Engine (handshake)
io.engine.use(sessionMiddleware);

// Untuk Socket.IO Middleware (setiap event)
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

const staticFilesPath = path.join(__dirname, 'src', 'static');
console.log('Express is serving static files from:', staticFilesPath);

app.use('/static', express.static(staticFilesPath));
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

const IndexRouters = require("./src/routers/IndexRouters");

// ===== RUTE AUTENTIKASI HOST =====

// Register Host
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validasi input
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Simpan ke database
        const [result] = await db.query(
            'INSERT INTO hosts (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        res.json({ 
            success: true, 
            message: 'Registrasi berhasil!',
            host_id: result.insertId 
        });
    } catch (error) {
        console.error('Error saat register:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Username atau email sudah terdaftar' });
        }
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// Login Host
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validasi input
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password harus diisi' });
        }

        // Cari host di database
        const [rows] = await db.query('SELECT * FROM hosts WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        const host = rows[0];

        // Verifikasi password
        const isValid = await bcrypt.compare(password, host.password_hash);

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        // Simpan session
        req.session.host_id = host.host_id;
        req.session.username = host.username;

        res.json({ 
            success: true, 
            message: 'Login berhasil!',
            username: host.username 
        });
    } catch (error) {
        console.error('Error saat login:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// Logout Host
app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal logout' });
        }
        res.json({ success: true, message: 'Logout berhasil' });
    });
});

// Create Quiz (Protected)
app.post('/api/quiz/create', async (req, res) => {
    try {
        // Cek autentikasi
        if (!req.session || !req.session.host_id) {
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized - Silakan login terlebih dahulu' 
            });
        }

        const host_id = req.session.host_id;
        const { title, description, questions } = req.body;

        // Validasi input
        if (!title || !description || !questions || questions.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Data tidak lengkap' 
            });
        }

        // Validasi setiap pertanyaan
        for (const question of questions) {
            if (!question.question_text || !question.answers || question.answers.length < 2) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Setiap pertanyaan harus memiliki minimal 2 jawaban' 
                });
            }

            // Pastikan ada jawaban yang benar
            const hasCorrectAnswer = question.answers.some(a => a.is_correct);
            if (!hasCorrectAnswer) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Setiap pertanyaan harus memiliki jawaban yang benar' 
                });
            }
        }

        // Mulai transaksi database
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Insert quiz
            const [quizResult] = await connection.query(
                'INSERT INTO quizzes (host_id, title, description) VALUES (?, ?, ?)',
                [host_id, title, description]
            );

            const newQuizId = quizResult.insertId;

            // Insert questions dan answers
            for (const question of questions) {
                // Insert question
                const [questionResult] = await connection.query(
                    'INSERT INTO questions (quiz_id, question_text, time_limit) VALUES (?, ?, ?)',
                    [newQuizId, question.question_text, question.time_limit]
                );

                const newQuestionId = questionResult.insertId;

                // Insert answers
                for (const answer of question.answers) {
                    await connection.query(
                        'INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)',
                        [newQuestionId, answer.text, answer.is_correct ? 1 : 0]
                    );
                }
            }

            // Commit transaksi
            await connection.commit();

            res.json({ 
                success: true, 
                message: 'Kuis berhasil dibuat!',
                quiz_id: newQuizId,
                redirect: '/dashboard'
            });

        } catch (error) {
            // Rollback jika terjadi error
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error saat membuat kuis:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Terjadi kesalahan server saat membuat kuis' 
        });
    }
});

// ===== END RUTE AUTENTIKASI =====


io.on('connection', (socket) => {
    console.log(`> 🔌 • Seorang pengguna terhubung: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`> 💔 • Pengguna terputus: ${socket.id}`);
        // TODO: Hapus pengguna dari room 'activeGames' jika dia ada di sana
    });

    // --- TAMBAHKAN LISTENER BARU DI SINI ---

    /**
     * Saat host membuat game baru
     */
    socket.on('create_game', async (data) => {
        try {
            const { quiz_id } = data;
            
            // Ambil session dari socket
            const session = socket.request.session;
            const host_id = session.host_id;
            
            // Validasi: Cek apakah host sudah login
            if (!host_id) {
                console.log('⚠️ Peringatan: Percobaan create_game tanpa autentikasi');
                return socket.emit('auth_error');
            }

            // Simpan username juga untuk ditampilkan di lobi
            const hostUsername = session.username || 'Host';

            const gameCode = generateGameCode();
            
            // Simpan session ke database
            await db.query(
                'INSERT INTO game_sessions (quiz_id, host_id, game_code) VALUES (?, ?, ?)',
                [quiz_id, host_id, gameCode]
            );

            activeGames[gameCode] = {
                hostId: socket.id,
                host_db_id: host_id,
                quiz_id: quiz_id,
                players: [
                    { id: socket.id, name: hostUsername, isHost: true }
                ],
                currentQuestionIndex: 0
            };

            // Masukkan host ke "room" socket.io
            socket.join(gameCode);

            console.log(`> 🎮 • Game baru dibuat oleh ${hostUsername} (host_id: ${host_id}) dengan kode: ${gameCode}`);

            // Kirim kodenya kembali HANYA ke host yang membuat
            socket.emit('game_created', { gameCode: gameCode });
        } catch (error) {
            console.error('Error saat create_game:', error);
            socket.emit('error', { message: 'Gagal membuat game' });
        }
    });

    socket.on('join_lobby', (data) => {
        const gameCode = data.code;
        const game = activeGames[gameCode];

        // 1. Validasi: Cek apakah game-nya ada
        if (!game) {
            console.log(`> ⛔ • ${socket.id} mencoba masuk lobi ${gameCode} yg tidak ada`);
            socket.emit('game_not_found');
            return;
        }

        // 2. Masukkan (lagi) socket ini ke room, untuk memastikan
        socket.join(gameCode);
        
        // 3. Cek apakah socket ini adalah host-nya
        if (game.hostId === socket.id) {
            socket.emit('you_are_host'); // Beri tahu klien bahwa dia host
        }

        // 4. Kirim daftar pemain terbaru ke SEMUA ORANG di lobi
        // Kita panggil ini di sini agar pemain baru langsung dapat daftar
        io.to(gameCode).emit('player_list_update', game.players);
    });

    socket.on('start_game', async (data) => {
        const gameCode = data.code;
        const game = activeGames[gameCode];

        // 1. Validasi: Cek apakah game ada & pengirim adalah host
        if (!game || game.hostId !== socket.id) {
            console.log(`> ⛔ • Percobaan ilegal memulai game ${gameCode} oleh ${socket.id}`);
            return; // Abaikan jika bukan host
        }
        
        console.log(`> 🚀 • Game ${gameCode} dimulai oleh host!`);

        try {
            // 2. Ambil pertanyaan pertama dari database
            const quizId = game.quiz_id;
            
            const [questions] = await db.query(
                'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_id LIMIT 1',
                [quizId]
            );

            if (questions.length === 0) {
                socket.emit('error', { message: 'Tidak ada pertanyaan dalam kuis ini' });
                return;
            }

            const firstQuestion = questions[0];

            // 3. Ambil jawaban untuk pertanyaan pertama
            const [answers] = await db.query(
                'SELECT answer_id, answer_text FROM answers WHERE question_id = ?',
                [firstQuestion.question_id]
            );

            const questionData = {
                question_id: firstQuestion.question_id,
                question: firstQuestion.question_text,
                options: answers.map(a => ({ id: a.answer_id, text: a.answer_text })),
                timeLimit: firstQuestion.time_limit
            };
            
            // 4. Kirim pertanyaan pertama ke SEMUA ORANG di room
            io.to(gameCode).emit('game_started', questionData);
        } catch (error) {
            console.error('Error saat start_game:', error);
            socket.emit('error', { message: 'Gagal memulai game' });
        }
    });

    /**
     * Saat pemain mencoba bergabung ke game
     */
    socket.on('join_game', (data) => {
        const gameCode = data.code;
        const playerName = data.name;
        const game = activeGames[gameCode];

        // Validasi: Cek apakah gamenya ada
        if (!game) {
            console.log(`> ⚠️ • ${socket.id} mencoba join ke game ${gameCode} yg tidak ada`);
            socket.emit('game_not_found');
            return;
        }

        // Validasi: Cek apakah nama pemain diisi
        if (!playerName || playerName.trim() === '') {
            socket.emit('error', { message: 'Nama pemain harus diisi' });
            return;
        }

        // Cek agar host tidak join sebagai player (opsional)
        if (game.hostId === socket.id) {
            // Biarkan host re-join
        }

        // Masukkan pemain ke "room" socket.io
        socket.join(gameCode);
        game.players.push({
            id: socket.id,
            name: playerName,
            isHost: false,
            score: 0
        });

        console.log(`> 👤 • ${socket.id} (${playerName}) bergabung ke game: ${gameCode}`);

        // Kirim konfirmasi HANYA ke pemain yang baru bergabung
        socket.emit('join_success', { gameCode: gameCode });

        // Kirim update daftar pemain ke SEMUA ORANG di room (termasuk host)
        io.to(gameCode).emit('player_list_update', game.players);
    });

    /**
     * Saat pemain mengirim jawaban
     */
    socket.on('submit_answer', async (data) => {
        try {
            const { gameCode, answer_id, timeRemaining } = data;
            const game = activeGames[gameCode];

            if (!game) {
                socket.emit('error', { message: 'Game tidak ditemukan' });
                return;
            }

            // Cari pemain dalam game
            const player = game.players.find(p => p.id === socket.id);
            if (!player) {
                socket.emit('error', { message: 'Pemain tidak ditemukan dalam game' });
                return;
            }

            // Cek apakah jawaban benar
            const [answers] = await db.query(
                'SELECT is_correct FROM answers WHERE answer_id = ?',
                [answer_id]
            );

            if (answers.length === 0) {
                socket.emit('error', { message: 'Jawaban tidak valid' });
                return;
            }

            const isCorrect = answers[0].is_correct;

            // Hitung skor (contoh: 1000 poin base + bonus waktu)
            let points = 0;
            if (isCorrect) {
                points = 1000 + (timeRemaining * 10);
                player.score += points;
            }

            // Kirim feedback ke pemain
            socket.emit('answer_result', {
                isCorrect: isCorrect,
                points: points,
                totalScore: player.score
            });

            console.log(`> 📝 • ${player.name} menjawab ${isCorrect ? 'BENAR' : 'SALAH'} (+${points} poin)`);

        } catch (error) {
            console.error('Error saat submit_answer:', error);
            socket.emit('error', { message: 'Gagal memproses jawaban' });
        }
    });

});

app.use("/", IndexRouters());

// ===== INISIALISASI DATABASE & START SERVER =====
(async () => {
    try {
        // Inisialisasi database otomatis sebelum server start
        await initiateDB();
        
        // Start server setelah database ready
        server.listen(process.env.PORT, () => {
            console.log(`\n> ✅ • Your app is listening on port ${process.env.PORT}`);
            console.log(`> 🔌 • Socket.IO is ready on path: /queasy-socket/`);
            console.log(`> 🌐 • Open http://localhost:${process.env.PORT}\n`);
        });
    } catch (error) {
        console.error('\n> 💥 Failed to start server due to database initialization error.');
        console.error('> 🔧 Please fix the database connection and try again.\n');
        process.exit(1);
    }
})();