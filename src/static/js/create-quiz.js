function quizForm() {
    return {
        // State
        title: '',
        description: '',
        questions: [
            {
                question_text: '',
                time_limit: 30,
                answers: [
                    { text: '', is_correct: true },
                    { text: '', is_correct: false },
                    { text: '', is_correct: false },
                    { text: '', is_correct: false }
                ]
            }
        ],
        loading: false,
        error: '',

        // Methods
        addQuestion() {
            this.questions.push({
                question_text: '',
                time_limit: 30,
                answers: [
                    { text: '', is_correct: true },
                    { text: '', is_correct: false },
                    { text: '', is_correct: false },
                    { text: '', is_correct: false }
                ]
            });
        },

        removeQuestion(qIndex) {
            if (this.questions.length > 1) {
                this.questions.splice(qIndex, 1);
            }
        },

        addAnswer(qIndex) {
            if (this.questions[qIndex].answers.length < 6) {
                this.questions[qIndex].answers.push({
                    text: '',
                    is_correct: false
                });
            }
        },

        removeAnswer(qIndex, aIndex) {
            if (this.questions[qIndex].answers.length > 2) {
                // Jika jawaban yang dihapus adalah jawaban benar, set jawaban pertama sebagai benar
                if (this.questions[qIndex].answers[aIndex].is_correct) {
                    this.questions[qIndex].answers.splice(aIndex, 1);
                    this.questions[qIndex].answers[0].is_correct = true;
                } else {
                    this.questions[qIndex].answers.splice(aIndex, 1);
                }
            }
        },

        setCorrectAnswer(qIndex, aIndex) {
            // Set semua jawaban menjadi false
            this.questions[qIndex].answers.forEach(answer => {
                answer.is_correct = false;
            });
            // Set jawaban yang dipilih menjadi true
            this.questions[qIndex].answers[aIndex].is_correct = true;
        },

        validateForm() {
            // Validasi judul dan deskripsi
            if (!this.title.trim()) {
                this.error = 'Judul kuis harus diisi!';
                return false;
            }

            if (!this.description.trim()) {
                this.error = 'Deskripsi kuis harus diisi!';
                return false;
            }

            // Validasi setiap pertanyaan
            for (let i = 0; i < this.questions.length; i++) {
                const question = this.questions[i];

                if (!question.question_text.trim()) {
                    this.error = `Pertanyaan ${i + 1} harus diisi!`;
                    return false;
                }

                if (question.time_limit < 5 || question.time_limit > 300) {
                    this.error = `Batas waktu pertanyaan ${i + 1} harus antara 5-300 detik!`;
                    return false;
                }

                // Validasi jawaban
                const filledAnswers = question.answers.filter(a => a.text.trim());
                if (filledAnswers.length < 2) {
                    this.error = `Pertanyaan ${i + 1} harus memiliki minimal 2 jawaban!`;
                    return false;
                }

                // Pastikan ada satu jawaban benar
                const hasCorrectAnswer = question.answers.some(a => a.is_correct && a.text.trim());
                if (!hasCorrectAnswer) {
                    this.error = `Pertanyaan ${i + 1} harus memiliki jawaban yang benar!`;
                    return false;
                }
            }

            return true;
        },

        async submitForm() {
            // Reset error
            this.error = '';

            // Validasi form
            if (!this.validateForm()) {
                setTimeout(() => {
                    this.error = '';
                }, 3000);
                return;
            }

            // Filter jawaban yang kosong
            const cleanedQuestions = this.questions.map(q => ({
                question_text: q.question_text.trim(),
                time_limit: q.time_limit,
                answers: q.answers.filter(a => a.text.trim()).map(a => ({
                    text: a.text.trim(),
                    is_correct: a.is_correct
                }))
            }));

            // Kirim data ke backend
            this.loading = true;

            try {
                const response = await fetch('/api/quiz/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: this.title.trim(),
                        description: this.description.trim(),
                        questions: cleanedQuestions
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Redirect ke dashboard
                    window.location.href = data.redirect || '/dashboard';
                } else {
                    this.error = data.error || 'Terjadi kesalahan saat menyimpan kuis';
                    setTimeout(() => {
                        this.error = '';
                    }, 3000);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                this.error = 'Terjadi kesalahan saat menghubungi server';
                setTimeout(() => {
                    this.error = '';
                }, 3000);
            } finally {
                this.loading = false;
            }
        }
    };
}
