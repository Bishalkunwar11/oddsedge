"""Analysis router — GET /api/value-bets, GET /api/arbitrage (with Redis caching)."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import build_cache_key, cache_get, cache_set
from app.config import DEFAULT_EDGE_THRESHOLD
from app.database import get_db
from app.redis import get_redis
from app.schemas import ArbitrageResponse, ValueBetResponse, PlayerPropStats, MatchContext
from app.services.matches import get_latest_odds
from app.services.odds_analysis import find_arbitrage, find_value_bets
from app.services.contextual_data import get_match_context

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


@router.get("/player/{player_name}/props", response_model=PlayerPropStats)
async def get_player_prop_stats(
    player_name: str,
    prop_type: str = Query(default="shots_on_target", description="E.g. shots_on_target, goals, assists"),
    line: float = Query(default=1.5, ge=0.5, description="The betting line to grade against"),
    opponent: str | None = Query(default=None, description="Opponent name for H2H filtering"),
) -> dict:
    """Fetch specific H2H player data and historical success rates for props.
    
    (Mocked for Engine 2.1 to isolate Frontend UI dashboard development)
    """
    import random
    from datetime import datetime, timedelta

    # Generate 5 mock logs
    last_5_games = []
    hits = 0
    now = datetime.utcnow()
    
    opponents = ["Arsenal", "Chelsea", "Man Utd", "Liverpool", "Spurs", "Newcastle"]
    for i in range(5):
        # random value clustered around the line
        val = max(0.0, round(random.gauss(line, int(line * 1.5)), 0))
        is_hit = val >= line
        if is_hit:
            hits += 1
            
        last_5_games.append({
            "opponent": opponents[i % len(opponents)],
            "date": (now - timedelta(days=(i+1)*7)).strftime("%Y-%m-%d"),
            "value": val,
            "hit": is_hit
        })

    # Prepare H2H dict lazily
    h2h_vs_opponent = None
    if opponent:
        h2h_vs_opponent = {
            "opponent": opponent,
            "games_played": 3,
            "avg_value": round(line * random.uniform(0.8, 1.4), 1)
        }

    return {
        "player_name": player_name.replace("+", " ").title(),
        "prop_type": prop_type,
        "line": line,
        "last_5_games": last_5_games,
        "h2h_vs_opponent": h2h_vs_opponent,
        "hit_rate_l5": (hits / 5) * 100.0,
        "hit_rate_szn": random.choice([45.5, 52.0, 68.3, 75.0, 81.2])  # Realistic variance
    }


@router.get("/matches/{match_id}/context", response_model=MatchContext)
async def get_match_context_api(
    match_id: str,
    home_team: str = Query(...),
    away_team: str = Query(...),
) -> dict:
    """Fetch tactical context (weather, ref, fatigue, team H2H) for a match."""
    return get_match_context(match_id, home_team, away_team)

