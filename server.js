const express = require("express");
const app = express();
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const http = require('http');
const { Server } = require("socket.io");

const { json, urlencoded } = require("body-parser");

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
app.use(session({
    secret: 'queasy-unique-secret',
    resave: false,
    saveUninitialized: true
}));

const staticFilesPath = path.join(__dirname, 'src', 'static');
console.log('Express is serving static files from:', staticFilesPath);

app.use('/static', express.static(staticFilesPath));
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

const IndexRouters = require("./src/routers/IndexRouters");

io.on('connection', (socket) => {
    console.log(`> 🔌 • Seorang pengguna terhubung: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`> 💔 • Pengguna terputus: ${socket.id}`);
        // TODO: Hapus pengguna dari room 'activeGames' jika dia ada di sana
    });

    // --- TAMBAHKAN LISTENER BARU DI SINI ---

    /**
     * Saat host membuat game baru
     */
    socket.on('create_game', () => {
        const gameCode = generateGameCode();
        activeGames[gameCode] = {
            hostId: socket.id,
            players: []
        };

        // Masukkan host ke "room" socket.io
        socket.join(gameCode);

        console.log(`> 🎮 • Game baru dibuat oleh ${socket.id} dengan kode: ${gameCode}`);

        // Kirim kodenya kembali HANYA ke host yang membuat
        socket.emit('game_created', { gameCode: gameCode });
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
        
        // 3. Cek apakah socket ini adalah host-nya
        if (game.hostId === socket.id) {
            socket.emit('you_are_host'); // Beri tahu klien bahwa dia host
        }

        // 4. Kirim daftar pemain terbaru ke SEMUA ORANG di lobi
        // Kita panggil ini di sini agar pemain baru langsung dapat daftar
        io.to(gameCode).emit('player_list_update', game.players);
    });

    socket.on('start_game', (data) => {
        const gameCode = data.code;
        const game = activeGames[gameCode];

        // 1. Validasi: Cek apakah game ada & pengirim adalah host
        if (!game || game.hostId !== socket.id) {
            console.log(`> ⛔ • Percobaan ilegal memulai game ${gameCode} oleh ${socket.id}`);
            return; // Abaikan jika bukan host
        }
        
        console.log(`> 🚀 • Game ${gameCode} dimulai oleh host!`);

        // 2. Ambil pertanyaan pertama
        // (NANTI: Ambil dari database)
        const firstQuestion = {
            question: "Apa ibukota Indonesia?",
            options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
            timeLimit: 10
        };
        
        // 3. Kirim pertanyaan pertama ke SEMUA ORANG di room
        io.to(gameCode).emit('game_started', firstQuestion);
    });

    /**
     * Saat pemain mencoba bergabung ke game
     */
    socket.on('join_game', (data) => {
        const gameCode = data.code;
        const game = activeGames[gameCode];

        // Cek apakah gamenya ada
        if (!game) {
            console.log(`> ⚠️ • ${socket.id} mencoba join ke game ${gameCode} yg tidak ada`);
            socket.emit('game_not_found');
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
            name: 'Pemain ' + (game.players.length + 1) // Nanti bisa di-custom
        });

        console.log(`> 👤 • ${socket.id} bergabung ke game: ${gameCode}`);

        // Kirim konfirmasi HANYA ke pemain yang baru bergabung
        socket.emit('join_success', { gameCode: gameCode });

        // Kirim update daftar pemain ke SEMUA ORANG di room (termasuk host)
        io.to(gameCode).emit('player_list_update', game.players);
    });

});

app.use("/", IndexRouters());

server.listen(process.env.PORT, () => {
    console.log(`> ✅ • Your app is listening on port ${process.env.PORT}`);
    console.log(`> 🔌 • Socket.IO is ready on path: /queasy-socket/`);
});