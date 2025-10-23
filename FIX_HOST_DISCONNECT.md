# 🔧 FIX: Host Disconnect Issue

## 🐛 Masalah yang Ditemukan

```
> 🎮 • Game baru dibuat oleh Dezkrazzer (host_id: 1) dengan kode: DGO5IT
> 💔 • Pengguna terputus: RuSpSpsClDans1iVAAAD
> 🚨 • Host terputus dari game DGO5IT
> ⛔ • NccssE3Mf3D7ZKkVAAAF mencoba masuk lobi DGO5IT yg tidak ada
```

**Root Cause**:
1. Host membuat game di dashboard dengan socket ID: `RuSpSpsClDans1iVAAAD`
2. Server emit `game_created` dengan gameCode
3. Dashboard redirect host ke lobby: `window.location.href = '/lobby/DGO5IT'`
4. Redirect menyebabkan **socket DISCONNECT** (socket lama mati)
5. Disconnect handler **menghapus game** dari `activeGames`
6. Host reconnect dengan socket ID baru: `NccssE3Mf3D7ZKkVAAAF`
7. Game sudah tidak ada → Error "Game tidak ditemukan"

---

## ✅ Solusi yang Diterapkan

### 1. Delay Game Deletion (10 Seconds Grace Period)
**File**: `server.js` - Disconnect Handler

**Sebelum**:
```javascript
if (game.hostId === socket.id) {
    console.log(`> 🚨 • Host terputus dari game ${gameCode}`);
    io.to(gameCode).emit('host_disconnected');
    delete activeGames[gameCode]; // ❌ LANGSUNG HAPUS
    return;
}
```

**Sesudah**:
```javascript
if (game.hostId === socket.id) {
    console.log(`> 🚨 • Host terputus dari game ${gameCode}`);
    
    // Tandai host disconnect, tapi JANGAN langsung hapus
    game.hostDisconnected = true;
    game.hostDisconnectTime = Date.now();
    
    // Beri waktu 10 detik untuk reconnect
    setTimeout(() => {
        const currentGame = activeGames[gameCode];
        if (currentGame && currentGame.hostDisconnected && 
            (Date.now() - currentGame.hostDisconnectTime) >= 10000) {
            console.log(`> 🗑️ • Game ${gameCode} dihapus karena host tidak reconnect`);
            io.to(gameCode).emit('host_disconnected');
            delete activeGames[gameCode];
        }
    }, 10000);
    
    return;
}
```

**Benefit**:
- Game tidak langsung dihapus saat host disconnect
- Host punya 10 detik untuk reconnect
- Jika host reconnect dalam 10 detik, game tetap ada

---

### 2. Host Reconnect Detection
**File**: `server.js` - `join_lobby` Listener

**Penambahan**:
```javascript
// Cek apakah ini adalah host yang reconnect
const session = socket.request.session;
if (session && session.host_id && session.host_id === game.host_db_id) {
    // Host reconnect dengan socket ID baru
    console.log(`> 🔄 • Host reconnect ke game ${gameCode} dengan socket baru ${socket.id}`);
    
    game.hostId = socket.id; // Update socket ID
    game.hostDisconnected = false; // Cancel deletion
    
    // Update player host di array
    const hostPlayer = game.players.find(p => p.isHost);
    if (hostPlayer) {
        hostPlayer.id = socket.id;
    }
    
    socket.emit('you_are_host');
}
```

**How It Works**:
1. Saat host join lobby, cek `session.host_id` vs `game.host_db_id`
2. Jika cocok → ini host yang reconnect dengan socket baru
3. Update `game.hostId` ke socket ID baru
4. Set `hostDisconnected = false` untuk cancel penghapusan
5. Update socket ID di array `players`

---

### 3. Player Disconnect Filter
**File**: `server.js` - Disconnect Handler

**Perubahan**:
```javascript
// SEBELUM:
const playerIndex = game.players.findIndex(p => p.id === socket.id);

// SESUDAH:
const playerIndex = game.players.findIndex(p => p.id === socket.id && !p.isHost);
```

**Reason**:
- Hindari double handling (host sudah di-handle di atas)
- Hanya hapus player biasa, bukan host

---

## 🧪 Expected Behavior (After Fix)

### Scenario 1: Normal Host Create & Join

```
> 🎮 • Game baru dibuat oleh Dezkrazzer (host_id: 1) dengan kode: ABC123
> 💔 • Pengguna terputus: socket_old
> 🚨 • Host terputus dari game ABC123
> 🔌 • Seorang pengguna terhubung: socket_new
> 🔄 • Host reconnect ke game ABC123 dengan socket baru socket_new
✅ Game ABC123 masih ada, host berhasil join lobby
```

### Scenario 2: Host Disconnect & Never Return

```
> 🎮 • Game baru dibuat oleh Dezkrazzer dengan kode: XYZ789
> 💔 • Pengguna terputus: socket_old
> 🚨 • Host terputus dari game XYZ789
... (10 detik tidak ada aktivitas) ...
> 🗑️ • Game XYZ789 dihapus karena host tidak reconnect
```

### Scenario 3: Player Join During Grace Period

```
> 🎮 • Game baru dibuat oleh Host dengan kode: TEST01
> 💔 • Host terputus (reconnecting...)
> 🔌 • Player connected: player_socket
> 👤 • player_socket (Player1) bergabung ke game: TEST01
✅ Player berhasil join karena game masih ada (dalam grace period)
> 🔄 • Host reconnect
✅ Host dan Player bersama di lobby
```

---

## 📊 Testing Checklist

- [ ] Host buat game di dashboard
- [ ] Host redirect ke lobby (disconnect otomatis)
- [ ] Host reconnect dalam 10 detik
- [ ] **Expected**: Game tidak dihapus, host berhasil join
- [ ] **Expected**: Console log `> 🔄 • Host reconnect...`

- [ ] Player join saat host dalam grace period
- [ ] **Expected**: Player berhasil join
- [ ] **Expected**: Host reconnect, keduanya di lobby

- [ ] Host disconnect lebih dari 10 detik
- [ ] **Expected**: Game dihapus
- [ ] **Expected**: Console log `> 🗑️ • Game ... dihapus`

---

## 🎯 Key Changes

| File | Location | Change |
|------|----------|--------|
| `server.js` | Disconnect Handler | Add 10s grace period + flags |
| `server.js` | `join_lobby` Listener | Detect host reconnect via session |
| `server.js` | Disconnect Handler | Filter player disconnect (!isHost) |

---

**Status**: ✅ FIXED
**Test**: Silakan coba create game → redirect ke lobby
