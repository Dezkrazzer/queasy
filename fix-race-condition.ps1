# Script untuk memperbaiki race condition di server.js
# Memindahkan activeGames assignment sebelum await db.query()

$filePath = "server.js"
$content = Get-Content $filePath -Raw

# Pattern untuk mencari dan mengganti
$oldPattern = @"
            const gameCode = generateGameCode\(\);
            
            // Simpan session ke database
            await db\.query\(
                'INSERT INTO game_sessions \(quiz_id, host_id, game_code\) VALUES \(\?, \?, \?\)',
                \[quiz_id, host_id, gameCode\]
            \);

            activeGames\[gameCode\] = \{
                hostId: socket\.id,
                host_db_id: host_id,
                quiz_id: quiz_id,
                    quizTitle: quizTitle,
                players: \[
                    \{ id: socket\.id, name: hostUsername, isHost: true \}
                \],
                currentQuestionIndex: 0
            \};
"@

$newPattern = @"
            const gameCode = generateGameCode();
            
            // PENTING: Simpan ke memori DULU (mencegah race condition)
            activeGames[gameCode] = {
                hostId: socket.id,
                host_db_id: host_id,
                quiz_id: quiz_id,
                quizTitle: quizTitle,
                players: [
                    { id: socket.id, name: hostUsername, isHost: true }
                ],
                questions: [],
                currentQuestionIndex: 0
            };
            
            // Simpan session ke database (bisa belakangan)
            await db.query(
                'INSERT INTO game_sessions (quiz_id, host_id, game_code) VALUES (?, ?, ?)',
                [quiz_id, host_id, gameCode]
            );
"@

$content = $content -replace [regex]::Escape($oldPattern), $newPattern
Set-Content $filePath $content

Write-Host "✅ File server.js berhasil diperbaiki!"
