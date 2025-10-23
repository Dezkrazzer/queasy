# 🧪 PANDUAN TESTING - Queasy Quiz Application

## ✅ PERBAIKAN YANG SUDAH DILAKUKAN

1. **Race Condition di create_game** - activeGames sekarang di-assign SEBELUM db.query
2. **Quiz.ejs Error** - Diganti dengan versi Alpine.js + Socket.IO yang fungsional
3. **Server-side Quiz Logic** - Tambah 3 fungsi helper + 2 listener baru
4. **Start Game** - Update untuk load SEMUA pertanyaan, bukan hanya 1
5. **Lobby Redirect** - Simple redirect tanpa countdown animation

---

## 📝 LANGKAH TESTING

### FASE 1: Test Create Game & Join

#### Step 1: Login sebagai Host
1. Buka browser: `http://localhost:1072/login`
2. Login dengan akun host yang sudah terdaftar
3. **Expected**: Redirect ke `/dashboard`
4. **Expected**: Terlihat daftar quiz

#### Step 2: Create Game
1. Di dashboard, klik tombol **"Mulai Game"** pada salah satu quiz
2. **Expected**: 
   - Console log: `> 🎮 • Game baru dibuat oleh [username] dengan kode: XXXXXX`
   - Modal muncul dengan game code
   - **TIDAK ADA** error "Game tidak ditemukan"
3. Klik tombol di modal untuk ke lobby
4. **Expected**: Redirect ke `/lobby/XXXXXX`

#### Step 3: Join sebagai Player
1. Buka **browser baru** (atau incognito/private window)
2. Buka: `http://localhost:1072`
3. Masukkan game code dari Step 2
4. Masukkan nama player (contoh: "Player1")
5. Klik **"Join Game"**
6. **Expected**:
   - Console log: `> 👤 • [socket.id] (Player1) bergabung ke game: XXXXXX`
   - Redirect ke `/lobby/XXXXXX`
   - Nama "Player1" muncul di player list
   - Host juga melihat "Player1" di player list

---

### FASE 2: Test Start Game & Quiz

#### Step 4: Start Game dari Lobby
1. Di browser **Host**, klik tombol **"Mulai Game"**
2. **Expected di Console**:
   ```
   > 🚀 • Game XXXXXX dimulai oleh host!
   > 📋 • Loaded X pertanyaan untuk game XXXXXX
   > ✅ • Game XXXXXX siap dimulai dengan 2 pemain
   ```
3. **Expected di Browser**:
   - **TIDAK ADA** countdown animation 3-2-1
   - **TIDAK ADA** alert dengan pertanyaan
   - Langsung redirect ke `/quiz/XXXXXX` (Host dan Player)

#### Step 5: Quiz Page Load
1. Di browser Host dan Player, halaman quiz muncul
2. **Expected**:
   - Navbar atas kiri: Game code (XXXXXX)
   - Navbar atas kanan: Timer (belum countdown, masih 0s atau default)
   - Navbar bawah kiri: Skor (0)
   - Pertanyaan: "Menunggu..." atau kosong
   - Status bawah: "Pilih jawaban Anda!"

#### Step 6: Pertanyaan Pertama Muncul
1. Setelah **2 detik**, pertanyaan pertama otomatis muncul
2. **Expected di Console**:
   ```
   > 🎮 • Player [socket.id] joined quiz XXXXXX
   > 🏁 • Host [socket.id] akan memulai pertanyaan pertama
   > 📤 • Mengirim pertanyaan 1/X ke game XXXXXX
   ```
3. **Expected di Browser**:
   - Pertanyaan muncul di tengah
   - 4 pilihan jawaban (A, B, C, D) dengan teks dari database
   - Timer mulai countdown (misal: 20s → 19s → 18s...)

---

### FASE 3: Test Answer & Scoring

#### Step 7: Host Menjawab
1. Di browser **Host**, klik salah satu jawaban (misal: pilihan B)
2. **Expected**:
   - Tombol jawaban berubah warna (purple border)
   - Semua tombol disabled (tidak bisa klik lagi)
   - Status bawah: "Menunggu pemain lain..."
   - Jika benar: Feedback "✅ Benar!" (hijau)
   - Jika salah: Feedback "❌ Salah!" (merah)
   - Jika benar: Skor bertambah (misal: 100 + (15 * 10) = 250)

#### Step 8: Player Menjawab
1. Di browser **Player**, klik jawaban (misal: pilihan C)
2. **Expected**: Sama seperti Step 7
3. **Expected di Console**:
   ```
   > ✅ • Host BENAR! +250 poin (total: 250)
   > ❌ • Player1 salah
   > 🎯 • Semua player sudah menjawab di game XXXXXX
   ```

#### Step 9: Question Result
1. Setelah **3 detik** dari semua player jawab
2. **Expected di Console**:
   ```
   > 📊 • Hasil pertanyaan 1 dikirim
   ```
3. **Expected di Browser**:
   - Emit `question_result` dengan skor sementara (belum diimplementasikan di quiz.js, tapi server sudah emit)

#### Step 10: Pertanyaan Berikutnya
1. Setelah **5 detik** dari question_result
2. **Expected**:
   - Pertanyaan baru muncul
   - Timer reset ke time_limit
   - Tombol jawaban aktif kembali
   - Skor tetap sama (tidak reset)
   - Ulangi Step 7-9 untuk setiap pertanyaan

---

### FASE 4: Test Game Over

#### Step 11: Pertanyaan Terakhir
1. Setelah pertanyaan terakhir dijawab semua player
2. **Expected di Console**:
   ```
   > 🏁 • Game XXXXXX selesai!
   > 🏆 • Game XXXXXX berakhir, menyimpan skor...
   > ✅ • Skor disimpan, game XXXXXX selesai
   ```
3. **Expected di Browser**:
   - Emit `game_over` dengan leaderboard
   - quiz.js akan menampilkan overlay leaderboard (via `showGameOverScreen()`)
   - Leaderboard menampilkan ranking, nama, dan skor

#### Step 12: Database Check
1. Buka database client (MySQL Workbench / phpMyAdmin)
2. Query: `SELECT * FROM player_scores WHERE game_session_id = (SELECT game_session_id FROM game_sessions WHERE game_code = 'XXXXXX')`
3. **Expected**: Muncul 1 row untuk "Player1" dengan skor yang benar
4. **Expected**: TIDAK ADA row untuk Host (karena `if (!player.isHost)`)

---

## 🐛 TROUBLESHOOTING

### Error: "Game tidak ditemukan"
**Kemungkinan Penyebab**:
- Server.js belum restart setelah perubahan
- Race condition masih ada (cek apakah activeGames di-assign sebelum await)

**Solusi**:
1. Stop server (Ctrl+C)
2. `node server.js`
3. Test ulang dari Step 1

---

### Pertanyaan tidak muncul
**Kemungkinan Penyebab**:
- Fungsi `sendQuestion()` belum ditambahkan
- Listener `player_joined_quiz` belum ditambahkan
- Quiz tidak punya pertanyaan di database

**Solusi**:
1. Cek console server: apakah ada log `> 📤 • Mengirim pertanyaan ...`?
2. Cek database: `SELECT * FROM questions WHERE quiz_id = X`
3. Cek browser console: apakah ada error JavaScript?

---

### Timer tidak countdown
**Kemungkinan Penyebab**:
- Alpine.js belum loaded
- quiz.js belum loaded
- Socket tidak receive `game_question`

**Solusi**:
1. Buka browser console (F12)
2. Cek error: apakah ada "Alpine is not defined" atau "socket is not defined"?
3. Cek Network tab: apakah quiz.js ter-load?
4. Cek Console: apakah ada log `[quiz.js] Received game_question`?

---

### Jawaban tidak diproses
**Kemungkinan Penyebab**:
- Listener `player_answer` belum ditambahkan
- Database answers tidak punya kolom `is_correct`

**Solusi**:
1. Cek console server: apakah ada log `> ✅ • [nama] BENAR!` atau `> ❌ • [nama] salah`?
2. Cek database: `SELECT * FROM answers WHERE question_id = X`
3. Pastikan ada 1 row dengan `is_correct = 1`

---

### Skor tidak tersimpan
**Kemungkinan Penyebab**:
- Fungsi `endGame()` belum ditambahkan
- Tabel `player_scores` tidak ada

**Solusi**:
1. Cek console server: apakah ada log `> ✅ • Skor disimpan`?
2. Cek error: `ER_NO_SUCH_TABLE: Table 'queasy_data.player_scores' doesn't exist`
3. Jika tabel tidak ada, run `initiateDB.js` atau create manual

---

## ✅ CHECKLIST FINAL

Setelah testing selesai, pastikan:

- [ ] Host bisa create game tanpa error "Game tidak ditemukan"
- [ ] Player bisa join game dan redirect ke lobby
- [ ] Host bisa start game, semua redirect ke `/quiz/XXXXXX`
- [ ] Pertanyaan muncul setelah 2 detik
- [ ] Timer countdown dengan benar
- [ ] Jawaban bisa disubmit dan disabled setelah submit
- [ ] Skor bertambah jika jawaban benar
- [ ] Lanjut ke pertanyaan berikutnya setelah 5 detik
- [ ] Game over muncul setelah pertanyaan terakhir
- [ ] Skor tersimpan di database tabel `player_scores`

---

## 📊 EXPECTED CONSOLE LOG (Complete Flow)

```
> 🎮 • Game baru dibuat oleh Host (host_id: 1) dengan kode: ABC123
> 👤 • xyz123 (Player1) bergabung ke game: ABC123
> 🚀 • Game ABC123 dimulai oleh host!
> 📋 • Loaded 5 pertanyaan untuk game ABC123
> ✅ • Game ABC123 siap dimulai dengan 2 pemain
> 🎮 • Player abc456 joined quiz ABC123
> 🎮 • Player xyz123 joined quiz ABC123
> 🏁 • Host abc456 akan memulai pertanyaan pertama
> 📤 • Mengirim pertanyaan 1/5 ke game ABC123
> ✅ • Host BENAR! +250 poin (total: 250)
> ❌ • Player1 salah
> 🎯 • Semua player sudah menjawab di game ABC123
> 📊 • Hasil pertanyaan 1 dikirim
> 📤 • Mengirim pertanyaan 2/5 ke game ABC123
... (ulangi untuk pertanyaan 2-4)
> 📤 • Mengirim pertanyaan 5/5 ke game ABC123
> ✅ • Host BENAR! +180 poin (total: 930)
> ✅ • Player1 BENAR! +200 poin (total: 200)
> 🎯 • Semua player sudah menjawab di game ABC123
> 📊 • Hasil pertanyaan 5 dikirim
> 🏁 • Game ABC123 selesai!
> 🏆 • Game ABC123 berakhir, menyimpan skor...
> ✅ • Skor disimpan, game ABC123 selesai
```

---

**Happy Testing! 🎉**

Jika ada error atau pertanyaan, cek:
1. Console server (terminal)
2. Browser console (F12)
3. Database (query manual)
4. File FIX_SUMMARY.md untuk detail perbaikan
