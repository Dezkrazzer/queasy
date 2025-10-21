# 📝 Changelog - Queasy Refactoring

## Version 2.0.0 - Asymmetric Model (2025-01-21)

### 🎉 Major Changes

#### Architecture
- ✅ **Asymmetric User Model** implemented
  - **Hosts**: Must login/register (stored in database)
  - **Players**: Guest access (no account needed, only name)
- ✅ Full **MySQL Database Integration**
- ✅ **Real-time multiplayer** with Socket.IO
- ✅ **Session-based authentication** for Hosts
- ✅ **Password hashing** with bcrypt

---

### 🆕 New Features

#### Authentication & Authorization
- ✅ Host registration (`POST /api/register`)
- ✅ Host login with session (`POST /api/login`)
- ✅ Host logout (`GET /api/logout`)
- ✅ Protected dashboard route
- ✅ Session integration with Socket.IO

#### Database
- ✅ MySQL connection pool (`src/utils/db.js`)
- ✅ 6 relational tables with foreign keys
- ✅ Database initialization script (`init-db.js`)
- ✅ Data seeding script (`seed-db.js`)
- ✅ SQL schema file for reference

#### User Interface
- ✅ **Login page** (`/login`) for Hosts
- ✅ **Register page** (`/register`) for Hosts
- ✅ **Dashboard page** (`/dashboard`) for quiz management
- ✅ **Player name input** on homepage for Guests
- ✅ Responsive design maintained

#### Game Flow
- ✅ Dynamic quiz loading from database
- ✅ Game session tracking with unique codes
- ✅ Answer validation against database
- ✅ Score calculation system
- ✅ Real-time player list updates

---

### 🔧 Modified Features

#### Socket.IO Events

**`create_game`**
- **Old:** No parameters, hardcoded data
- **New:** Accepts `{ quiz_id }`, validates host session

**`join_game`**
- **Old:** Only game code
- **New:** Accepts `{ code, name }`, validates player name

**`start_game`**
- **Old:** Hardcoded question
- **New:** Loads question from database

**`submit_answer`** (NEW)
- Validates answer correctness
- Calculates score with time bonus
- Updates player score in memory

#### Frontend

**`index.ejs`**
- Added player name input field
- "Create Quiz" button now redirects to dashboard

**`index.js`**
- Added `playerName` state
- Validation for both name and code
- Redirect to dashboard for quiz creation

---

### 📦 New Files

#### Core Files
- `src/utils/db.js` - MySQL connection pool
- `init-db.js` - Database table initialization
- `seed-db.js` - Sample data seeder
- `database-schema.sql` - SQL schema reference

#### Views
- `src/views/login.ejs` - Host login page
- `src/views/register.ejs` - Host registration page
- `src/views/dashboard.ejs` - Host quiz dashboard

#### Routes
- Updated `src/routers/IndexRouters.js` with 3 new routes

#### Documentation
- `REFACTORING.md` - Complete refactoring documentation
- `SETUP.md` - Detailed setup guide
- `QUICKSTART.md` - 5-minute quick start
- `ARCHITECTURE.md` - System architecture diagrams
- `TROUBLESHOOTING.md` - Common issues & solutions
- `SUMMARY.md` - Executive summary
- `CHANGELOG.md` - This file

#### Configuration
- `.env.example` - Environment variable template
- Updated `.gitignore` - Added sensitive files
- Updated `package.json` - Added npm scripts

---

### 🗄️ Database Schema

#### Tables Created

1. **hosts** - Host accounts
   - `host_id`, `username`, `email`, `password_hash`, `created_at`

2. **quizzes** - Quiz data
   - `quiz_id`, `host_id`, `title`, `description`, `created_at`

3. **questions** - Quiz questions
   - `question_id`, `quiz_id`, `question_text`, `time_limit`

4. **answers** - Answer choices
   - `answer_id`, `question_id`, `answer_text`, `is_correct`

5. **game_sessions** - Game history
   - `session_id`, `quiz_id`, `host_id`, `game_code`, `played_at`

6. **player_scores** - Player scores
   - `score_id`, `session_id`, `player_name`, `score`

---

### 🔐 Security Improvements

- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Session-based authentication
- ✅ Protected routes with session validation
- ✅ Environment variables for sensitive data
- ✅ `.env` excluded from git

---

### 📊 API Endpoints

#### Authentication
- `POST /api/register` - Register new host
- `POST /api/login` - Login host
- `GET /api/logout` - Logout host

#### Pages
- `GET /` - Homepage (Guest & Host)
- `GET /login` - Host login page
- `GET /register` - Host registration page
- `GET /dashboard` - Host dashboard (Protected)
- `GET /lobby/:gameCode` - Game lobby

---

### 🎮 Socket.IO Events

#### Client → Server
- `create_game` - Host creates new game
- `join_game` - Player joins game
- `join_lobby` - User enters lobby
- `start_game` - Host starts game
- `submit_answer` - Player submits answer

#### Server → Client
- `game_created` - Game created successfully
- `join_success` - Join successful
- `game_not_found` - Game doesn't exist
- `you_are_host` - User is the host
- `player_list_update` - Player list changed
- `game_started` - Game has started (with question)
- `answer_result` - Answer validation result
- `error` - Error message

---

### 🚀 Performance

- ✅ MySQL connection pooling (max 10 connections)
- ✅ Indexed database columns for faster queries
- ✅ Efficient Socket.IO room management
- ✅ Minimal database queries per request

---

### 📚 Documentation

Total **7 documentation files** created:
1. `REFACTORING.md` - Complete features
2. `SETUP.md` - Setup instructions
3. `QUICKSTART.md` - Quick start guide
4. `ARCHITECTURE.md` - System design
5. `TROUBLESHOOTING.md` - Problem solving
6. `SUMMARY.md` - Executive summary
7. `CHANGELOG.md` - This file

---

### 🛠️ NPM Scripts

```json
{
  "start": "node server.js",
  "dev": "node server.js",
  "init-db": "node init-db.js",
  "seed-db": "node seed-db.js",
  "setup": "npm run init-db && npm run seed-db"
}
```

---

### 📈 Code Statistics

- **New Lines of Code:** ~1000+
- **Files Created:** 16
- **Files Modified:** 7
- **Database Tables:** 6
- **API Endpoints:** 3
- **Socket Events:** 6 (4 modified, 2 new)

---

### 🔄 Breaking Changes

#### For Developers
- **Database required** - App won't work without MySQL
- **Environment variables** - Must configure `.env`
- **Create game** - Now requires quiz_id from database
- **Join game** - Now requires player name
- **Session required** - Hosts must login

#### For Users
- **Hosts** - Must register/login (new requirement)
- **Players** - Must provide name (new requirement)
- **Game code** - Still temporary (in-memory)

---

### ⚠️ Known Limitations

1. **No quiz creation UI** - Must add via database
2. **In-memory game storage** - Lost on server restart
3. **No forgot password** - Must reset manually
4. **No multiple questions** - Only shows first question
5. **No final scoreboard** - Scores shown per question only

---

### 🎯 Future Enhancements (Roadmap)

#### Short-term
- [ ] Quiz creation UI
- [ ] Multiple questions per game
- [ ] Final leaderboard
- [ ] Timer countdown on client
- [ ] Sound effects

#### Mid-term
- [ ] Edit/delete quizzes
- [ ] Game history page
- [ ] Player statistics
- [ ] Export results to CSV
- [ ] Email notifications

#### Long-term
- [ ] Redis for session store
- [ ] Real-time analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Team mode
- [ ] Tournament brackets

---

### 🙏 Credits

- **Refactored by:** GitHub Copilot
- **Original Project:** Queasy Quiz App
- **Date:** January 21, 2025
- **Version:** 2.0.0 (Asymmetric Model)

---

### 📄 License

Same as original project (see LICENSE file)

---

## Previous Versions

### Version 1.0.0 - Original (Before Refactoring)

#### Features
- ✅ Basic Socket.IO game flow
- ✅ Hardcoded questions
- ✅ Simple lobby system
- ✅ No authentication
- ✅ In-memory storage only

---

**For detailed migration guide, see `REFACTORING.md`**
