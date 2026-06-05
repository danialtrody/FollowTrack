# FollowTrack

Know exactly who unfollowed you, who you follow that doesn't follow back, and which accounts in your list have gone ghost — all using your own Instagram data export. No login. No API. No tracking.

**Live demo:** [followtrack.app](https://followtrack-xs57.onrender.com)

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

## Your data stays with you

Everything is stored locally in your browser. Your follower data never leaves your device and is never sent anywhere.

The only exception is the ghost account scanner — when you run it, the app checks if accounts are still active on Instagram. No personal data is sent, just usernames to verify.

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

Open the app, go to **Upload**, and select the ZIP file. The app reads everything locally — no file is uploaded to any server.

### 3. Upload again later to see changes

Come back in a week or a month, upload a new export, and FollowTrack will show you exactly what changed — who left, who's new, who still hasn't followed back.

---

## Run locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.
