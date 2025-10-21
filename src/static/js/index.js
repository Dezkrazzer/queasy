function gameLobby() {
    return {
        // 1. STATE (Data)
        gameCode: '', // Ini akan terisi otomatis oleh input x-model
        playerName: '', // Nama pemain untuk Guest

        // 2. METHODS (Fungsi)
        joinGame() {
            if (!this.gameCode) {
                alert('Harap masukkan kode game!');
                return;
            }
            if (!this.playerName) {
                alert('Harap masukkan nama Anda!');
                return;
            }
            console.log(`Mencoba bergabung ke room: ${this.gameCode} dengan nama: ${this.playerName}`);
            // Mengirim data ke server socket.io
            socket.emit('join_game', { code: this.gameCode, name: this.playerName });
        },

        createGame() {
            console.log('Mengarahkan ke halaman dashboard...');
            // Arahkan ke dashboard (harus login dulu)
            window.location.href = '/dashboard';
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