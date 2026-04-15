"""Analysis router — GET /api/value-bets, GET /api/arbitrage (with Redis caching + live API fallback)."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import build_cache_key, cache_get, cache_set
from app.config import DEFAULT_EDGE_THRESHOLD
from app.database import get_db
from app.redis import get_redis
from app.schemas import ArbitrageResponse, MatchContext, PlayerPropStats, ValueBetResponse
from app.services.contextual_data import get_match_context
from app.services.live_data import get_live_odds_rows
from app.services.matches import get_latest_odds
from app.services.odds_analysis import find_arbitrage, find_value_bets
from app.services.player_stats import get_player_analytics

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

    Data source priority:
      1. Redis cache (5 min TTL)
      2. PostgreSQL database
      3. Live fetch from The Odds API (fallback when DB is empty)
    """
    # --- Cache check ---
    cache_key = build_cache_key(
        "value_bets", sport_key=sport_key, threshold=threshold
    )
    cached = await cache_get(redis_client, cache_key)
    if cached is not None:
        return cached

    # --- DB query, with live API fallback ---
    odds_rows = await get_latest_odds(db, sport_keys=sport_key)
    if not odds_rows:
        odds_rows = await get_live_odds_rows(redis_client=redis_client, sport_keys=sport_key)

    # --- Engine 3: Generate Context Map ---
    match_ids = {r["match_id"] for r in odds_rows}
    context_map = {}
    for mid in match_ids:
        # Pick the first row for this match to get team names
        sample = next(r for r in odds_rows if r["match_id"] == mid)
        context_map[mid] = get_match_context(mid, sample["home_team"], sample["away_team"])

    result = find_value_bets(odds_rows, threshold=threshold, context_map=context_map)

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

    Data source priority:
      1. Redis cache (5 min TTL)
      2. PostgreSQL database
      3. Live fetch from The Odds API (fallback when DB is empty)
    """
    # --- Cache check ---
    cache_key = build_cache_key("arbitrage", sport_key=sport_key)
    cached = await cache_get(redis_client, cache_key)
    if cached is not None:
        return cached

    # --- DB query, with live API fallback ---
    odds_rows = await get_latest_odds(db, sport_keys=sport_key)
    if not odds_rows:
        odds_rows = await get_live_odds_rows(redis_client=redis_client, sport_keys=sport_key)

    result = find_arbitrage(odds_rows)

    # --- Cache store ---
    await cache_set(redis_client, cache_key, result)

    return result


@router.get("/player/{player_name}/props", response_model=PlayerPropStats)
async def get_player_prop_stats(
    player_name: str,
    prop_type: str = Query(default="shots_on_target", description="E.g. shots_on_target, goals, assists"),
    line: float = Query(default=1.5, ge=0.5, description="The betting line to grade against"),
    opponent: str | None = Query(default=None, description="Opponent name for H2H filtering"),
    db: AsyncSession = Depends(get_db),
) -> PlayerPropStats:
    """Fetch specific H2H player data and historical success rates for props."""
    return await get_player_analytics(
        db=db,
        player_name=player_name.replace("+", " "),
        prop_type=prop_type,
        line=line,
        opponent=opponent
    )


@router.get("/matches/{match_id}/context", response_model=MatchContext)
async def get_match_context_api(
    match_id: str,
    home_team: str = Query(...),
    away_team: str = Query(...),
) -> dict:
    """Fetch tactical context (weather, ref, fatigue, team H2H) for a match."""
    return get_match_context(match_id, home_team, away_team)

