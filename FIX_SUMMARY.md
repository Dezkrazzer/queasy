# RINGKASAN PERBAIKAN - Game Tidak Ditemukan & Quiz.ejs Error

## 🔧 MASALAH YANG DIPERBAIKI

### 1. Race Condition di create_game (CRITICAL FIX) ✅
**File**: `server.js`
**Lokasi**: Listener `create_game` (~line 310-340)

**Masalah**:
- `activeGames[gameCode]` di-assign **SETELAH** `await db.query()` INSERT
- Menyebabkan error "Game tidak ditemukan" karena client redirect sebelum activeGames ready

**Solusi**:
- Pindahkan assignment `activeGames[gameCode]` **SEBELUM** `await db.query()`
- Tambahkan field `questions: []` dan `hasAnswered: false` untuk setiap player

**Perubahan**:
```javascript
// SEBELUM (SALAH):
await db.query('INSERT INTO game_sessions ...');
activeGames[gameCode] = { ... };

// SESUDAH (BENAR):
activeGames[gameCode] = { 
    ..., 
    questions: [], 
    players: [{ ..., score: 0, hasAnswered: false }] 
};
await db.query('INSERT INTO game_sessions ...');
```

---

### 2. Quiz.ejs Tidak Fungsional ✅
**File**: `src/views/quiz.ejs`

**Masalah**:
- File lama menggunakan hardcoded HTML tanpa Alpine.js
- Tidak ada Socket.IO integration
- Tidak ada dynamic binding untuk pertanyaan dan jawaban

**Solusi**:
- Backup quiz.ejs lama ke `quiz_backup_old.ejs`
- Replace dengan `quiz_new.ejs` yang sudah ada Alpine.js + Socket.IO
- Update router untuk render `quiz.ejs` (bukan `quiz_new.ejs`)

**Fitur Baru**:
- ✅ Alpine.js `x-data="quizGame()"`
- ✅ Socket.IO listeners (game_question, question_result, game_over)
- ✅ Dynamic binding (x-text, x-for, @click)
- ✅ Timer countdown dengan x-text
- ✅ Disabled state untuk jawaban yang sudah disubmit
- ✅ Feedback message (Benar/Salah/Timeout)

---

### 3. Server-Side Quiz Logic ✅
**File**: `server.js`

**Penambahan**:

#### A. 3 Fungsi Helper (Sebelum io.on('connection'))
1. **sendQuestion(gameCode)**:
   - Kirim pertanyaan current ke semua player
   - Reset hasAnswered untuk semua player
   - Set timeout untuk auto-next jika tidak semua jawab

2. **showQuestionResult(gameCode)**:
   - Kirim skor sementara ke semua player
   - Tunggu 5 detik, lalu lanjut ke pertanyaan berikutnya

3. **endGame(gameCode)**:
   - Simpan skor ke database (tabel player_scores)
   - Kirim leaderboard final ke semua player
   - Hapus game dari activeGames setelah 30 detik

#### B. Update Listener start_game
**Perubahan**:
```javascript
// SEBELUM: Ambil hanya 1 pertanyaan
const [questions] = await db.query('... LIMIT 1');
io.to(gameCode).emit('game_started', questionData);

// SESUDAH: Ambil SEMUA pertanyaan
const [questions] = await db.query('... ORDER BY question_id');
game.questions = questions;
game.currentQuestionIndex = 0;
io.to(gameCode).emit('game_started'); // Tanpa data, hanya sinyal redirect
```

#### C. Tambah Listener Baru

1. **player_joined_quiz**:
   - Validasi game exists
   - Socket join room
   - Jika host pertama kali masuk → setTimeout 2s → sendQuestion()

2. **player_answer**:
   - Validasi game, player, dan belum jawab
   - Query jawaban benar dari database
   - Hitung skor: `100 + (timeLeft * 10)` jika benar
   - Update `player.score` dan `player.hasAnswered = true`
   - Emit `answer_result` ke player
   - Jika semua sudah jawab → setTimeout 3s → showQuestionResult()

---

### 4. Join Game Player Field ✅
**File**: `server.js`
**Lokasi**: Listener `join_game`

**Perubahan**:
Tambahkan field `hasAnswered: false` ketika player join:
```javascript
game.players.push({
    id: socket.id,
    name: playerName,
    isHost: false,
    score: 0,
    hasAnswered: false  // TAMBAHAN INI
});
```

---

### 5. Router Update ✅
**File**: `src/routers/IndexRouters.js`

**Perubahan**:
- Route `/quiz/:gameCode` sekarang render `quiz.ejs` (bukan `quiz_new.ejs`)
- Pass gameCode ke template via EJS

---

### 6. Lobby Redirect ✅
**File**: `src/views/lobby.ejs`

**Perubahan**:
Simplify listener `game_started`:
```javascript
// SEBELUM: Countdown animation + alert
socket.on('game_started', (firstQuestion) => {
    // ... countdown animation ...
    alert('GAME MULAI! ...');
});

// SESUDAH: Simple redirect
socket.on('game_started', () => {
    console.log('Game dimulai, redirect ke halaman quiz...');
    window.location.href = `/quiz/${gameCode}`;
});
```

---

## 📂 FILE YANG DIUBAH

### Modified:
1. ✅ `server.js` - Race condition fix, quiz logic, helper functions
2. ✅ `src/views/quiz.ejs` - Replace dengan Alpine.js version
3. ✅ `src/views/lobby.ejs` - Update game_started listener
4. ✅ `src/routers/IndexRouters.js` - Update route render quiz.ejs

### Created:
1. ✅ `src/views/quiz_backup_old.ejs` - Backup quiz.ejs lama
2. ✅ `FIX_SUMMARY.md` - File ini

### Existing (No Change):
1. ✅ `src/static/js/quiz.js` - Alpine.js logic (sudah ada sebelumnya)
2. ✅ `src/views/quiz_new.ejs` - Template baru (sudah dibuat sebelumnya)

---

## 🧪 TESTING CHECKLIST

### Test 1: Create Game
- [ ] Host login → Dashboard → Klik "Mulai Game"
- [ ] Game code muncul
- [ ] Redirect ke lobby
- [ ] **Expected**: Tidak ada error "Game tidak ditemukan"

### Test 2: Join Game
- [ ] Player buka homepage
- [ ] Masukkan game code dan nama
- [ ] Klik "Join Game"
- [ ] **Expected**: Redirect ke lobby, nama muncul di player list

### Test 3: Start Game from Lobby
- [ ] Host klik "Mulai Game" di lobby
- [ ] **Expected**: Semua player (termasuk host) redirect ke `/quiz/:gameCode`
- [ ] **Expected**: Tidak ada countdown animation

### Test 4: Quiz Page Load
- [ ] Halaman quiz muncul dengan:
  - [ ] Game code di navbar atas kiri
  - [ ] Timer di navbar atas kanan (belum countdown)
  - [ ] Skor 0 di navbar bawah kiri
  - [ ] Pertanyaan kosong (menunggu host)

### Test 5: Question Received
- [ ] Setelah 2 detik, pertanyaan pertama muncul
- [ ] Timer countdown dari time_limit (misal 20s → 19s → 18s...)
- [ ] 4 pilihan jawaban muncul dengan huruf A, B, C, D

### Test 6: Submit Answer
- [ ] Klik salah satu jawaban
- [ ] **Expected**: 
  - [ ] Jawaban disabled (tidak bisa klik lagi)
  - [ ] Feedback muncul (✅ Benar! atau ❌ Salah!)
  - [ ] Skor bertambah jika benar
  - [ ] Status "Menunggu pemain lain..." di bawah

### Test 7: Question Result
- [ ] Setelah semua player jawab (atau timeout)
- [ ] **Expected**: 
  - [ ] Emit `question_result` dengan skor sementara
  - [ ] Tunggu 5 detik
  - [ ] Lanjut ke pertanyaan berikutnya

### Test 8: Game Over
- [ ] Setelah pertanyaan terakhir
- [ ] **Expected**:
  - [ ] Emit `game_over` dengan leaderboard
  - [ ] Tampilkan overlay leaderboard (dari quiz.js)
  - [ ] Skor tersimpan di tabel player_scores

---

## 🐛 KNOWN ISSUES (Jika Ada)

### Issue 1: Timer tidak sync antar player
**Status**: MINOR
**Solusi**: Timer di-handle client-side, wajar jika ada delay 1-2 detik

### Issue 2: Host juga bisa jawab pertanyaan
**Status**: BY DESIGN
**Note**: Jika tidak ingin host jawab, tambahkan filter `if (player.isHost) return;` di listener `player_answer`

---

## 🚀 NEXT STEPS (Opsional)

1. **Real-time Player Status**: Tampilkan checkmark siapa yang sudah jawab
2. **Question Progress Bar**: Tampilkan "Pertanyaan 3/10"
3. **Sound Effects**: Tambahkan sound untuk benar/salah
4. **Animation**: Animasi transisi antar pertanyaan
5. **Replay**: Fitur replay game dengan skor lama

---

## 📊 DATABASE SCHEMA CHECK

Pastikan tabel memiliki struktur:

### game_sessions
- ✅ game_session_id (PRIMARY KEY)
- ✅ quiz_id (FOREIGN KEY)
- ✅ host_id (FOREIGN KEY)
- ✅ game_code (VARCHAR, UNIQUE)
- ✅ created_at (TIMESTAMP)

### player_scores
- ✅ score_id (PRIMARY KEY)
- ✅ game_session_id (FOREIGN KEY)
- ✅ player_name (VARCHAR)
- ✅ score (INT)
- ✅ created_at (TIMESTAMP)

### questions
- ✅ question_id (PRIMARY KEY)
- ✅ quiz_id (FOREIGN KEY)
- ✅ question_text (TEXT)
- ✅ time_limit (INT)
- ✅ created_at (TIMESTAMP)

### answers
- ✅ answer_id (PRIMARY KEY)
- ✅ question_id (FOREIGN KEY)
- ✅ answer_text (VARCHAR)
- ✅ is_correct (BOOLEAN) ← **PENTING!**
- ✅ created_at (TIMESTAMP)

---

**Dibuat**: 2025-10-22
**Oleh**: GitHub Copilot
**Status**: ✅ COMPLETED
