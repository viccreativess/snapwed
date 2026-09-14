# SnapWed 💍

**Wedding photo sharing app** — guests scan a QR code, open a browser, and instantly upload photos. No app download. No account needed. Photos go straight to your Google Drive.

---

## Features

- 📷 **Guest upload page** — mobile-optimized, camera access, drag & drop, up to 20 photos at once
- 💌 **Guestbook** — guests leave their name + a message with each upload  
- 🖼️ **Public gallery** — masonry grid showing all uploaded photos, auto-refreshes every 30s, lightbox viewer
- 🔐 **Admin panel** — password-protected dashboard to manage events, view photos, guestbook, and QR code
- ☁️ **Google Drive** — all photos saved to `/SnapWed/<EventName>/` on your Drive
- 🎉 **Multi-event** — create multiple events (different weddings, parties, etc.)
- 🔗 **QR Code** — unique QR per event, downloadable as PNG

---

## Tech Stack

- **Node.js + Express** (v5)
- **Google Drive API** (OAuth 2.0)
- **Vanilla HTML/CSS/JS** — no frontend framework
- **Railway** — deployment

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd snapwed
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Go to **APIs & Services → Library** → Enable **Google Drive API**
4. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth Client ID**
5. Application type: **Web application**
6. Add Authorized redirect URIs:
   - Local: `http://localhost:3000/api/admin/auth/google/callback`
   - Railway: `https://your-app.railway.app/api/admin/auth/google/callback`
7. Copy **Client ID** and **Client Secret** into `.env`

### 4. Run locally

```bash
npm start
```

Open [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Deploy to Railway

### Option A: GitHub (Recommended)

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables in Railway dashboard (copy from `.env.example`):
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = `https://your-app.railway.app/api/admin/auth/google/callback`
   - `BASE_URL` = `https://your-app.railway.app`

5. Railway auto-deploys on every `git push`

> **Important**: After getting your Railway URL, update `GOOGLE_REDIRECT_URI` and `BASE_URL` in Railway env vars, and add the Railway redirect URI in Google Cloud Console.

### Option B: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## First-Time Setup (Admin)

1. Open `/admin` → login with your `ADMIN_PASSWORD`
2. Click **"Connect Google Drive"** → authorize with your Google account
3. Click **"+ New Event"** → fill in event details
4. Open the event → **QR Code** tab → download and print the QR code
5. Display the QR code at your venue!

---

## Guest Flow

1. Guest scans QR code with phone camera
2. Browser opens the upload page instantly (no app download!)
3. Tap to select photos or take new ones with camera
4. Optionally add their name + message
5. Hit upload — done! Photos go directly to your Google Drive

---

## File Structure

```
snapwed/
├── server.js              # Express entry point
├── routes/
│   ├── admin.js           # Admin API (events, QR, OAuth)
│   ├── upload.js          # Guest upload API
│   └── gallery.js         # Public gallery API
├── services/
│   └── googleDrive.js     # Google Drive SDK helper
├── public/
│   ├── upload/            # Guest upload page (HTML+CSS+JS)
│   ├── gallery/           # Public photo gallery
│   └── admin/             # Admin dashboard
├── data/
│   └── events.json        # Event metadata + guestbook (local JSON)
├── .env.example
├── railway.json
└── package.json
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Password to access the admin panel |
| `SESSION_SECRET` | Random secret for session encryption |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `BASE_URL` | Your public app URL (used in QR codes) |
| `PORT` | Port to listen on (Railway sets this automatically) |
