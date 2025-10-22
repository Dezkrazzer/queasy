/* src/static/js/quiz.js */

const socket = io({ path: "/queasy-socket/" });

function quizGame() {
    return {
        // State
        questionText: 'Menunggu pertanyaan...', 
        answers: [],
        timer: 0,
        score: 0,
        isAnswered: false,
        message: '',
        timerInterval: null,
        selectedAnswer: null,

        // Fungsi init dipanggil oleh Alpine saat komponen dimuat
        init() {
            console.log('Alpine.js init, gameCode:', gameCode);

            // 1. Beritahu server kita sudah masuk halaman kuis
            socket.emit('player_joined_quiz', { code: gameCode });

            // 2. Listener untuk pertanyaan baru
            socket.on('game_question', (data) => {
                console.log('Pertanyaan baru diterima:', data);
                this.questionText = data.question.question_text;
                this.answers = data.answers; // Array jawaban
                this.timer = data.question.time_limit;
                this.isAnswered = false; // Reset status jawaban
                this.message = '';
                this.selectedAnswer = null;
                this.startTimer();
            });

            // 3. Listener untuk hasil jawaban (setelah timer habis)
            socket.on('question_result', (data) => {
                console.log('Hasil jawaban:', data);
                this.isAnswered = true; // Kunci jawaban
                this.message = data.isCorrect ? '✅ Jawaban Benar! +' + (data.newScore - this.score) + ' poin' : '❌ Jawaban Salah!';
                this.score = data.newScore; // Update skor dari server
                
                // Stop timer
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
            });

            // 4. Listener untuk game over
            socket.on('game_over', (data) => {
                console.log('Game selesai! Skor akhir:', data.finalScores);
                
                // Stop timer
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
                
                // Tampilkan hasil
                this.showGameOverScreen(data.finalScores);
            });

            // 5. Listener untuk error
            socket.on('error', (data) => {
                console.error('Error:', data.message);
                this.message = 'Error: ' + data.message;
            });
        },

        // Method untuk mengirim jawaban
        submitAnswer(answerId) {
            if (this.isAnswered) return; // Sudah menjawab
            
            this.isAnswered = true;
            this.selectedAnswer = answerId;
            this.message = '⏳ Jawaban terkirim, menunggu hasil...';
            
            socket.emit('player_answer', {
                code: gameCode,
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
