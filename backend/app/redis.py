"""Async Redis client lifecycle and FastAPI dependency.

Provides ``init_redis`` / ``close_redis`` for the app lifespan and a
``get_redis`` dependency for route injection.  If Redis is unavailable the
dependency returns ``None`` so endpoints can degrade gracefully.
"""

from __future__ import annotations

import logging

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# Module-level client — initialised in lifespan
_redis_client: aioredis.Redis | None = None


async def init_redis() -> None:
    """Create the global async Redis connection pool."""
    global _redis_client
    try:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=20,
        )
        # Quick connectivity check
        await _redis_client.ping()
        logger.info("Redis connected at %s", settings.redis_url)
    except Exception:
        logger.warning("Redis unavailable — caching disabled.", exc_info=True)
        _redis_client = None


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection closed.")


def get_redis() -> aioredis.Redis | None:
    """Return the current Redis client (or ``None`` if unavailable).

    Usage in FastAPI routes::

        @router.get("/items")
        async def list_items(redis=Depends(get_redis)):
            ...
    """
    return _redis_client
