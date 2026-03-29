"""Analysis router — GET /api/value-bets, GET /api/arbitrage (with Redis caching)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from app.cache import build_cache_key, cache_get, cache_set
from app.config import DEFAULT_EDGE_THRESHOLD
from app.database import get_db
from app.redis import get_redis
from app.schemas import ArbitrageResponse, ValueBetResponse
from app.services.matches import get_latest_odds
from app.services.odds_analysis import find_arbitrage, find_value_bets

router = APIRouter(prefix="/api", tags=["analysis"])


@router.get("/value-bets", response_model=list[ValueBetResponse])
async def list_value_bets(
    sport_key: list[str] | None = Query(default=None, description="Filter by sport key(s)"),
    threshold: float = Query(
        default=DEFAULT_EDGE_THRESHOLD,
        ge=0,
        le=1,
        description="Minimum edge threshold (0.05 = 5%)",
    ),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis),
) -> list[dict]:
    """Identify value bets by comparing each bookmaker's price to the
    consensus (sharp-bookmaker) implied probability.

    Results are cached in Redis for 5 minutes.
    """
    # --- Cache check ---
    cache_key = build_cache_key(
        "value_bets", sport_key=sport_key, threshold=threshold
    )
    cached = await cache_get(redis_client, cache_key)
    if cached is not None:
        return cached

    # --- Compute ---
    odds_rows = await get_latest_odds(db, sport_keys=sport_key)
    result = find_value_bets(odds_rows, threshold=threshold)

    # --- Cache store ---
    await cache_set(redis_client, cache_key, result)

    return result


@router.get("/arbitrage", response_model=list[ArbitrageResponse])
async def list_arbitrage(
    sport_key: list[str] | None = Query(default=None, description="Filter by sport key(s)"),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis),
) -> list[dict]:
    """Find arbitrage opportunities across bookmakers.

    Results are cached in Redis for 5 minutes.
    """
    # --- Cache check ---
    cache_key = build_cache_key("arbitrage", sport_key=sport_key)
    cached = await cache_get(redis_client, cache_key)
    if cached is not None:
        return cached

    # --- Compute ---
    odds_rows = await get_latest_odds(db, sport_keys=sport_key)
    result = find_arbitrage(odds_rows)

    # --- Cache store ---
    await cache_set(redis_client, cache_key, result)

    return result
