# Panduan Setup Queasy - Model Asimetris

## Langkah-langkah Setup

### 1️⃣ Setup Database MySQL

**a. Buat Database Baru**
```sql
CREATE DATABASE queasy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**b. Update file `.env`**
```env
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=      # Isi dengan password MySQL Anda
DB_NAME=queasy_db
```

### 2️⃣ Inisialisasi Tabel Database

Jalankan script inisialisasi untuk membuat semua tabel:

```bash
node init-db.js
```

Output yang diharapkan:
```
✅ Koneksi ke database berhasil!
✅ Tabel "hosts" berhasil dibuat/sudah ada.
✅ Tabel "quizzes" berhasil dibuat/sudah ada.
✅ Tabel "questions" berhasil dibuat/sudah ada.
✅ Tabel "answers" berhasil dibuat/sudah ada.
✅ Tabel "game_sessions" berhasil dibuat/sudah ada.
✅ Tabel "player_scores" berhasil dibuat/sudah ada.

🎉 Semua tabel berhasil diinisialisasi!
```

### 3️⃣ Seed Data Contoh (Opsional tapi Disarankan)

Untuk menambahkan akun host dan quiz contoh:

```bash
node seed-db.js
```

Ini akan membuat:
- ✅ Host dengan username: `admin`, password: `password123`
- ✅ 1 Quiz dengan 3 pertanyaan

### 4️⃣ Jalankan Aplikasi

```bash
node server.js
```

Buka browser: **http://localhost:3000**

---

## 🧪 Testing Aplikasi

### Test 1: Register & Login Host

1. Buka **http://localhost:3000**
2. Klik **"Create Quiz"**
3. Akan redirect ke **/login**
4. Klik link **"Daftar di sini"** untuk register
5. Isi form:
   - Username: `testhost`
   - Email: `test@example.com`
   - Password: `test123`
6. Klik **"Register"**
7. Setelah berhasil, login dengan kredensial yang sama

### Test 2: Membuat Game (jika sudah ada quiz)

1. Login sebagai host (gunakan `admin` / `password123` jika sudah seed)
2. Di Dashboard, klik **"Mulai Game"** pada salah satu quiz
3. Catat **Game Code** yang muncul
4. Anda akan diarahkan ke lobby

### Test 3: Join Game sebagai Player

1. Buka tab/window browser baru (incognito mode)
2. Buka **http://localhost:3000**
3. Isi form:
   - **Enter Your Name**: Masukkan nama (misal: "Player 1")
   - **Enter Game Code**: Masukkan kode yang didapat dari Host
4. Klik **"Join Quiz"**
5. Anda akan masuk ke lobby

---

## ✅ Checklist Hasil Refactoring

### Database
- [x] File `src/utils/db.js` - Connection pool MySQL
- [x] File `init-db.js` - Script inisialisasi tabel
- [x] File `seed-db.js` - Script seed data contoh
- [x] File `.env` - Konfigurasi database

### Backend (server.js)
- [x] Import `bcrypt` dan `db`
- [x] Rute `POST /api/register`
- [x] Rute `POST /api/login`
- [x] Rute `GET /api/logout`
- [x] Socket.IO `create_game` - Accept `quiz_id`, validasi session
- [x] Socket.IO `join_game` - Accept `name` dan `code`
- [x] Socket.IO `start_game` - Load question dari DB
- [x] Socket.IO `submit_answer` - Validasi jawaban dan hitung skor

### Frontend
- [x] `index.ejs` - Input nama untuk Guest Player
- [x] `index.js` - Validasi nama, redirect Create Quiz ke dashboard
- [x] `login.ejs` - Halaman login Host
- [x] `register.ejs` - Halaman register Host
- [x] `dashboard.ejs` - Dashboard Host dengan daftar quiz

### Router
- [x] `IndexRouters.js` - Rute `/login`
- [x] `IndexRouters.js` - Rute `/register`
- [x] `IndexRouters.js` - Rute `/dashboard` (protected)

---

## 🗂️ Struktur File Baru

```
queasy/
├── .env                          # ✨ Modified - Tambah config DB
├── init-db.js                    # ✨ New - Script inisialisasi tabel
├── seed-db.js                    # ✨ New - Script seed data
├── REFACTORING.md                # ✨ New - Dokumentasi refactoring
├── SETUP.md                      # ✨ New - Panduan setup (file ini)
├── server.js                     # ✨ Modified - API auth + Socket.IO update
├── package.json                  # ✨ Modified - Tambah bcrypt
├── src/
│   ├── utils/
│   │   └── db.js                 # ✨ New - MySQL connection pool
│   ├── views/
│   │   ├── index.ejs             # ✨ Modified - Tambah input nama
│   │   ├── lobby.ejs             # Existing
│   │   ├── login.ejs             # ✨ New - Halaman login
│   │   ├── register.ejs          # ✨ New - Halaman register
│   │   └── dashboard.ejs         # ✨ New - Dashboard Host
│   ├── static/
│   │   └── js/
│   │       └── index.js          # ✨ Modified - Validasi nama
│   └── routers/
│       └── IndexRouters.js       # ✨ Modified - Tambah rute baru
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"
**Solusi:**
- Pastikan MySQL server berjalan
- Cek kredensial di `.env` sudah benar
- Pastikan database `queasy_db` sudah dibuat

### Error: "ER_DUP_ENTRY"
**Solusi:**
- Username atau email sudah terdaftar
- Gunakan username/email yang berbeda

### Error: "Tidak ada pertanyaan dalam kuis ini"
**Solusi:**
- Jalankan `node seed-db.js` untuk menambah data contoh
- Atau buat quiz baru dengan pertanyaan manual

### Socket.IO tidak terhubung
**Solusi:**
- Pastikan path Socket.IO benar: `/queasy-socket/`
- Clear browser cache
- Restart server

---

## 📞 Bantuan

Jika mengalami kendala, cek:
1. Console browser (F12) untuk error JavaScript
2. Terminal server untuk error backend
3. MySQL logs untuk error database

---

**Selamat mencoba! 🎉**
