# 🎯 Queasy - Interactive Real-time Quiz Platform

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-v5.7+-blue.svg)](https://www.mysql.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-orange.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

> **Where Knowledge Meets Fun!** Challenge your mind with interactive multiplayer quizzes in real-time.

---

## ✨ Features

### 🎮 Asymmetric Model
- **🔐 Hosts (Quiz Creators):** Must register/login, can create and manage quizzes
- **👥 Players (Guests):** No account needed! Just enter name and game code to play

### 🚀 Real-time Multiplayer
- ⚡ Live game sessions with Socket.IO
- 👥 Multiple players can join simultaneously
- 📊 Instant answer validation and scoring
- 🎯 Dynamic question loading from database

### 🔐 Security
- 🔒 Password hashing with bcrypt
- 🛡️ SQL injection prevention
- 🔑 Session-based authentication
- 🚫 Protected routes for hosts

### 🗄️ Database-Driven
- 📚 MySQL relational database
- 🔄 Connection pooling for performance
- 📊 Track game history and scores
- 🎲 Unlimited quizzes and questions

---

## 📸 Screenshots

```
┌─────────────────────────────────────────────┐
│           🏠 Homepage                       │
│  ┌─────────────────────────────────────┐   │
│  │ Enter Your Name: [_____________]    │   │
│  │ Enter Game Code: [_____________]    │   │
│  │                                     │   │
│  │  [Join Quiz]  -OR-  [Create Quiz]  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           📊 Host Dashboard                 │
│  Welcome, admin                   [Logout]  │
│  ┌─────────────────────────────────────┐   │
│  │ ┌─────────────────────────────────┐ │   │
│  │ │ Quiz: Pengetahuan Umum          │ │   │
│  │ │ 3 Questions                     │ │   │
│  │ │              [▶ Mulai Game]     │ │   │
│  │ └─────────────────────────────────┘ │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v14 or higher
- MySQL v5.7 or higher
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dezkrazzer/queasy.git
cd queasy

# 2. Install dependencies
npm install

# 3. Create database
mysql -u root -p
CREATE DATABASE queasy_db;
exit;

# 4. Configure environment
copy .env.example .env
# Edit .env with your MySQL credentials

# 5. Setup database tables & sample data
npm run setup

# 6. Start the server
npm start
```

**Open browser:** http://localhost:3000

**Default Host Credentials:**
- Username: `admin`
- Password: `password123`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📖 QUICKSTART.md](QUICKSTART.md) | 5-minute quick start guide |
| [⚙️ SETUP.md](SETUP.md) | Detailed setup instructions |
| [🏗️ ARCHITECTURE.md](ARCHITECTURE.md) | System architecture & design |
| [📝 REFACTORING.md](REFACTORING.md) | Complete feature documentation |
| [🐛 TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues & solutions |
| [📋 CHANGELOG.md](CHANGELOG.md) | Version history |

---

## 🎮 How to Play

### As a Host (Quiz Creator)

1. **Register/Login**
   ```
   Go to /login or /register
   ```

2. **Create Quiz** (Currently via database)
   ```sql
   INSERT INTO quizzes (host_id, title, description) 
   VALUES (1, 'My Quiz', 'Description');
   ```

3. **Start Game**
   ```
   Dashboard → Click "Mulai Game" → Share Game Code
   ```

### As a Player (Guest)

1. **Join Game**
   ```
   Homepage → Enter Name → Enter Game Code → Join Quiz
   ```

2. **Play**
   ```
   Wait for host to start → Answer questions → See your score!
   ```

---

## 🗄️ Database Schema

```sql
hosts ──┬──► quizzes ──┬──► questions ──► answers
        │               │
        │               └──► game_sessions ──► player_scores
        │
        └──────────────────────┘
```

**6 Tables:**
- `hosts` - Host accounts
- `quizzes` - Quiz data
- `questions` - Quiz questions
- `answers` - Answer choices
- `game_sessions` - Game history
- `player_scores` - Player scores

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-time:** Socket.IO
- **Database:** MySQL (mysql2)
- **Authentication:** express-session + bcrypt
- **Environment:** dotenv

### Frontend
- **Template Engine:** EJS
- **Styling:** Tailwind CSS
- **Reactivity:** Alpine.js
- **Icons:** Feather Icons
- **Animations:** Three.js + Vanta.js

---

## 📋 NPM Scripts

```bash
npm start          # Start server
npm run dev        # Start in development mode
npm run init-db    # Initialize database tables
npm run seed-db    # Add sample data
npm run setup      # Full setup (init + seed)
```

---

## 🔌 API Reference

### Authentication

```http
POST /api/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

```http
POST /api/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

```http
GET /api/logout
```

### Socket.IO Events

#### Client → Server
- `create_game` - Create new game session
- `join_game` - Join existing game
- `start_game` - Start the game
- `submit_answer` - Submit answer

#### Server → Client
- `game_created` - Game created successfully
- `join_success` - Successfully joined
- `game_started` - Game has started
- `answer_result` - Answer validation result
- `player_list_update` - Player list changed

---

## 🗂️ Project Structure

```
queasy/
├── 📄 server.js              # Main server
├── 📄 init-db.js             # DB initialization
├── 📄 seed-db.js             # Sample data
├── 📄 package.json           # Dependencies
├── 📄 .env                   # Configuration
├── 📁 src/
│   ├── 📁 utils/
│   │   └── db.js             # MySQL connection
│   ├── 📁 views/             # EJS templates
│   │   ├── index.ejs         # Homepage
│   │   ├── login.ejs         # Host login
│   │   ├── register.ejs      # Host register
│   │   ├── dashboard.ejs     # Host dashboard
│   │   └── lobby.ejs         # Game lobby
│   ├── 📁 routers/
│   │   └── IndexRouters.js   # Express routes
│   ├── 📁 static/
│   │   ├── 📁 css/           # Stylesheets
│   │   ├── 📁 js/            # Client scripts
│   │   └── 📁 assets/        # Images, fonts
│   └── 📁 components/        # Reusable components
└── 📁 docs/                  # Documentation
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=queasy_db

# Session (change in production!)
SESSION_SECRET=your-secret-key
```

---

## 🚧 Roadmap

### ✅ Completed (v2.0)
- [x] Asymmetric user model
- [x] MySQL database integration
- [x] Host authentication
- [x] Real-time multiplayer
- [x] Dynamic quiz loading
- [x] Score calculation

### 🔜 Coming Soon
- [ ] Quiz creation UI
- [ ] Multiple questions per game
- [ ] Real-time leaderboard
- [ ] Timer countdown
- [ ] Game history page
- [ ] Edit/delete quizzes

### 🎯 Future Plans
- [ ] Team mode
- [ ] Tournament system
- [ ] Mobile app
- [ ] AI-generated questions
- [ ] Voice chat
- [ ] Streamer mode

---

## 🐛 Known Issues

1. **Quiz creation** - No UI yet, must use database
2. **Game persistence** - Lost on server restart (in-memory)
3. **Multiple questions** - Only shows first question
4. **Forgot password** - Not implemented

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for solutions.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Original Template:** [DezkrazzeR](https://github.com/Dezkrazzer)
- **Refactored by:** GitHub Copilot
- **Contributors:** Community

---

## 📞 Support

- 📧 Email: support@queasy.com (if available)
- 🐛 Issues: [GitHub Issues](https://github.com/Dezkrazzer/queasy/issues)
- 📖 Docs: [Documentation](QUICKSTART.md)

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

<div align="center">

**Made with ❤️ by the Queasy Team**

[⬆ Back to Top](#-queasy---interactive-real-time-quiz-platform)

</div>

---

> **Version 2.0.0** - Asymmetric Model Release  
> **Last Updated:** January 21, 2025  
> **Status:** ✅ Production Ready