/* src/static/js/quiz.js */

const socket = io({ path: "/queasy-socket/" });

// Fungsi Fisher-Yates Shuffle untuk mengacak array
function shuffleArray(array) {
    let shuffled = [...array]; // Buat salinan array
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function quizGame(gameCode) {
    return {
        // State
        gameCode: gameCode,
        quizTitle: 'Playing Quiz',
        currentQuestionId: null, // Track ID pertanyaan saat ini
        questionText: 'Menunggu pertanyaan...', 
        answers: [],
        timer: 0,
        score: 0,
        tempScore: 0, // Temporary score untuk perhitungan
        isAnswered: false,
        message: '',
        timerInterval: null,
        selectedAnswer: null,

        pingLatency: null, // Latency hasil ping ke server

        // Fungsi init dipanggil oleh Alpine saat komponen dimuat
        init() {
            console.log('Alpine.js init, gameCode:', this.gameCode);


            // Listener untuk respons ping dari server
            socket.on('pong_user', (data) => {
                if (data && typeof data.pingSentAt === 'number') {
                    const now = Date.now();
                    this.pingLatency = now - data.pingSentAt;
                } else {
                    this.pingLatency = null;
                }
            });

            // Ping server setiap 2 detik
            this._pingInterval = setInterval(() => {
                socket.emit('ping_user', { pingSentAt: Date.now(), gameCode: this.gameCode });
            }, 2000);

            // 1. Beritahu server kita sudah masuk halaman kuis
            socket.emit('player_joined_quiz', { gameCode: this.gameCode });

            // 1.1 Terima informasi game (judul kuis dsb.)
            socket.on('game_info', (data) => {
                if (data && data.quizTitle) {
                    this.quizTitle = data.quizTitle;
                }
            });

            // 2. Listener untuk pertanyaan baru
            socket.on('game_question', (data) => {
                console.log('Pertanyaan baru diterima:', data);
                // Set title jika belum tersedia (fallback)
                if (data.quizTitle && (!this.quizTitle || this.quizTitle === 'Playing Quiz')) {
                    this.quizTitle = data.quizTitle;
                }
                this.currentQuestionId = data.question_id; // Simpan ID pertanyaan saat ini
                this.questionText = data.question_text;
                this.answers = shuffleArray(data.answers); // Acak urutan jawaban untuk setiap klien
                this.timer = data.time_limit;
                this.isAnswered = false; // Reset status jawaban
                this.message = '';
                this.selectedAnswer = null;
                this.startTimer();
            });

            // 3. Listener untuk feedback jawaban langsung (dari server saat submit)
            socket.on('answer_result', (data) => {
                console.log('========== ANSWER RESULT RECEIVED (IMMEDIATE) ==========');
                console.log('Feedback langsung dari server:', data);
                console.log('isCorrect:', data.isCorrect);
                console.log('Score baru:', data.score);
                console.log('Correct Answer ID:', data.correctAnswerId);
                console.log('========================================================');
                // JANGAN update score di sini, tunggu sampai question_result
                // Simpan sementara untuk perhitungan nanti
                this.tempScore = data.score;
                // HANYA tampilkan "Menunggu pemain lain..."
                this.message = '⏳ Menunggu pemain lain menjawab...';
            });

            // 4. Listener untuk hasil jawaban (setelah timer habis)
            socket.on('question_result', (data) => {
                console.log('========== QUESTION RESULT RECEIVED ==========');
                console.log('Hasil jawaban dari server:', data);
                console.log('isCorrect:', data.isCorrect);
                console.log('Score baru:', data.newScore);
                console.log('Score lama saya:', this.score);
                console.log('==============================================');
                this.isAnswered = true; // Kunci jawaban
                // TAMPILKAN hasil setelah semua selesai
                if (data.isCorrect) {
                    const pointsEarned = data.newScore - this.score; // Hitung dari score LAMA
                    this.message = '✅ Jawaban Benar! +' + pointsEarned + ' poin';
                } else {
                    // Jangan tampilkan "+0 poin" untuk jawaban salah
                    this.message = '❌ Jawaban Salah!';
                }
                this.score = data.newScore; // Update skor dari server SETELAH perhitungan
                // Stop timer
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
            });

            // 5. Listener untuk game over
            socket.on('game_over', (data) => {
                console.log('Game selesai! Skor akhir:', data.finalScores);
                // Stop timer
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
                // Tampilkan hasil
                this.showGameOverScreen(data.finalScores);
            });

            // 6. Listener untuk error
            socket.on('error', (data) => {
                console.error('Error:', data.message);
                this.message = 'Error: ' + data.message;
            });
        },

        // Method untuk ping server (tidak dipakai lagi, ping otomatis)

        // Method untuk mengirim jawaban
        submitAnswer(answerId) {
            if (this.isAnswered) return; // Sudah menjawab
            
            this.isAnswered = true;
            this.selectedAnswer = answerId;
            this.message = '⏳ Jawaban terkirim, menunggu hasil...';
            
            // Cari teks jawaban yang dipilih
            const selectedAnswerObj = this.answers.find(ans => ans.answer_id === answerId);
            
            console.log('========== CLIENT SUBMIT ANSWER ==========');
            console.log('Question ID:', this.currentQuestionId);
            console.log('Answer ID yang dipilih:', answerId);
            console.log('Answer Text yang dipilih:', selectedAnswerObj ? selectedAnswerObj.answer_text : 'NOT FOUND');
            console.log('==========================================');
            
            socket.emit('player_answer', {
                code: this.gameCode,
                question_id: this.currentQuestionId, // Kirim question_id untuk mencegah race condition
                answer_id: answerId,
                time_left: this.timer // Kirim sisa waktu untuk perhitungan skor
            });
        },

        // Method untuk timer
        startTimer() {
            // Clear existing timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            this.timerInterval = setInterval(() => {
                if (this.timer > 0) {
                    this.timer--;
                } else {
                    clearInterval(this.timerInterval);
                    if (!this.isAnswered) {
                        // Waktu habis, kirim jawaban null/kosong
                        this.message = '⏰ Waktu habis!';
                        this.submitAnswer(null);
                    }
                }
            }, 1000);
        },

        // Method untuk tampilkan game over screen
        showGameOverScreen(finalScores) {
            // Buat overlay untuk hasil akhir
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4';
            
            let scoresHTML = finalScores.slice(0, 10).map((player, index) => `
                <div class="flex items-center justify-between py-3 px-4 ${index === 0 ? 'bg-yellow-500/20' : index === 1 ? 'bg-gray-400/20' : index === 2 ? 'bg-orange-500/20' : 'bg-gray-800/50'} rounded-lg mb-2">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-gray-400'}">#${index + 1}</span>
                        <span class="text-lg font-semibold text-white">${player.name}</span>
                    </div>
                    <span class="text-xl font-bold text-purple-400">${player.score} pts</span>
                </div>
            `).join('');
            
            overlay.innerHTML = `
                <div class="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full border-2 border-purple-500">
                    <h2 class="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        🎉 Game Selesai! 🎉
                    </h2>
                    <div class="mb-6">
                        <h3 class="text-2xl font-semibold text-white mb-4">Leaderboard</h3>
                        ${scoresHTML}
                    </div>
                    <div class="text-center">
                        <button onclick="window.location.href='/'" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300">
                            Kembali ke Home
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
        }
    };
}
