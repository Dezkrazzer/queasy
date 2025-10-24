/* src/static/js/admin-live.js */

const socket = io({ path: "/queasy-socket/" });

let pieChart = null;

function adminLiveQuiz(gameCode) {
    return {
        // State
        gameCode: gameCode,
        quizTitle: 'Loading Quiz...',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        timer: 0,
        timerInterval: null,
        participants: [],
        currentQuestion: {
            question_id: null,
            question_text: 'Loading question...',
            answers: []
        },
        stats: {
            correct: 0,
            incorrect: 0,
            unattempted: 0
        },
        blurAnswers: false,
        showCorrectAnswer: false,
        isFullscreen: false,

        // Fungsi init dipanggil oleh Alpine saat komponen dimuat
        init() {
            console.log('[Admin Live] Initializing for game:', this.gameCode);

            // Join sebagai admin observer
            socket.emit('admin_join_live', { gameCode: this.gameCode });

            // Listener untuk data game
            socket.on('game_data', (data) => {
                console.log('[Admin Live] Game data received:', data);
                this.quizTitle = data.quizTitle || 'Quiz Live';
                this.totalQuestions = data.totalQuestions || 0;
                this.currentQuestionIndex = data.currentQuestionIndex || 0;
                this.participants = data.participants || [];
                this.updateStats();
            });

            // Listener untuk pertanyaan baru
            socket.on('game_question', (data) => {
                console.log('[Admin Live] New question:', data);
                // Handle both structures: from admin_join_live and from sendQuestion
                const questionData = data.question || data;
                this.currentQuestion = {
                    question_id: questionData.question_id,
                    question_text: questionData.question_text,
                    answers: questionData.answers || []
                };
                this.currentQuestionIndex = (data.questionIndex !== undefined) ? data.questionIndex : (data.question_number - 1);
                this.timer = questionData.time_limit;
                this.startTimer();
                
                // Reset participant answer status for new question
                this.participants.forEach(p => {
                    p.hasAnswered = false;
                    p.answerId = null;
                    p.isCorrect = null;
                });
                
                this.updateStats();
                this.updatePieChart();
                feather.replace();
            });

            // Listener untuk update participant
            socket.on('participants_update', (data) => {
                console.log('[Admin Live] Participants updated:', data);
                // Server sends array directly, not wrapped in object
                const newParticipants = Array.isArray(data) ? data : (data.participants || []);
                
                // Merge with existing participants to preserve isCorrect and answerId
                newParticipants.forEach(newP => {
                    const existingP = this.participants.find(p => p.id === newP.id);
                    if (existingP) {
                        // Preserve answer data when updating
                        newP.answerId = existingP.answerId;
                        newP.isCorrect = existingP.isCorrect;
                    }
                });
                
                this.participants = newParticipants;
                this.updateStats();
                this.updatePieChart();
                feather.replace();
            });

            // Listener untuk player answer (real-time)
            socket.on('player_answered', (data) => {
                console.log('[Admin Live] Player answered:', data);
                // Update participant status
                const participant = this.participants.find(p => p.id === data.playerId);
                if (participant) {
                    participant.hasAnswered = true;
                    participant.answerId = data.answerId;
                    participant.isCorrect = data.isCorrect; // Save if answer was correct
                    this.updateStats();
                    this.updatePieChart();
                }
            });

            // Listener untuk question result
            socket.on('question_result', (data) => {
                console.log('[Admin Live] Question result:', data);
                if (data.scores) {
                    // Update scores
                    data.scores.forEach(scoreData => {
                        const participant = this.participants.find(p => p.name === scoreData.name);
                        if (participant) {
                            participant.score = scoreData.score;
                        }
                    });
                }
            });

            // Listener untuk game over
            socket.on('game_over', (data) => {
                console.log('[Admin Live] Game over:', data);
                this.stopTimer();
                alert('Quiz has ended!');
            });

            // Initialize pie chart
            this.$nextTick(() => {
                this.initPieChart();
            });
        },

        // Start timer
        startTimer() {
            this.stopTimer();
            this.timerInterval = setInterval(() => {
                if (this.timer > 0) {
                    this.timer--;
                } else {
                    this.stopTimer();
                }
            }, 1000);
        },

        // Stop timer
        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        },

        // Format time (seconds to MM:SS)
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },

        // Update statistics
        updateStats() {
            let correct = 0;
            let incorrect = 0;
            let unattempted = 0;

            this.participants.forEach(p => {
                if (!p.hasAnswered) {
                    unattempted++;
                } else {
                    // Use isCorrect from server (already validated)
                    if (p.isCorrect === true) {
                        correct++;
                    } else {
                        incorrect++;
                    }
                }
            });

            this.stats = { correct, incorrect, unattempted };
        },

        // Get answer count
        getAnswerCount(answerId) {
            return this.participants.filter(p => p.answerId === answerId).length;
        },

        // Get submitted count
        getSubmittedCount() {
            return this.participants.filter(p => p.hasAnswered).length;
        },

        // Initialize pie chart
        initPieChart() {
            const ctx = document.getElementById('answerPieChart');
                if (!ctx) {
                    console.error('[Admin Live] Canvas element "answerPieChart" not found');
                    return;
                }
            
                // Destroy existing chart if any
                if (pieChart) {
                    pieChart.destroy();
                }

            pieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Correct', 'Incorrect', 'Unattempted'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',   // Green
                            'rgba(239, 68, 68, 0.8)',   // Red
                            'rgba(156, 163, 175, 0.8)'  // Gray
                        ],
                        borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(156, 163, 175, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'rgb(255, 255, 255)',
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += context.parsed + ' participants';
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        },

        // Update pie chart
        updatePieChart() {
            if (pieChart) {
                    console.log('[Admin Live] Updating pie chart:', this.stats);
                pieChart.data.datasets[0].data = [
                    this.stats.correct,
                    this.stats.incorrect,
                    this.stats.unattempted
                ];
                pieChart.update();
                } else {
                    console.warn('[Admin Live] Pie chart not initialized, attempting to initialize...');
                    this.initPieChart();
            }
        },

        // Toggle blur
        toggleBlur() {
            this.blurAnswers = !this.blurAnswers;
        },

        // Toggle fullscreen
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                this.isFullscreen = true;
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    this.isFullscreen = false;
                }
            }
        },

        // Navigation
        previousQuestion() {
            if (this.currentQuestionIndex > 0) {
                socket.emit('admin_navigate_question', {
                    gameCode: this.gameCode,
                    direction: 'prev'
                });
            }
        },

        nextQuestion() {
            if (this.currentQuestionIndex < this.totalQuestions - 1) {
                socket.emit('admin_navigate_question', {
                    gameCode: this.gameCode,
                    direction: 'next'
                });
            }
        },

        // End quiz
        endQuiz() {
            if (confirm('Are you sure you want to end this quiz? This action cannot be undone.')) {
                socket.emit('admin_end_quiz', { gameCode: this.gameCode });
                window.location.href = '/dashboard';
            }
        }
    }
}
