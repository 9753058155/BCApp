# 🪙 BC Circle — Monthly Kitty Bidding App

A real-time web app for managing monthly BC (Bishi Chit / Kitty) groups with live auctions.

## Features

- 🔴 **Real-time bidding** — All bids update live via Firebase listeners
- ⏱ **15-minute auction timer** — Countdown with urgency alerts
- 💰 **Smart bid increments** — +₹500, +₹1000, +₹1500 quick options
- 🏆 **Win tracking** — Players who've won can't bid again in same cycle
- 📋 **Monthly records** — Full history of winners, bids, payouts
- 👤 **Player accounts** — Unique email/password per player
- ⚙️ **Admin controls** — Start/close auctions, manage players
- 📱 **Mobile-first** — Works great on phones

---

## Setup Guide

### Step 1: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (e.g., `bc-circle`)
3. **Enable Authentication:**
   - Authentication → Sign-in method → Email/Password → Enable
4. **Create Firestore Database:**
   - Firestore Database → Create database → Start in test mode → Choose region
5. **Get Web Config:**
   - Project Settings (gear icon) → Your Apps → Add App → Web
   - Copy the `firebaseConfig` object

### Step 2: Configure the App

Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Step 3: Create Admin Account

Open `create-admin.html` in your browser (after setting up Firebase config) and click "Create Admin". 

OR run this in browser console on your app:
```js
// See CREATE_ADMIN.js for the full script
```

Default admin credentials (change these!):
- Email: `admin@bccircle.com`
- Password: `Admin@12345`

### Step 4: Install & Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`

### Step 5: Configure Group

1. Login with admin credentials
2. Go to **Admin Panel → Setup**
3. Set monthly contribution amount (e.g., ₹5000) and player count (e.g., 10)
4. Add all players with their name, email, and password
5. Share credentials privately with each player

### Step 6: Deploy to Netlify

**Option A: GitHub (Recommended)**
1. Push code to GitHub
2. Go to [Netlify](https://netlify.com) → New site from Git
3. Connect GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Deploy!

**Option B: Drag & Drop**
1. Run `npm run build`
2. Drag the `build` folder to Netlify

### Step 7: Firestore Security Rules (Production)

After testing, update Firestore rules:
1. Go to Firestore → Rules
2. Paste contents of `firestore.rules`
3. Publish

---

## How the BC Works

### Monthly Auction Flow

1. **Admin starts auction** → 15-minute countdown begins
2. **Players bid** from their phones using +₹500/₹1000/₹1500 increments
3. Starting minimum bid = 10% of monthly contribution
4. **Highest bidder wins** the pool minus their bid
5. The winning bid amount is divided equally among all players (their bonus)
6. **Last player** (when all others have won) gets the full pool; remaining is distributed

### Example (10 players, ₹5000/month)
- Total Pool = ₹50,000
- Minimum starting bid = ₹5,000
- If winning bid = ₹6,500:
  - Winner gets = ₹50,000 - ₹6,500 = **₹43,500**
  - Each player gets bonus = ₹6,500 ÷ 10 = **₹650**
- Last player: gets ₹45,000, all get ₹500 bonus

---

## File Structure

```
bc-app/
├── src/
│   ├── firebase/
│   │   ├── config.js          # 🔧 YOUR FIREBASE CONFIG GOES HERE
│   │   └── services.js        # All Firestore operations
│   ├── context/
│   │   └── AuthContext.js     # Auth state management
│   ├── components/
│   │   └── Countdown.js       # Live timer component
│   ├── pages/
│   │   ├── Login.js           # Login page
│   │   ├── PlayerDashboard.js # Player view with live bidding
│   │   ├── AdminDashboard.js  # Admin controls
│   │   └── AdminSetup.js      # Player/group setup
│   ├── App.js                 # Routes
│   └── App.css                # Global styles
├── public/
│   └── index.html
├── firestore.rules            # Security rules
├── netlify.toml               # Netlify SPA config
└── CREATE_ADMIN.js            # Admin setup instructions
```

---

## Troubleshooting

**"Firebase: Error (auth/configuration-not-found)"**
→ Check `src/firebase/config.js` has correct values

**Players can't log in**
→ Make sure Email/Password auth is enabled in Firebase Console

**Bids not updating in real-time**
→ Check Firestore rules allow read access for authenticated users

**Netlify shows blank page**
→ Ensure `netlify.toml` is in root, and build/publish settings are correct
