# FollowTrack

Track who unfollows you on Instagram — using your own data export. No API, no login, no server required.

Every user's data lives entirely in their own browser. Nothing is sent to a server or stored anywhere else.

---

## What it does

- **Lost Followers** — see who unfollowed you since your last upload
- **New Followers** — see who started following you
- **Not Following Back** — accounts you follow that don't follow you back
- **Ghost Account Scanner** — detects private, deactivated, or deleted accounts in your following list
- **Snapshot History** — upload multiple exports over time and track changes
- **User Timeline** — see the full follow/unfollow history for any specific user
- **Search** — find any user by username across all your snapshots

---

## How to use

### Step 1 — Export your Instagram data

1. Open Instagram → **Profile** → ☰ Menu
2. **Settings** → **Your activity** → **Download your information**
3. Select **"Followers and following"**
4. Choose **JSON** format → **Request download**
5. Wait for the email from Instagram, download the ZIP

### Step 2 — Upload

Open the app, tap **Upload**, select your ZIP. That's it.

Upload again later to see what changed.

---

## How data is stored

Your data never leaves your device. Everything is saved in your browser's IndexedDB (local storage). Clearing browser data will erase your history.

The backend only handles one thing: when you run the **ghost account scanner**, it makes HTTP requests to Instagram to check if accounts are active — no data is stored server-side.

---

## Tech stack

- **Frontend**: React 18 · Vite · IndexedDB (idb) · JSZip
- **Backend**: Python 3.11 · FastAPI · httpx (account checker only)

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
