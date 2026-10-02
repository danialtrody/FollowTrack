# FollowTrack

Know exactly who unfollowed you, who you follow that doesn't follow back, and which accounts in your list have gone ghost — all using your own Instagram data export. No login. No API. No tracking.

**Live demo:** https://followtrack-xs57.onrender.com

---

## What it does

Upload your Instagram data export and FollowTrack gives you a full picture of your follower activity:

- **Lost Followers** — see exactly who unfollowed you between uploads
- **New Followers** — see who started following you
- **Not Following Back** — accounts you follow that don't follow you back
- **Ghost Account Scanner** — finds accounts in your following list that are private, deactivated, or deleted
- **Snapshot History** — upload your export multiple times over weeks or months to track how your followers change over time
- **User Timeline** — tap any username to see their full follow/unfollow history with you

---

## Your data and your account

You sign in with an email and password. The ZIP is read in your browser; only the parsed lists (followers, following, blocked, pending requests, ...) are saved to your account in the database, so your history follows you across devices. The original ZIP file is not stored.

The ghost account scanner sends usernames to the server, which checks whether those accounts are still active on Instagram.

---

## How to use it

### 1. Export your data from Instagram

1. Go to your Instagram profile
2. Tap the menu (☰) → **Settings** → **Your activity**
3. Select **Download your information**
4. Choose **Followers and following** → **JSON format**
5. Request the download and wait for Instagram's email
6. Download the ZIP file they send you

### 2. Upload to FollowTrack

Create an account, go to **Upload**, and select the ZIP file. The app parses it locally and saves the result to your account.

### 3. Upload again later to see changes

Come back in a week or a month, upload a new export, and FollowTrack will show you exactly what changed — who left, who's new, who still hasn't followed back.

---

## Run locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL='postgresql://...'   # your Postgres (Neon) connection string, required
export SESSION_SECRET='...'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Deploy

Single Render web service — FastAPI serves the built frontend. Reference commands (keep in sync with the Render dashboard):

- **Build:** `cd frontend && npm ci && npm run build && cd ../backend && pip install -r requirements.txt`
- **Start:** `cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment:** `DATABASE_URL` (Neon Postgres connection string, `sslmode=require`), `SESSION_SECRET` (long random string), `HTTPS_ONLY=1`.
- Requires Python 3.10+.
