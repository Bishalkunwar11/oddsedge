"""FastAPI application entry-point.

Starts the server, creates database tables on startup, initialises Redis,
registers all routers and the WebSocket endpoint, and provides a
health-check route.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure model metadata is registered before create_all
from app import models as _models  # noqa: F401
from app.config import settings
from app.database import Base, engine
from app.redis import close_redis, init_redis

# Routers
from app.routers import analysis, calculator, matches, system
from app.scheduler import start_scheduler, stop_scheduler

# WebSocket
from app.ws import live_odds as ws_live_odds

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: create DB tables + init Redis.  Shutdown: dispose both."""
    # --- Startup ---
    try:
        logger.info("Creating database tables (if they do not exist) …")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ready.")
    except Exception as e:
        logger.warning(f"Database unreachable during startup, continuing without DB initialization: {e}")

    await init_redis()

    # Start background job scheduler (after Redis so jobs can use get_redis())
    start_scheduler()

    yield

    # --- Shutdown ---
    stop_scheduler()          # graceful: wait=False, jobs finish naturally
    await close_redis()
    await engine.dispose()
    logger.info("Database engine disposed.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS — permissive for local development; tighten for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(matches.router)
app.include_router(analysis.router)
app.include_router(calculator.router)
app.include_router(system.router)    # Diagnostics: /api/system/scheduler-status, /trigger-job/{id}

# WebSocket router
app.include_router(ws_live_odds.router)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Return a simple health-check response."""
    return {"status": "ok"}
