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

// ===== FUNGSI HELPER UNTUK QUIZ =====

function sendQuestion(gameCode) {
    const game = activeGames[gameCode];
    if (!game || !game.questions) {
        console.error(`> ❌ • Game ${gameCode} tidak valid atau tidak ada pertanyaan`);
        return;
    }

    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (!currentQuestion) {
        // Tidak ada pertanyaan lagi, game selesai
        console.log(`> 🏁 • Game ${gameCode} selesai!`);
        endGame(gameCode);
        return;
    }

    // Reset status hasAnswered untuk semua player
    game.players.forEach(p => {
        p.hasAnswered = false;
        p.lastAnswerCorrect = false; // Reset status jawaban sebelumnya
    });

    // Clear timeout sebelumnya jika ada
    if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
    }

    // Ambil jawaban untuk pertanyaan ini
    db.query(
        'SELECT answer_id, answer_text FROM answers WHERE question_id = ?',
        [currentQuestion.question_id]
    ).then(([answers]) => {
        const questionData = {
            question_id: currentQuestion.question_id,
            question_text: currentQuestion.question_text,
            answers: answers,
            time_limit: currentQuestion.time_limit,
            question_number: game.currentQuestionIndex + 1,
            total_questions: game.questions.length
        };

        console.log(`> 📤 • Mengirim pertanyaan ${game.currentQuestionIndex + 1}/${game.questions.length} ke game ${gameCode}`);
        io.to(gameCode).emit('game_question', questionData);

        // Set timeout untuk auto lanjut jika tidak semua jawab dalam waktu tertentu
        game.questionTimer = setTimeout(() => {
            const allAnswered = game.players.every(p => p.hasAnswered);
            if (!allAnswered) {
                console.log(`> ⏰ • Timeout! Lanjut ke pertanyaan berikutnya di game ${gameCode}`);
                showQuestionResult(gameCode);
            }
        }, (currentQuestion.time_limit + 2) * 1000); // +2 detik buffer

    }).catch(error => {
        console.error('Error saat mengambil answers:', error);
    });
}

function showQuestionResult(gameCode) {
    const game = activeGames[gameCode];
    if (!game) return;

    console.log(`> 📊 • Mengirim hasil pertanyaan ${game.currentQuestionIndex + 1} ke semua player`);

    // Kirim hasil ke SETIAP player secara individual
    game.players.forEach(player => {
        // Cari socket player ini
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
            playerSocket.emit('question_result', {
                isCorrect: player.lastAnswerCorrect || false, // Apakah player ini benar
                newScore: player.score, // Skor terbaru player ini
                scores: game.players.map(p => ({ // Skor semua player
                    name: p.name,
                    score: p.score,
                    isHost: p.isHost
                }))
            });
            
            console.log(`  - Kirim ke ${player.name}: isCorrect=${player.lastAnswerCorrect}, score=${player.score}`);
        }
    });

    // Tunggu 5 detik, lalu lanjut ke pertanyaan berikutnya
    setTimeout(() => {
        game.currentQuestionIndex++;
        sendQuestion(gameCode);
    }, 5000);
}

async function endGame(gameCode) {
    const game = activeGames[gameCode];
    if (!game) return;

    console.log(`> 🏆 • Game ${gameCode} berakhir, menyimpan skor...`);

    try {
        // Ambil session_id dari memori
        const sessionId = game.sessionId;
        
        if (!sessionId) {
            console.error(`> ❌ • Session ID tidak ditemukan untuk game ${gameCode}`);
            return;
        }
        
        // Simpan skor ke database dengan kolom session_id (bukan game_session_id)
        for (const player of game.players) {
            if (!player.isHost) { // Hanya simpan skor player, bukan host
                await db.query(
                    'INSERT INTO player_scores (session_id, player_name, score) VALUES (?, ?, ?)',
                    [sessionId, player.name, player.score || 0]
                );
            }
        }

        // Kirim hasil akhir ke semua player
        const finalScores = game.players
            .filter(p => !p.isHost)
            .sort((a, b) => b.score - a.score) // Urutkan dari tertinggi
            .map((p, index) => ({
                rank: index + 1,
                name: p.name,
                score: p.score
            }));

        io.to(gameCode).emit('game_over', {
            scores: finalScores
        });

        console.log(`> ✅ • Skor disimpan, game ${gameCode} selesai`);

        // Hapus game dari activeGames setelah 30 detik
        setTimeout(() => {
            delete activeGames[gameCode];
            console.log(`> 🗑️ • Game ${gameCode} dihapus dari memory`);
        }, 30000);

    } catch (error) {
        console.error('Error saat endGame:', error);
    }
}

// ===== END FUNGSI HELPER =====


io.on('connection', (socket) => {
    console.log(`> 🔌 • Seorang pengguna terhubung: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`> 💔 • Pengguna terputus: ${socket.id}`);
        
        // Loop semua game untuk mencari socket yang terputus
        for (const gameCode in activeGames) {
            const game = activeGames[gameCode];
        
            // Cek apakah socket ini adalah host
            if (game.hostId === socket.id) {
                console.log(`> 🚨 • Host terputus dari game ${gameCode}`);
                
                // JANGAN langsung hapus game, beri waktu 10 detik untuk reconnect
                // Tandai bahwa host disconnect
                game.hostDisconnected = true;
                game.hostDisconnectTime = Date.now();
                
                // Set timeout untuk hapus game jika host tidak reconnect dalam 10 detik
                setTimeout(() => {
                    const currentGame = activeGames[gameCode];
                    if (currentGame && currentGame.hostDisconnected && 
                        (Date.now() - currentGame.hostDisconnectTime) >= 10000) {
                        console.log(`> 🗑️ • Game ${gameCode} dihapus karena host tidak reconnect`);
                        // Broadcast ke semua pemain bahwa game dibatalkan
                        io.to(gameCode).emit('host_disconnected');
                        delete activeGames[gameCode];
                    }
                }, 10000);
                
                return;
            }
        
            // Cek apakah socket ini adalah pemain (bukan host)
            const playerIndex = game.players.findIndex(p => p.id === socket.id && !p.isHost);
            if (playerIndex !== -1) {
                console.log(`> 👋 • Pemain ${game.players[playerIndex].name} keluar dari game ${gameCode}`);
                // Hapus pemain dari array
                game.players.splice(playerIndex, 1);
                // Broadcast update pemain ke lobi
                io.to(gameCode).emit('lobby_update', { 
                    players: game.players,
                    quizTitle: game.quizTitle || 'Quiz'
                });
                return;
            }
        }
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

                // Query judul quiz dari database
                const [quizResults] = await db.query(
                    'SELECT title FROM quizzes WHERE quiz_id = ?',
                    [quiz_id]
                );

                if (quizResults.length === 0) {
                    return socket.emit('error', { message: 'Quiz tidak ditemukan' });
                }

                const quizTitle = quizResults[0].title;

            const gameCode = generateGameCode();
            
            // PENTING: Assign activeGames SEBELUM await db.query untuk menghindari race condition
            activeGames[gameCode] = {
                hostId: socket.id,
                host_db_id: host_id,
                quiz_id: quiz_id,
                quizTitle: quizTitle,
                players: [
                    { id: socket.id, name: hostUsername, isHost: true, score: 0, hasAnswered: false }
                ],
                questions: [],
                currentQuestionIndex: 0
            };
            
            // Simpan session ke database dan dapatkan session_id
            const [sessionResult] = await db.query(
                'INSERT INTO game_sessions (quiz_id, host_id, game_code) VALUES (?, ?, ?)',
                [quiz_id, host_id, gameCode]
            );
            
            // Simpan session_id ke activeGames untuk digunakan di endGame
            const newSessionId = sessionResult.insertId;
            activeGames[gameCode].sessionId = newSessionId;
            
            console.log(`> 💾 • Session ID ${newSessionId} disimpan untuk game ${gameCode}`);

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
        
        // 3. Cek apakah ini adalah host yang reconnect
        const session = socket.request.session;
        if (session && session.host_id && session.host_id === game.host_db_id) {
            // Ini adalah host yang reconnect dengan socket ID baru
            console.log(`> 🔄 • Host reconnect ke game ${gameCode} dengan socket baru ${socket.id}`);
            game.hostId = socket.id; // Update socket ID host
            game.hostDisconnected = false; // Tandai host sudah reconnect
            
            // Update player host di array
            const hostPlayer = game.players.find(p => p.isHost);
            if (hostPlayer) {
                hostPlayer.id = socket.id;
            }
            
            socket.emit('you_are_host'); // Beri tahu klien bahwa dia host
        } else if (game.hostId === socket.id) {
            // Socket ID sama, tidak perlu update
            socket.emit('you_are_host');
        } else if (session && session.playerName && session.currentGameCode === gameCode) {
            // Ini adalah player yang reconnect setelah redirect
            console.log(`> 🔄 • Player reconnect: ${session.playerName} dengan socket ${socket.id}`);
            
            // Cek apakah player sudah ada di array (dengan socket lama)
            const existingPlayer = game.players.find(p => p.name === session.playerName && !p.isHost);
            
            if (existingPlayer) {
                // Update socket ID player yang sudah ada
                console.log(`> ♻️ • Update socket ID untuk ${session.playerName}: ${existingPlayer.id} → ${socket.id}`);
                existingPlayer.id = socket.id;
            } else {
                // Player belum ada di array, tambahkan kembali
                console.log(`> ➕ • Re-add player ${session.playerName} ke game ${gameCode}`);
                game.players.push({
                    id: socket.id,
                    name: session.playerName,
                    isHost: false,
                    score: 0,
                    hasAnswered: false
                });
            }
        }

        // 4. Kirim daftar pemain terbaru ke SEMUA ORANG di lobi
        // Kita panggil ini di sini agar pemain baru langsung dapat daftar
            io.to(gameCode).emit('lobby_update', { 
                players: game.players,
                quizTitle: game.quizTitle || 'Quiz'
            });
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
            // 2. Ambil SEMUA pertanyaan dari database
            const quizId = game.quiz_id;
            
            const [questions] = await db.query(
                'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_id',
                [quizId]
            );

            if (questions.length === 0) {
                socket.emit('error', { message: 'Tidak ada pertanyaan dalam kuis ini' });
                return;
            }

            // 3. Simpan pertanyaan ke activeGames
            game.questions = questions;
            game.currentQuestionIndex = 0;

            console.log(`> 📋 • Loaded ${questions.length} pertanyaan untuk game ${gameCode}`);
            
            // 4. Kirim sinyal sederhana ke semua orang di room untuk redirect
            io.to(gameCode).emit('game_started');
            
            console.log(`> ✅ • Game ${gameCode} siap dimulai dengan ${game.players.length} pemain`);
        } catch (error) {
            console.error('Error saat start_game:', error);
            socket.emit('error', { message: 'Gagal memulai game' });
        }
    });

    // Listener ketika player joined quiz page
    socket.on('player_joined_quiz', (data) => {
        const gameCode = data.gameCode;
        const game = activeGames[gameCode];

        if (!game) {
            socket.emit('error', { message: 'Game tidak ditemukan' });
            return;
        }

        console.log(`> 🎮 • Player ${socket.id} joined quiz ${gameCode}`);

        // Join room
        socket.join(gameCode);

        // Cek apakah ini adalah host yang reconnect
        const session = socket.request.session;
        if (session && session.host_id && session.host_id === game.host_db_id) {
            // Host reconnect di quiz page
            console.log(`> 🔄 • Host reconnect di quiz page ${gameCode} dengan socket ${socket.id}`);
            game.hostId = socket.id;
            game.hostDisconnected = false;
            
            // Update player host di array
            const hostPlayer = game.players.find(p => p.isHost);
            if (hostPlayer) {
                hostPlayer.id = socket.id;
            }
        } else if (session && session.playerName && session.currentGameCode === gameCode) {
            // Player reconnect di quiz page
            console.log(`> 🔄 • Player reconnect di quiz: ${session.playerName}`);
            
            // Update socket ID player
            const existingPlayer = game.players.find(p => p.name === session.playerName && !p.isHost);
            if (existingPlayer) {
                console.log(`> ♻️ • Update socket ID untuk ${session.playerName}: ${existingPlayer.id} → ${socket.id}`);
                existingPlayer.id = socket.id;
            } else {
                // Player tidak ada, tambahkan kembali
                console.log(`> ➕ • Re-add player ${session.playerName} ke game ${gameCode}`);
                game.players.push({
                    id: socket.id,
                    name: session.playerName,
                    isHost: false,
                    score: 0,
                    hasAnswered: false
                });
            }
        }

        // Cek apakah ini adalah host yang pertama kali masuk ke quiz page
        if (session && session.host_id && session.host_id === game.host_db_id && game.currentQuestionIndex === 0) {
            console.log(`> 🏁 • Host ${socket.id} akan memulai pertanyaan pertama`);
            
            // Tunggu sebentar agar semua player siap, lalu kirim pertanyaan pertama
            setTimeout(() => {
                sendQuestion(gameCode);
            }, 2000);
        }
    });

    // Listener ketika player submit jawaban
    socket.on('player_answer', async (data) => {
        const { code: gameCode, question_id, answer_id: answerId, time_left: timeLeft } = data;
        const game = activeGames[gameCode];

        if (!game) {
            socket.emit('error', { message: 'Game tidak ditemukan' });
            return;
        }

        // Cari player ini
        const player = game.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`> ⚠️ • Player ${socket.id} tidak ditemukan di game ${gameCode}`);
            return;
        }

        // Cek apakah sudah jawab
        if (player.hasAnswered) {
            console.log(`> ⚠️ • Player ${player.name} sudah menjawab`);
            return;
        }

        // Logging data dari klien
        console.log(`\n========== PLAYER ANSWER DEBUG ==========`);
        console.log(`[player_answer] Player: ${player.name} (${socket.id})`);
        console.log(`[player_answer] Question ID dari klien: ${question_id}`);
        console.log(`[player_answer] Answer ID yang dipilih: ${answerId} (Tipe: ${typeof answerId})`);

        try {
            // Validasi: Tolak jawaban jika server sudah beralih ke pertanyaan berikutnya
            const currentGameQuestionId = game.questions[game.currentQuestionIndex].question_id;
            console.log(`[player_answer] Question ID server saat ini: ${currentGameQuestionId}`);
            
            if (question_id !== currentGameQuestionId) {
                console.log(`[player_answer] ⚠️ Jawaban terlambat dari ${socket.id} untuk Q ${question_id}. Server sudah di Q ${currentGameQuestionId}.`);
                console.log(`=========================================\n`);
                return;
            }
            
            // Ambil SEMUA jawaban untuk pertanyaan ini (untuk logging)
            const [allAnswers] = await db.query(
                'SELECT answer_id, answer_text, is_correct FROM answers WHERE question_id = ?',
                [question_id]
            );
            
            console.log(`[player_answer] Semua jawaban untuk Question ${question_id}:`);
            allAnswers.forEach(ans => {
                console.log(`  - ID: ${ans.answer_id} | Text: "${ans.answer_text}" | Benar: ${ans.is_correct}`);
            });
            
            // Ambil jawaban yang benar dari database
            const [correctAnswer] = await db.query(
                'SELECT answer_id, answer_text FROM answers WHERE question_id = ? AND is_correct = 1',
                [question_id]
            );

            // Logging jawaban benar dari DB
            if (correctAnswer.length > 0) {
                console.log(`\n[player_answer] ✓ JAWABAN BENAR dari DB:`);
                console.log(`  - ID: ${correctAnswer[0].answer_id} (Tipe: ${typeof correctAnswer[0].answer_id})`);
                console.log(`  - Text: "${correctAnswer[0].answer_text}"`);
            } else {
                console.log(`[player_answer] ❌ ERROR: Tidak ada jawaban benar ditemukan untuk question_id ${question_id}`);
                console.log(`=========================================\n`);
                return;
            }
            
            // Cari jawaban yang dipilih player
            const selectedAnswer = allAnswers.find(ans => Number(ans.answer_id) === Number(answerId));
            if (selectedAnswer) {
                console.log(`\n[player_answer] ★ JAWABAN YANG DIPILIH player:`);
                console.log(`  - ID: ${answerId} (Tipe: ${typeof answerId})`);
                console.log(`  - Text: "${selectedAnswer.answer_text}"`);
            }

            // Perbandingan dengan konversi tipe data eksplisit
            let isCorrect = false;
            if (answerId === null) {
                isCorrect = false; // Waktu habis atau tidak menjawab
                console.log(`\n[player_answer] ⏰ Player tidak menjawab (timeout)`);
            } else if (correctAnswer.length > 0) {
                const correctId = Number(correctAnswer[0].answer_id);
                const selectedId = Number(answerId);
                isCorrect = (correctId === selectedId);
                
                console.log(`\n[player_answer] PERBANDINGAN:`);
                console.log(`  - Jawaban Benar: ${correctId}`);
                console.log(`  - Jawaban Dipilih: ${selectedId}`);
                console.log(`  - Match: ${correctId === selectedId ? '✅ YA' : '❌ TIDAK'}`);
            }
            
            console.log(`\n[player_answer] 🎯 HASIL AKHIR: ${isCorrect ? '✅ BENAR' : '❌ SALAH'}`);
            console.log(`=========================================\n`);
            
            // Hitung skor: Jawaban benar = 100 + (timeLeft * 10)
            if (isCorrect) {
                const points = 100 + Math.max(0, timeLeft * 10);
                player.score += points;
                player.lastAnswerCorrect = true; // Simpan status jawaban
                console.log(`> ✅ • ${player.name} BENAR! +${points} poin (total: ${player.score})`);
            } else {
                player.lastAnswerCorrect = false; // Simpan status jawaban
                console.log(`> ❌ • ${player.name} salah`);
            }

            // Tandai sudah menjawab
            player.hasAnswered = true;

            // Kirim feedback ke player ini saja
            socket.emit('answer_result', {
                isCorrect,
                score: player.score,
                correctAnswerId: correctAnswer[0].answer_id
            });

            // Cek apakah semua player sudah menjawab
            const allAnswered = game.players.every(p => p.hasAnswered);
            if (allAnswered) {
                console.log(`> 🎯 • Semua player sudah menjawab di game ${gameCode}`);
                
                // Clear timeout karena semua sudah jawab
                if (game.questionTimer) {
                    clearTimeout(game.questionTimer);
                    game.questionTimer = null;
                }
                
                // Tunggu 2 detik, lalu tampilkan hasil dan lanjut ke pertanyaan berikutnya
                setTimeout(() => {
                    showQuestionResult(gameCode);
                }, 2000);
            }

        } catch (error) {
            console.error('Error saat player_answer:', error);
            socket.emit('error', { message: 'Gagal memproses jawaban' });
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
            score: 0,
            hasAnswered: false
        });

        // PENTING: Simpan player info ke session untuk reconnect
        socket.request.session.playerName = playerName;
        socket.request.session.currentGameCode = gameCode;
        socket.request.session.save();

        console.log(`> 👤 • ${socket.id} (${playerName}) bergabung ke game: ${gameCode}`);

        // Kirim konfirmasi HANYA ke pemain yang baru bergabung
        socket.emit('join_success', { gameCode: gameCode });

        // Kirim update daftar pemain ke SEMUA ORANG di room (termasuk host)
        io.to(gameCode).emit('lobby_update', { 
            players: game.players,
            quizTitle: game.quizTitle || 'Quiz'
        });
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