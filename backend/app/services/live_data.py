"""Live data ingestion service — bridges The Odds API into the OddsEdge row format.

This module is the single source of truth for converting raw Odds API JSON
into the flat dict schema that ``find_arbitrage`` / ``find_value_bets`` /
``get_latest_odds`` all expect.

It is called:
  1. By the scheduler (background refresh, stores in Redis)
  2. By the matches + analysis routers (on-demand fallback when DB is empty)

Caching strategy (3 levels):
  L1: Redis — shared across processes, TTL-based
  L2: In-memory dict — survives within same process, no TTL
  L3: Local JSON file — survives server restarts
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import redis.asyncio as aioredis

from app.cache import cache_get, cache_set
from app.config import LEAGUES, settings
from app.services.api_clients import (
    OddsApiClient,
    ProviderError,
    ProviderTimeoutError,
    RateLimitError,
)

logger = logging.getLogger(__name__)

# Cache key used by both the scheduler writer and the router reader
LIVE_ODDS_CACHE_KEY = "live_odds:all_leagues"
LIVE_ODDS_TTL = 300  # 5 minutes — matches cache_ttl_seconds default

# L2: In-memory cache (survives within same uvicorn process)
_memory_cache: list[dict[str, Any]] = []

# L3: On-disk cache file (survives server restarts)
_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".cache"
_CACHE_FILE = _CACHE_DIR / "live_odds.json"


def _save_to_disk(rows: list[dict]) -> None:
    """Persist odds rows as a JSON file for crash/restart resilience."""
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(_CACHE_FILE, "w") as f:
            json.dump(rows, f, default=str)
        logger.debug("Saved %d rows to disk cache: %s", len(rows), _CACHE_FILE)
    except Exception:
        logger.warning("Failed to write disk cache", exc_info=True)


def _load_from_disk() -> list[dict] | None:
    """Load odds rows from the local JSON file cache."""
    try:
        if _CACHE_FILE.exists():
            with open(_CACHE_FILE) as f:
                data = json.load(f)
            if data:
                logger.info("Loaded %d rows from disk cache: %s", len(data), _CACHE_FILE)
                return data
    except Exception:
        logger.warning("Failed to read disk cache", exc_info=True)
    return None


# ---------------------------------------------------------------------------
# The Odds API → internal row format converter
# ---------------------------------------------------------------------------

def _odds_api_to_rows(events: list[dict]) -> list[dict[str, Any]]:
    """Convert The Odds API event list into flat odds-row dicts.

    Each row matches the schema expected by find_value_bets / find_arbitrage:
      match_id, sport_key, league, home_team, away_team, commence_time,
      bookmaker, market, outcome_name, outcome_price, point,
      timestamp, prop_type, player_name, is_main_market
    """
    rows: list[dict] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for event in events:
        match_id = event.get("id", "")
        sport_key = event.get("sport_key", "")
        home_team = event.get("home_team", "")
        away_team = event.get("away_team", "")
        commence_time = event.get("commence_time", now_iso)

        # Reverse-lookup league display name from sport_key
        league = next(
            (name for name, key in LEAGUES.items() if key == sport_key),
            sport_key,
        )

        for bookmaker in event.get("bookmakers", []):
            bk_name = bookmaker.get("key", bookmaker.get("title", "unknown"))
            bk_updated = bookmaker.get("last_update", now_iso)

            for market in bookmaker.get("markets", []):
                market_key = market.get("key", "h2h")
                is_main = market_key in ("h2h", "spreads", "totals")

                for outcome in market.get("outcomes", []):
                    rows.append({
                        "match_id": match_id,
                        "sport_key": sport_key,
                        "league": league,
                        "home_team": home_team,
                        "away_team": away_team,
                        "commence_time": commence_time,
                        "bookmaker": bk_name,
                        "market": market_key,
                        "outcome_name": outcome.get("name", ""),
                        "outcome_price": float(outcome.get("price", 0)),
                        "point": outcome.get("point"),
                        "timestamp": bk_updated,
                        "prop_type": None,
                        "player_name": None,
                        "is_main_market": is_main,
                    })

    return rows


# ---------------------------------------------------------------------------
# Primary ingestion function — called by scheduler AND routers
# ---------------------------------------------------------------------------

async def fetch_and_cache_live_odds(
    redis_client: aioredis.Redis | None = None,
    force_refresh: bool = False,
) -> list[dict[str, Any]]:
    """Fetch live odds from The Odds API for all tracked leagues and cache them.

    Caching waterfall:
      1. L1: Redis (shared, TTL-based)
      2. L2: In-memory (process-local)
      3. L3: Disk JSON (restart-resilient)
      4. Live API fetch (last resort)

    Args:
        redis_client: Shared Redis client (None = L1 skipped).
        force_refresh: If True, bypass all caches and hit the API.

    Returns:
        Flat list of odds rows, or [] if nothing available.
    """
    global _memory_cache

    # ── L1: Redis cache ──────────────────────────────────────────────────
    if not force_refresh:
        cached = await cache_get(redis_client, LIVE_ODDS_CACHE_KEY)
        if cached is not None:
            logger.debug("L1 HIT: Live odds from Redis (%d rows)", len(cached))
            _memory_cache = cached  # Keep L2 warm
            return cached

    # ── L2: In-memory cache ──────────────────────────────────────────────
    if not force_refresh and _memory_cache:
        logger.debug("L2 HIT: Live odds from memory (%d rows)", len(_memory_cache))
        return _memory_cache

    # ── L3: Disk cache ──────────────────────────────────────────────────
    if not force_refresh:
        disk_data = _load_from_disk()
        if disk_data:
            _memory_cache = disk_data
            # Also push back to Redis if available
            await cache_set(redis_client, LIVE_ODDS_CACHE_KEY, disk_data, ttl=LIVE_ODDS_TTL)
            return disk_data

    # ── L4: Live API fetch ───────────────────────────────────────────────
    if not settings.odds_api_key:
        logger.warning("ODDS_API_KEY not set — cannot fetch live odds.")
        return _memory_cache  # Return whatever we have from L2

    all_rows: list[dict] = []
    sport_keys = list(LEAGUES.values())

    try:
        async with OddsApiClient() as client:
            for sport_key in sport_keys:
                try:
                    events = await client.fetch_odds(
                        sport_key=sport_key,
                        regions="eu,uk",
                        markets="h2h,spreads,totals",
                        odds_format="decimal",
                        redis_client=None,
                    )
                    rows = _odds_api_to_rows(events)
                    all_rows.extend(rows)
                    logger.info(
                        "Fetched %d odds rows for sport_key=%s (%d events)",
                        len(rows), sport_key, len(events),
                    )
                except (RateLimitError, ProviderTimeoutError, ProviderError) as exc:
                    logger.error("Odds API error for %s: %s", sport_key, exc)
                    continue

    except Exception as exc:
        logger.exception("Unexpected error fetching live odds: %s", exc)

    if not all_rows:
        logger.warning("No live odds from API. Falling back to existing cache.")
        # Return the best data we have
        if _memory_cache:
            return _memory_cache
        disk_data = _load_from_disk()
        if disk_data:
            _memory_cache = disk_data
            return disk_data
        return []

    # ── Persist to ALL cache levels ──────────────────────────────────────
    _memory_cache = all_rows
    await cache_set(redis_client, LIVE_ODDS_CACHE_KEY, all_rows, ttl=LIVE_ODDS_TTL)
    _save_to_disk(all_rows)
    logger.info("Cached %d total odds rows (Redis + memory + disk)", len(all_rows))

    return all_rows


async def get_live_odds_rows(
    redis_client: aioredis.Redis | None = None,
    sport_keys: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Get live odds rows, using the multi-level cache waterfall.

    This is the router-facing entry point.

    Args:
        redis_client: Shared Redis client.
        sport_keys: Optional list to filter by sport_key.

    Returns:
        Filtered list of odds rows.
    """
    rows = await fetch_and_cache_live_odds(redis_client=redis_client)

    if sport_keys:
        rows = [r for r in rows if r["sport_key"] in sport_keys]

    return rows

