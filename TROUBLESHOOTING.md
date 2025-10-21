# 🐛 Troubleshooting & FAQ - Queasy

## 🔧 Common Issues & Solutions

### 1. Database Connection Issues

#### Error: `ER_ACCESS_DENIED_ERROR`
```
Error: Access denied for user 'root'@'localhost'
```

**Solusi:**
- Cek kredensial di file `.env`
- Pastikan `DB_USER` dan `DB_PASSWORD` benar
- Test koneksi MySQL: `mysql -u root -p`

#### Error: `ER_BAD_DB_ERROR`
```
Error: Unknown database 'queasy_db'
```

**Solusi:**
```sql
-- Buat database terlebih dahulu
mysql -u root -p
CREATE DATABASE queasy_db;
exit;
```

#### Error: `ECONNREFUSED`
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solusi:**
- Pastikan MySQL server berjalan
- Windows: Check Services (Win+R → `services.msc`)
- Linux/Mac: `sudo service mysql status`
- Restart MySQL jika perlu

---

### 2. NPM & Installation Issues

#### Error: PowerShell execution policy
```
npm: cannot be loaded because running scripts is disabled
```

**Solusi:**
```powershell
# Buka PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Atau gunakan cmd:
```bash
cmd /c "npm install bcrypt"
```

#### Error: bcrypt build failed
```
Error: node-gyp rebuild failed
```

**Solusi:**
1. Install Visual Studio Build Tools
2. Atau gunakan pre-built binary:
```bash
npm install bcrypt --build-from-source=false
```

---

### 3. Session & Authentication Issues

#### Error: "Anda harus login sebagai host"
**Penyebab:** Session tidak tersimpan atau sudah expire

**Solusi:**
1. Clear browser cookies
2. Restart server
3. Login ulang

#### Error: Password salah padahal benar
**Penyebab:** Data seed mungkin tidak sesuai

**Solusi:**
```bash
# Hapus data lama dan seed ulang
node seed-db.js
```

Login dengan:
- Username: `admin`
- Password: `password123`

#### Redirect loop ke /login
**Penyebab:** Session middleware tidak jalan

**Solusi:**
1. Cek apakah `express-session` sudah di-install
2. Restart server
3. Clear browser cache

---

### 4. Socket.IO Issues

#### Socket tidak connect
**Gejala:** Console error: `Failed to connect`

**Solusi:**
```javascript
// Cek path Socket.IO di client
const socket = io({
    path: "/queasy-socket/"  // Harus sama dengan server
});
```

#### Event tidak terkirim
**Penyebab:** Socket belum ready atau disconnect

**Solusi:**
```javascript
// Tambahkan event listener
socket.on('connect', () => {
    console.log('Socket connected!');
});

socket.on('disconnect', () => {
    console.log('Socket disconnected!');
});
```

#### Room tidak berfungsi
**Penyebab:** Game code salah atau game sudah tidak aktif

**Solusi:**
1. Cek `activeGames` object di server
2. Restart server untuk clear memory
3. Buat game baru

---

### 5. Database Schema Issues

#### Error: `ER_NO_REFERENCED_ROW_2`
```
Cannot add or update a child row: a foreign key constraint fails
```

**Penyebab:** Foreign key reference tidak ada

**Solusi:**
```bash
# Drop dan recreate semua tabel
mysql -u root -p queasy_db < database-schema.sql
```

#### Error: `ER_DUP_ENTRY`
```
Duplicate entry 'admin' for key 'username'
```

**Penyebab:** Username atau email sudah terdaftar

**Solusi:**
- Gunakan username/email yang berbeda
- Atau hapus data lama:
```sql
DELETE FROM hosts WHERE username = 'admin';
```

---

### 6. Quiz & Game Issues

#### "Tidak ada pertanyaan dalam kuis ini"
**Penyebab:** Kuis belum memiliki pertanyaan

**Solusi:**
```bash
# Seed data contoh
node seed-db.js
```

Atau tambah manual ke database:
```sql
INSERT INTO questions (quiz_id, question_text, time_limit) 
VALUES (1, 'Contoh Pertanyaan?', 30);

INSERT INTO answers (question_id, answer_text, is_correct) 
VALUES 
(1, 'Jawaban A', TRUE),
(1, 'Jawaban B', FALSE);
```

#### Game code tidak ditemukan
**Penyebab:** Game sudah expire atau belum dibuat

**Solusi:**
1. Host harus buat game dulu
2. Gunakan game code yang baru
3. Jangan reload page host sebelum players join

---

## ❓ Frequently Asked Questions

### Q: Apakah pemain perlu registrasi?
**A:** Tidak! Pemain (Guest) hanya perlu:
- Input nama
- Input game code
- Langsung bisa main

### Q: Bagaimana cara membuat quiz baru?
**A:** Saat ini belum ada UI untuk create quiz. Anda bisa:
1. Insert manual via database
2. Atau tunggu fitur create quiz UI (coming soon)

Contoh manual:
```sql
INSERT INTO quizzes (host_id, title, description) 
VALUES (1, 'Quiz Baru', 'Deskripsi quiz');
```

### Q: Berapa lama game code valid?
**A:** Game code disimpan di memory (`activeGames`). Valid selama:
- Server tidak di-restart
- Host tidak meninggalkan page

### Q: Bisa main multiple quiz bersamaan?
**A:** Ya! Setiap game punya unique code dan room terpisah.

### Q: Bagaimana cara melihat skor akhir?
**A:** Saat ini skor dikirim via Socket.IO event `answer_result`. Untuk menyimpan ke database, tambahkan:
```javascript
// Di server.js setelah game selesai
await db.query(
    'INSERT INTO player_scores (session_id, player_name, score) VALUES (?, ?, ?)',
    [sessionId, playerName, totalScore]
);
```

### Q: Apakah data pemain disimpan?
**A:** Hanya `player_name` dan `score` yang disimpan di tabel `player_scores` setelah game selesai.

### Q: Bagaimana cara reset password host?
**A:** Saat ini belum ada fitur forgot password. Reset manual:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('newpassword', 10);

// Update di database
UPDATE hosts SET password_hash = '...' WHERE username = 'admin';
```

### Q: Bisa deploy ke production?
**A:** Ya, tapi perlu beberapa penyesuaian:
1. Gunakan environment variables yang aman
2. Setup Redis untuk session store
3. Gunakan WebSocket reverse proxy (Nginx)
4. Enable HTTPS
5. Setup database backup

### Q: Apakah support multiple languages?
**A:** Belum. Saat ini UI dalam Bahasa Indonesia. Untuk internationalization, perlu tambahkan i18n library.

---

## 🔍 Debugging Tips

### 1. Enable Verbose Logging

Tambahkan di `server.js`:
```javascript
// Log semua socket events
io.on('connection', (socket) => {
    socket.onAny((eventName, ...args) => {
        console.log(`[SOCKET] Event: ${eventName}`, args);
    });
});

// Log semua database queries
const originalQuery = db.query;
db.query = async function(...args) {
    console.log('[DB QUERY]', args[0]);
    return originalQuery.apply(this, args);
};
```

### 2. Check Browser Console

Buka DevTools (F12) dan cek:
- Console tab: JavaScript errors
- Network tab: XHR/Fetch requests
- Application tab: Session cookies

### 3. Check Server Logs

Monitor terminal untuk error messages:
```bash
node server.js | tee server.log
```

### 4. Database Debugging

```sql
-- Cek data hosts
SELECT * FROM hosts;

-- Cek game sessions aktif
SELECT * FROM game_sessions ORDER BY played_at DESC LIMIT 10;

-- Cek pertanyaan per quiz
SELECT q.quiz_id, q.title, COUNT(qu.question_id) as total_questions
FROM quizzes q
LEFT JOIN questions qu ON q.quiz_id = qu.quiz_id
GROUP BY q.quiz_id;
```

---

## 📞 Getting Help

Jika masih mengalami masalah:

1. **Cek error message lengkap** di console browser dan terminal
2. **Pastikan semua steps di SETUP.md sudah diikuti**
3. **Test dengan data seed** (`node seed-db.js`)
4. **Restart server dan clear browser cache**
5. **Cek file logs** jika ada

---

## 🔄 Reset to Clean State

Jika ingin mulai dari awal:

```bash
# 1. Drop semua tabel
mysql -u root -p
DROP DATABASE queasy_db;
CREATE DATABASE queasy_db;
exit;

# 2. Re-initialize
node init-db.js

# 3. Seed data baru
node seed-db.js

# 4. Restart server
node server.js
```

---

## 📋 Checklist Sebelum Deploy

- [ ] `.env` file tidak di-commit ke Git
- [ ] Password default sudah diganti
- [ ] Database credentials aman
- [ ] Session secret sudah random dan kuat
- [ ] Error handling sudah proper
- [ ] Input validation sudah lengkap
- [ ] SQL injection prevention (parameterized queries ✅)
- [ ] XSS prevention (input sanitization)
- [ ] CORS policy sudah dikonfigurasi
- [ ] Rate limiting untuk API endpoints

---

**Last Updated:** 2025-01-21  
**Version:** 1.0.0
