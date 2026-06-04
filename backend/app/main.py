from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .routers import checker

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

app = FastAPI(title="FollowTrack API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(checker.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve built frontend in production
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        f = DIST / full_path
        if f.is_file():
            return FileResponse(str(f))
        return FileResponse(str(DIST / "index.html"))
