# 🏗️ Arsitektur Queasy - Model Asimetris

## 📊 Database Schema (ER Diagram)

```
┌─────────────────┐
│     HOSTS       │
├─────────────────┤
│ host_id (PK)    │◄─────┐
│ username        │      │
│ email           │      │
│ password_hash   │      │
│ created_at      │      │
└─────────────────┘      │
                         │
                         │ FK
                         │
┌─────────────────┐      │         ┌──────────────────┐
│    QUIZZES      │──────┘         │   GAME_SESSIONS  │
├─────────────────┤                ├──────────────────┤
│ quiz_id (PK)    │◄───────────────┤ session_id (PK)  │◄─┐
│ host_id (FK)    │       FK       │ quiz_id (FK)     │  │
│ title           │                │ host_id (FK)     │  │
│ description     │                │ game_code        │  │
│ created_at      │                │ played_at        │  │
└─────────────────┘                └──────────────────┘  │
        │                                                 │
        │ FK                                             │ FK
        │                                                 │
        ▼                                                 │
┌─────────────────┐                          ┌──────────────────┐
│   QUESTIONS     │                          │  PLAYER_SCORES   │
├─────────────────┤                          ├──────────────────┤
│ question_id(PK) │◄─────┐                   │ score_id (PK)    │
│ quiz_id (FK)    │      │                   │ session_id (FK)  │──┘
│ question_text   │      │                   │ player_name      │
│ time_limit      │      │                   │ score            │
└─────────────────┘      │                   └──────────────────┘
                         │ FK
                         │
                  ┌──────────────┐
                  │   ANSWERS    │
                  ├──────────────┤
                  │ answer_id(PK)│
                  │question_id(FK)│
                  │ answer_text  │
                  │ is_correct   │
                  └──────────────┘
```

---

## 🔄 User Flow Diagram

### 🎮 Host (Creator) Flow

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌─────────────────┐      No      ┌──────────┐
│ Sudah Login?    │─────────────►│ Register │
└────┬────────────┘              └────┬─────┘
     │ Yes                            │
     │                                │
     ▼                                │
┌─────────────────┐◄──────────────────┘
│  Login Page     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│   Dashboard     │
│ (List of Quiz)  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Click "Mulai    │
│ Game" on Quiz   │
└────┬────────────┘
     │
     ▼ emit('create_game', {quiz_id})
┌─────────────────┐
│ Server Generate │
│   Game Code     │
└────┬────────────┘
     │
     ▼ on('game_created')
┌─────────────────┐
│ Redirect ke     │
│ Lobby (Host)    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Tunggu Players  │
│   Bergabung     │
└────┬────────────┘
     │
     ▼ emit('start_game')
┌─────────────────┐
│  Start Quiz!    │
└─────────────────┘
```

### 👤 Player (Guest) Flow

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│  Homepage       │
│  (index.ejs)    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Input Nama +    │
│ Game Code       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Click "Join     │
│    Quiz"        │
└────┬────────────┘
     │
     ▼ emit('join_game', {name, code})
┌─────────────────┐
│ Server Validasi │
│  Game Exist?    │
└────┬────────────┘
     │
     ▼ on('join_success')
┌─────────────────┐
│ Redirect ke     │
│ Lobby (Player)  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Tunggu Host     │
│  Start Game     │
└────┬────────────┘
     │
     ▼ on('game_started')
┌─────────────────┐
│ Jawab Soal      │
└────┬────────────┘
     │
     ▼ emit('submit_answer')
┌─────────────────┐
│ Lihat Hasil &   │
│     Skor        │
└─────────────────┘
```

---

## 🌐 Backend Architecture

```
┌────────────────────────────────────────────────────────┐
│                      server.js                          │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  Express.js      │      │   Socket.IO      │       │
│  │   Middleware     │      │    Real-time     │       │
│  └─────────┬────────┘      └────────┬─────────┘       │
│            │                        │                  │
│            │                        │                  │
│     ┌──────▼──────────┐    ┌────────▼─────────┐       │
│     │  API Routes     │    │  Socket Events   │       │
│     ├─────────────────┤    ├──────────────────┤       │
│     │ POST /register  │    │ create_game      │       │
│     │ POST /login     │    │ join_game        │       │
│     │ GET  /logout    │    │ start_game       │       │
│     └─────────────────┘    │ submit_answer    │       │
│                            │ join_lobby       │       │
│     ┌─────────────────┐    └──────────────────┘       │
│     │  Page Routes    │                               │
│     ├─────────────────┤                               │
│     │ GET /           │                               │
│     │ GET /login      │                               │
│     │ GET /register   │                               │
│     │ GET /dashboard  │◄──── Protected Route          │
│     │ GET /lobby/:id  │                               │
│     └─────────────────┘                               │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   src/utils/    │
        │     db.js       │
        ├─────────────────┤
        │  MySQL Pool     │
        │  Connection     │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  MySQL Database │
        │   (queasy_db)   │
        └─────────────────┘
```

---

## 🔐 Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ POST /api/register
       │ {username, email, password}
       ▼
┌─────────────────────────┐
│  Server: Register API   │
├─────────────────────────┤
│ 1. Validate Input       │
│ 2. Hash Password        │
│    (bcrypt)             │
│ 3. INSERT INTO hosts    │
│ 4. Return Success       │
└──────────┬──────────────┘
           │
           │ POST /api/login
           │ {username, password}
           ▼
┌─────────────────────────┐
│   Server: Login API     │
├─────────────────────────┤
│ 1. SELECT FROM hosts    │
│ 2. Compare Password     │
│    (bcrypt.compare)     │
│ 3. Create Session       │
│    req.session.host_id  │
│ 4. Return Success       │
└──────────┬──────────────┘
           │
           │ GET /dashboard
           ▼
┌─────────────────────────┐
│  Server: Check Session  │
├─────────────────────────┤
│ IF session.host_id      │
│    ├─ Yes: Show Dashboard│
│    └─ No: Redirect /login│
└─────────────────────────┘
```

---

## 🎮 Game Flow (Real-time)

```
HOST                          SERVER                      PLAYERS
 │                              │                            │
 │ emit('create_game')          │                            │
 ├─────────────────────────────►│                            │
 │         {quiz_id}            │                            │
 │                              │ 1. Validate Session        │
 │                              │ 2. Generate Game Code      │
 │                              │ 3. INSERT game_sessions    │
 │                              │ 4. Store in activeGames    │
 │◄─────────────────────────────┤                            │
 │   on('game_created')         │                            │
 │      {gameCode}              │                            │
 │                              │                            │
 │                              │◄───────────────────────────┤
 │                              │  emit('join_game')         │
 │                              │    {code, name}            │
 │                              │                            │
 │                              │ 1. Validate Game Exists    │
 │                              │ 2. Add Player to Array     │
 │                              │                            │
 │◄─────────────────────────────┼───────────────────────────►│
 │   io.to(code).emit('player_list_update')                  │
 │                              │                            │
 │ emit('start_game')           │                            │
 ├─────────────────────────────►│                            │
 │         {code}               │                            │
 │                              │ 1. SELECT question         │
 │                              │ 2. SELECT answers          │
 │                              │                            │
 │◄─────────────────────────────┼───────────────────────────►│
 │   io.to(code).emit('game_started', questionData)          │
 │                              │                            │
 │                              │◄───────────────────────────┤
 │                              │  emit('submit_answer')     │
 │                              │    {answer_id, time}       │
 │                              │                            │
 │                              │ 1. SELECT is_correct       │
 │                              │ 2. Calculate Score         │
 │                              │ 3. Update Player Score     │
 │                              │                            │
 │                              ├───────────────────────────►│
 │                              │ on('answer_result')        │
 │                              │   {isCorrect, points}      │
 │                              │                            │
```

---

## 📦 File Dependencies

```
server.js
  ├── express
  ├── socket.io
  ├── express-session
  ├── bcrypt
  ├── dotenv
  └── src/
      ├── utils/db.js
      │   └── mysql2/promise
      └── routers/IndexRouters.js
          ├── html-minifier
          └── javascript-obfuscator

init-db.js
  └── src/utils/db.js

seed-db.js
  ├── src/utils/db.js
  └── bcrypt
```

---

## 🔑 Key Differences: Host vs Guest

| Aspect         | Host (Creator)              | Guest (Player)           |
|----------------|-----------------------------|-----------------------------|
| **Login**      | ✅ Required                 | ❌ No Account Needed        |
| **Database**   | ✅ Stored in `hosts` table  | ❌ Only `player_name` saved |
| **Session**    | ✅ Express Session          | ❌ No Session               |
| **Permissions**| ✅ Create/Start Game        | ❌ Only Join & Play         |
| **Dashboard**  | ✅ Access to `/dashboard`   | ❌ No Dashboard             |
| **Data Input** | Username, Email, Password   | Name + Game Code only       |

---

**Arsitektur ini dirancang untuk:**
- ✅ Scalability (Connection pooling)
- ✅ Security (Password hashing, Session management)
- ✅ Real-time interaction (Socket.IO)
- ✅ Data integrity (Foreign keys, Indexes)
- ✅ User experience (Asymmetric model)
