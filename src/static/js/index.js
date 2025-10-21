function gameLobby() {
    return {
        // 1. STATE (Data)
        gameCode: '', // Ini akan terisi otomatis oleh input x-model

        // 2. METHODS (Fungsi)
        joinGame() {
            if (!this.gameCode) {
                alert('Harap masukkan kode game!');
                return;
            }
            console.log(`Mencoba bergabung ke room: ${this.gameCode}`);
            // Mengirim data ke server socket.io
            socket.emit('join_game', { code: this.gameCode });
        },

        createGame() {
            console.log('Meminta server membuat game baru...');
            // Meminta server membuat game baru
            socket.emit('create_game');
        }
    }
}

// 3. MENERIMA RESPON DARI SERVER
// (Ini tetap di luar Alpine, karena ini mendengarkan)

socket.on('game_created', (data) => {
    console.log(`Game dibuat, mengarahkan ke lobi: ${data.gameCode}`);
    window.location.href = `/lobby/${data.gameCode}`;
    // TODO: Arahkan host ke halaman lobi/dashboard kuis
    // window.location.href = `/lobby/${data.gameCode}`;
});

socket.on('join_success', (data) => {
    console.log(`Berhasil bergabung, mengarahkan ke lobi: ${data.gameCode}`);
    window.location.href = `/lobby/${data.gameCode}`;
    // TODO: Arahkan pemain ke halaman lobi
    // window.location.href = `/lobby/${data.gameCode}`;
});

socket.on('game_not_found', () => {
    alert('Error: Game dengan kode tersebut tidak ditemukan!');
});