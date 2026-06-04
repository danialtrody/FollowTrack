# FollowTrack

Analyze your Instagram followers from manually exported JSON data.  
No API. No scraping. Your data stays local.

---

## Quick Start

### 1. Backend (Python FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
The SQLite database is created automatically at `data/followtrack.db`.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## How to Export Instagram Data (iPhone)

1. Open Instagram → **Profile** → ☰ Menu
2. **Settings and privacy** → **Your activity** → **Download your information**
3. Select **"Followers and following"**
4. Choose **JSON** format → **Request download**
5. Download the ZIP from your email
6. Upload the ZIP on the Upload page

---

## Features

| Category | Description |
|----------|-------------|
| Lost Followers | People who unfollowed you since last upload |
| New Followers | People who started following you |
| Not Following Back | They follow you, you don't follow them |
| You Don't Follow Back | You follow them, they don't follow you |
| Re-followers | People who unfollowed then re-followed |
| Blocked Profiles | Accounts you've blocked |
| Pending Requests | Follow requests you sent but not accepted |
| Recently Unfollowed | Accounts you recently unfollowed (Instagram's native list) |
| Follow Requests Received | People waiting for your approval |
| User History | Full follow/unfollow timeline per user |

---

## Tech Stack

- **Backend**: Python 3.11+ · FastAPI · SQLAlchemy · SQLite
- **Frontend**: React 18 · Vite · React Router

---

## Project Structure

```
FollowTrack/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── database.py          # SQLAlchemy + SQLite setup
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── routers/             # upload / analysis / users
│   │   └── services/            # parser / snapshot / analysis logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # All API calls
│   │   ├── components/          # Shared UI components
│   │   └── pages/               # Upload / Dashboard / History / Search
│   └── package.json
└── data/
    └── followtrack.db           # Auto-created SQLite database
```
