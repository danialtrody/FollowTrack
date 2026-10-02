import os
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from .auth import current_user
from .routers import auth, checker, snapshots

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

app = FastAPI(title="FollowTrack API", version="2.0.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
    max_age=60 * 60 * 24 * 30,
    same_site="lax",
    https_only=os.getenv("HTTPS_ONLY", "") == "1",
)

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix="/api")
app.include_router(snapshots.router, prefix="/api")
app.include_router(checker.router, prefix="/api", dependencies=[Depends(current_user)])


@app.get("/api/health")
def health():
    return {"status": "ok"}


if DIST.exists():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        f = DIST / full_path
        if f.is_file():
            return FileResponse(str(f))
        return FileResponse(str(DIST / "index.html"))
