# 🚀 Quick Start Guide - Queasy

## ⚡ 5-Minute Setup

### Prerequisites
- ✅ Node.js (v14 or higher)
- ✅ MySQL (v5.7 or higher)
- ✅ Git (optional)

---

## 📦 Step 1: Install Dependencies

```bash
npm install
```

---

## 🗄️ Step 2: Setup Database

### A. Create Database
```sql
mysql -u root -p
CREATE DATABASE queasy_db;
exit;
```

### B. Configure Environment
```bash
# Copy environment template
copy .env.example .env

# Edit .env and fill in your MySQL credentials
```

**Example `.env`:**
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=queasy_db
```

### C. Initialize & Seed
```bash
npm run setup
```

This will:
1. Create all database tables
2. Add sample data (1 host + 1 quiz with 3 questions)

---

## 🎮 Step 3: Run Application

```bash
npm start
```

Open browser: **http://localhost:3000**

---

## 🧪 Step 4: Test It!

### Login as Host
1. Go to: http://localhost:3000/login
2. Use credentials:
   - **Username:** `admin`
   - **Password:** `password123`
3. Click "Mulai Game" on the quiz
4. Copy the **Game Code**

### Join as Player
1. Open **incognito window** or another browser
2. Go to: http://localhost:3000
3. Enter:
   - **Your Name:** (anything you want)
   - **Game Code:** (paste the code from host)
4. Click "Join Quiz"

### Start the Game
1. Go back to host window
2. Click "Start Game" in lobby
3. Both host and player will see the question!

---

## 📝 Available NPM Scripts

```bash
npm start          # Run server
npm run dev        # Same as start
npm run init-db    # Initialize database tables only
npm run seed-db    # Seed sample data only
npm run setup      # Initialize + seed (full setup)
```

---

## 🎯 What's Next?

After successful setup, you can:

1. **Create More Quizzes**
   - Currently need to add via SQL (UI coming soon)
   - See `TROUBLESHOOTING.md` for examples

2. **Explore the Code**
   - `server.js` - Main server & Socket.IO logic
   - `src/views/` - EJS templates
   - `src/routers/` - Express routes
   - `src/utils/db.js` - Database connection

3. **Read Documentation**
   - `REFACTORING.md` - Full feature documentation
   - `SETUP.md` - Detailed setup guide
   - `ARCHITECTURE.md` - System architecture
   - `TROUBLESHOOTING.md` - Common issues & solutions

---

## 🐛 Having Issues?

### Quick Fixes

**Can't connect to database?**
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"
```

**Port already in use?**
```bash
# Change PORT in .env file
PORT=4000
```

**Tables not created?**
```bash
# Run init-db again
npm run init-db
```

**No quiz available?**
```bash
# Run seed again
npm run seed-db
```

For more help, see: `TROUBLESHOOTING.md`

---

## 📚 Project Structure

```
queasy/
├── 📄 server.js              # Main server
├── 📄 init-db.js             # Database initialization
├── 📄 seed-db.js             # Sample data seeder
├── 📄 package.json           # NPM scripts
├── 📄 .env                   # Your config (not in git)
├── 📄 .env.example           # Template
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
│   └── 📁 static/            # CSS, JS, Assets
└── 📁 docs/ (*.md files)     # Documentation
```

---

## 🎉 Success!

If you see:
```
✅ Your app is listening on port 3000
🔌 Socket.IO is ready on path: /queasy-socket/
```

**You're ready to go!** 🚀

---

## 🔐 Default Credentials

**Host Account:**
- Username: `admin`
- Email: `admin@queasy.com`
- Password: `password123`

⚠️ **Important:** Change default password in production!

---

## 💡 Tips

1. **Use incognito mode** to test multiple players
2. **Keep host window open** while players join
3. **Game code expires** when server restarts
4. **Each quiz can be played multiple times**
5. **Check browser console** (F12) if something doesn't work

---

## 🎮 Gameplay Flow

```
1. Host Login → Dashboard
2. Host Click "Mulai Game"
3. Host Gets Game Code
4. Players Enter Name + Code
5. Players Join Lobby
6. Host Starts Game
7. Question Appears
8. Players Submit Answers
9. See Results!
```

---

## 📞 Need Help?

- 📖 Check `TROUBLESHOOTING.md`
- 🏗️ Read `ARCHITECTURE.md` for system design
- 📝 See `REFACTORING.md` for features list

---

**Enjoy building with Queasy! 🎯**
