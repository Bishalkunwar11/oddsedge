"""Async database engine, session factory, and dependency for FastAPI."""

import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Declarative base
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    """Base class for all ORM models."""


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    """Yield an async session, or ``None`` if the database is unreachable.

    When PostgreSQL is offline the routers can fall through to the
    live-API data path instead of crashing with a 500.
    """
    session: AsyncSession | None = None
    try:
        session = async_session_factory()
        # Eagerly test the connection so we know *now* whether the DB is alive.
        # execute a lightweight "SELECT 1" — if this fails, we catch it and
        # yield None so the router uses the live-API fallback.
        from sqlalchemy import text
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Database unavailable — yielding None: %s", exc)
        if session is not None:
            try:
                await session.close()
            except Exception:
                pass
        session = None

    # Yield exactly once — either a working session or None.
    try:
        yield session
    finally:
        if session is not None:
            try:
                await session.close()
            except Exception:
                pass
