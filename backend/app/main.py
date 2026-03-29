"""FastAPI application entry-point.

Starts the server, creates database tables on startup, initialises Redis,
registers all routers and the WebSocket endpoint, and provides a
health-check route.
"""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.redis import init_redis, close_redis

# Ensure model metadata is registered before create_all
from app import models as _models  # noqa: F401

# Routers
from app.routers import analysis, calculator, matches

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
    logger.info("Creating database tables (if they do not exist) …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")

    await init_redis()

    yield

    # --- Shutdown ---
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

# WebSocket router
app.include_router(ws_live_odds.router)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Return a simple health-check response."""
    return {"status": "ok"}
