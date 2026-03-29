"""Matches router — GET /api/matches (with Redis caching)."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import build_cache_key, cache_get, cache_set
from app.database import get_db
from app.redis import get_redis
from app.services.matches import get_latest_odds

router = APIRouter(prefix="/api", tags=["matches"])


@router.get("/matches")
async def list_matches(
    sport_key: list[str] | None = Query(default=None, description="Filter by sport key(s)"),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis),
) -> list[dict]:
    """Return upcoming matches with their latest odds.

    Results are cached in Redis for 5 minutes (configurable via
    ``CACHE_TTL_SECONDS``).  Each match includes an embedded ``odds``
    list with the most recent snapshot per bookmaker/market/outcome.
    """
    # --- Cache check ---
    cache_key = build_cache_key("matches", sport_key=sport_key)
    cached = await cache_get(redis_client, cache_key)
    if cached is not None:
        return cached

    # --- DB query ---
    odds_rows = await get_latest_odds(db, sport_keys=sport_key)
    if not odds_rows:
        return []

    # Group by match
    matches_map: dict[str, dict] = {}
    for row in odds_rows:
        mid = row["match_id"]
        if mid not in matches_map:
            matches_map[mid] = {
                "match_id": mid,
                "sport_key": row["sport_key"],
                "league": row["league"],
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "commence_time": row["commence_time"],
                "odds": [],
            }
        matches_map[mid]["odds"].append(
            {
                "bookmaker": row["bookmaker"],
                "market": row["market"],
                "outcome_name": row["outcome_name"],
                "outcome_price": row["outcome_price"],
                "point": row["point"],
                "timestamp": row["timestamp"],
            }
        )

    result = list(matches_map.values())

    # --- Cache store ---
    await cache_set(redis_client, cache_key, result)

    return result
