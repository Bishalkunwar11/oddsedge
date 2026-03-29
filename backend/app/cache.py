"""Reusable Redis caching helpers for FastAPI endpoints.

Provides ``cache_get`` / ``cache_set`` for manual use and a higher-level
pattern that routers can adopt to wrap their response logic.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


async def cache_get(
    redis_client: aioredis.Redis | None,
    key: str,
) -> Any | None:
    """Attempt to read a cached JSON value.

    Returns the deserialised Python object or ``None`` on miss / error.
    """
    if redis_client is None:
        return None
    try:
        raw = await redis_client.get(key)
        if raw is not None:
            logger.debug("Cache HIT: %s", key)
            return json.loads(raw)
    except Exception:
        logger.warning("Cache read error for key=%s", key, exc_info=True)
    return None


async def cache_set(
    redis_client: aioredis.Redis | None,
    key: str,
    value: Any,
    ttl: int | None = None,
) -> None:
    """Store a JSON-serialisable value in Redis with a TTL.

    Silently no-ops if Redis is unavailable.
    """
    if redis_client is None:
        return
    if ttl is None:
        ttl = settings.cache_ttl_seconds
    try:
        await redis_client.set(key, json.dumps(value, default=str), ex=ttl)
        logger.debug("Cache SET: %s (ttl=%ds)", key, ttl)
    except Exception:
        logger.warning("Cache write error for key=%s", key, exc_info=True)


def build_cache_key(prefix: str, **params: Any) -> str:
    """Build a deterministic cache key from a prefix and query params.

    Example::

        build_cache_key("matches", sport_key=["soccer_epl"])
        # → "matches:sport_key=['soccer_epl']"
    """
    parts = [prefix]
    for k, v in sorted(params.items()):
        if v is not None:
            parts.append(f"{k}={v}")
    return ":".join(parts)
