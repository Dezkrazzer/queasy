# Queasy - Refactoring ke Model Asimetris

## 🎯 Perubahan Utama

Aplikasi quiz "Queasy" telah direfactor menjadi **model asimetris**:

- **Pemain (Guest)**: Tidak perlu login/register, cukup masukkan **Nama** dan **Kode Game**
- **Host (Creator)**: Harus login/register, dapat membuat dan mengelola kuis

## 📋 Setup Database

### 1. Konfigurasi Database

Edit file `.env` dan sesuaikan dengan konfigurasi MySQL Anda:

```env
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=queasy_db
```

### 2. Buat Database

Buat database baru di MySQL:

```sql
CREATE DATABASE queasy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Inisialisasi Tabel

Jalankan script untuk membuat semua tabel:

```bash
node init-db.js
```

### 4. Seed Data Contoh (Opsional)

Untuk menambahkan data contoh (host admin + quiz sampel):

```bash
node seed-db.js
```

**Data Login Host Contoh:**
- Username: `admin`
- Password: `password123`

## 🗄️ Struktur Database

### Tabel yang Dibuat:

1. **hosts** - Menyimpan akun Host
2. **quizzes** - Menyimpan daftar kuis yang dibuat Host
3. **questions** - Menyimpan pertanyaan untuk setiap kuis
4. **answers** - Menyimpan pilihan jawaban (termasuk jawaban benar)
5. **game_sessions** - Menyimpan riwayat game yang dimainkan
6. **player_scores** - Menyimpan skor pemain per session

## 🚀 Cara Menjalankan

1. Install dependencies:
```bash
npm install
```

2. Setup database (lihat bagian di atas)

3. Jalankan server:
```bash
node server.js
```

4. Buka browser: `http://localhost:3000`

## 📱 Alur Penggunaan

### Untuk Host (Creator):

1. Klik **"Create Quiz"** di homepage
2. Login atau Register di `/login` atau `/register`
3. Setelah login, akan diarahkan ke Dashboard
4. Klik **"Mulai Game"** pada salah satu kuis
5. Sistem akan generate **Game Code** otomatis
6. Bagikan kode tersebut ke pemain

### Untuk Pemain (Guest):

1. Masukkan **Nama** Anda di homepage
2. Masukkan **Game Code** yang diberikan Host
3. Klik **"Join Quiz"**
4. Tunggu Host memulai game

## 🔧 Fitur Baru

### Backend:
- ✅ Autentikasi Host (Register, Login, Logout)
- ✅ Koneksi Database dengan mysql2/promise
- ✅ Password hashing dengan bcrypt
- ✅ Session management
- ✅ Socket.IO terintegrasi dengan session
- ✅ Dynamic quiz loading dari database
- ✅ Validasi nama pemain

### Frontend:
- ✅ Input nama untuk Guest Player
- ✅ Halaman Login & Register untuk Host
- ✅ Dashboard Host untuk mengelola kuis
- ✅ Redirect otomatis ke dashboard setelah login

## 🔐 API Endpoints

### Autentikasi:
- `POST /api/register` - Register host baru
- `POST /api/login` - Login host
- `GET /api/logout` - Logout host

### Pages:
- `GET /` - Homepage
- `GET /login` - Halaman login
- `GET /register` - Halaman register
- `GET /dashboard` - Dashboard host (protected)
- `GET /lobby/:gameCode` - Lobby game

## 🎮 Socket.IO Events

### Client → Server:
- `create_game` - Host membuat game baru
- `join_game` - Pemain bergabung ke game
- `start_game` - Host memulai game
- `submit_answer` - Pemain mengirim jawaban

### Server → Client:
- `game_created` - Game berhasil dibuat
- `join_success` - Berhasil join game
- `game_not_found` - Game tidak ditemukan
- `player_list_update` - Update daftar pemain
- `game_started` - Game dimulai (kirim pertanyaan)
- `answer_result` - Hasil jawaban pemain
- `error` - Error message

## 📦 Dependencies Baru

- `bcrypt` - Password hashing
- `mysql2` - MySQL client (sudah ada di package.json)

## 📝 Catatan

- Semua password di-hash menggunakan bcrypt
- Session disimpan di memory (untuk production, gunakan session store seperti Redis)
- Socket.IO sudah terintegrasi dengan Express Session
- Database menggunakan InnoDB engine dengan foreign key constraints
- Character set: UTF8MB4 (support emoji dan karakter internasional)

## 🛠️ TODO (Fitur Lanjutan)

- [ ] Halaman pembuatan kuis baru
- [ ] Edit/hapus kuis
- [ ] Real-time leaderboard
- [ ] Simpan skor akhir ke database
- [ ] Multiple question support
- [ ] Timer countdown di client
- [ ] Sound effects dan animations

## 👥 Author

Refactored by: GitHub Copilot
Original Project: Queasy Quiz App
