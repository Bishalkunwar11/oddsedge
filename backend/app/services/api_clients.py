"""Async HTTP clients for third-party sports-data providers.

Architecture
────────────
Each provider has its own thin client class (OddsApiClient, ApiFootballClient,
SportmonksClient).  All three follow the same pattern:

1. Keys/tokens are read exclusively from ``settings`` (never hardcoded).
2. Every public fetch method goes through ``_gatekeeper_fetch``, which:
   a. Checks Redis first — returns cached JSON immediately if present.
   b. Otherwise makes the live HTTPX request to the provider.
   c. Stores the response in Redis with a TTL of ``settings.cache_ttl_seconds``
      (default 300 s / 5 minutes) before returning it.
3. 429 Too Many Requests and network timeouts are caught and reraised as
   ``RateLimitError`` / ``ProviderTimeoutError`` so callers can handle them
   without crashing the whole application.

Usage
─────
    from app.services.api_clients import OddsApiClient

    async with OddsApiClient() as client:
        data = await client.fetch_odds("soccer_epl", redis_client=redis)
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
import redis.asyncio as aioredis

from app.cache import build_cache_key, cache_get, cache_set
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class RateLimitError(Exception):
    """Raised when a provider returns HTTP 429 Too Many Requests."""


class ProviderTimeoutError(Exception):
    """Raised when an HTTPX request exceeds the configured timeout."""


class ProviderError(Exception):
    """Raised for unexpected non-2xx responses from a provider."""


# ---------------------------------------------------------------------------
# Shared gatekeeper helper
# ---------------------------------------------------------------------------

async def _gatekeeper_fetch(
    *,
    redis_client: aioredis.Redis | None,
    cache_key: str,
    http_client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    ttl: int | None = None,
) -> Any:
    """Check Redis first; fall back to a live HTTP GET and cache the result.

    Args:
        redis_client:  Optional Redis client.  If ``None`` caching is skipped.
        cache_key:     Unique Redis key for this request.
        http_client:   A pre-configured ``httpx.AsyncClient`` instance.
        url:           Fully-qualified URL to fetch.
        params:        Optional query-string parameters (dict).
        headers:       Optional extra HTTP headers (dict).
        ttl:           Override cache TTL in seconds.  Defaults to
                       ``settings.cache_ttl_seconds``.

    Returns:
        Parsed JSON (dict or list).

    Raises:
        RateLimitError:      Provider returned 429.
        ProviderTimeoutError: Request timed out.
        ProviderError:       Any other non-2xx response.
    """
    # ── 1. Cache check ──────────────────────────────────────────────────
    cached = await cache_get(redis_client, cache_key)
    if cached is not None:
        logger.debug("Gatekeeper cache HIT  key=%s", cache_key)
        return cached

    # ── 2. Live HTTP request ─────────────────────────────────────────────
    logger.debug("Gatekeeper cache MISS key=%s — fetching from provider…", cache_key)
    try:
        response = await http_client.get(url, params=params, headers=headers)
    except httpx.TimeoutException as exc:
        raise ProviderTimeoutError(f"Timeout fetching {url}: {exc}") from exc
    except httpx.RequestError as exc:
        raise ProviderError(f"Network error fetching {url}: {exc}") from exc

    # ── 3. Status handling ───────────────────────────────────────────────
    if response.status_code == 429:
        retry_after = response.headers.get("Retry-After", "unknown")
        raise RateLimitError(
            f"Rate-limited by provider (429). Retry-After: {retry_after}s."
        )
    if not response.is_success:
        raise ProviderError(
            f"Provider returned {response.status_code} for {url}: {response.text[:200]}"
        )

    data = response.json()

    # ── 4. Cache the fresh response ──────────────────────────────────────
    await cache_set(redis_client, cache_key, data, ttl=ttl)

    return data


# ---------------------------------------------------------------------------
# Client 1 — The Odds API (https://the-odds-api.com)
# ---------------------------------------------------------------------------

_ODDS_API_BASE = "https://api.the-odds-api.com/v4"


class OddsApiClient:
    """Async client for The Odds API.

    Authentication: ``apiKey`` query parameter.
    Free tier: 500 requests/month — critical to cache aggressively.
    """

    def __init__(self, timeout: float = 10.0) -> None:
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> OddsApiClient:
        self._client = httpx.AsyncClient(timeout=self._timeout)
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()

    def _base_params(self) -> dict[str, str]:
        if not settings.odds_api_key:
            raise ProviderError(
                "ODDS_API_KEY is not set. Add it to your backend/.env file."
            )
        return {"apiKey": settings.odds_api_key}

    async def fetch_sports(
        self,
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch the list of available sports/leagues."""
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key("odds_api", endpoint="sports")
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_ODDS_API_BASE}/sports",
            params=self._base_params(),
        )

    async def fetch_odds(
        self,
        sport_key: str,
        regions: str = "eu,uk",
        markets: str = "h2h,spreads,totals",
        odds_format: str = "decimal",
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch pre-match odds for a given sport key.

        Args:
            sport_key:   e.g. ``"soccer_epl"``
            regions:     Comma-separated regions: ``"eu,uk,us"``
            markets:     Comma-separated markets: ``"h2h,spreads,totals"``
            odds_format: ``"decimal"`` or ``"american"``
            redis_client: Optional Redis client for gatekeeper caching.
        """
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "odds_api",
            endpoint="odds",
            sport=sport_key,
            regions=regions,
            markets=markets,
        )
        params = {
            **self._base_params(),
            "regions": regions,
            "markets": markets,
            "oddsFormat": odds_format,
        }
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_ODDS_API_BASE}/sports/{sport_key}/odds",
            params=params,
        )

    async def fetch_scores(
        self,
        sport_key: str,
        days_from: int = 1,
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch recent/live scores for a sport."""
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "odds_api", endpoint="scores", sport=sport_key, days=days_from
        )
        params = {**self._base_params(), "daysFrom": str(days_from)}
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_ODDS_API_BASE}/sports/{sport_key}/scores",
            params=params,
            ttl=60,  # Scores change fast — 60-second TTL
        )


# ---------------------------------------------------------------------------
# Client 2 — API-Football (https://www.api-football.com via RapidAPI)
# ---------------------------------------------------------------------------

_API_FOOTBALL_BASE = "https://api-football-v1.p.rapidapi.com/v3"
_API_FOOTBALL_HOST  = "api-football-v1.p.rapidapi.com"


class ApiFootballClient:
    """Async client for API-Football (hosted on RapidAPI).

    Authentication: ``x-rapidapi-key`` and ``x-rapidapi-host`` headers.
    Free tier: 100 requests/day — especially important to cache.
    """

    def __init__(self, timeout: float = 15.0) -> None:
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> ApiFootballClient:
        self._client = httpx.AsyncClient(timeout=self._timeout)
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()

    def _auth_headers(self) -> dict[str, str]:
        if not settings.api_football_key:
            raise ProviderError(
                "API_FOOTBALL_KEY is not set. Add it to your backend/.env file."
            )
        return {
            "x-rapidapi-key": settings.api_football_key,
            "x-rapidapi-host": _API_FOOTBALL_HOST,
        }

    async def fetch_fixtures(
        self,
        league_id: int,
        season: int,
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch fixtures / results for a league in a given season.

        Args:
            league_id:   e.g. ``39`` for EPL, ``140`` for La Liga.
            season:      Four-digit year, e.g. ``2024``.
            redis_client: Optional Redis client.
        """
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "api_football", endpoint="fixtures", league=league_id, season=season
        )
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_API_FOOTBALL_BASE}/fixtures",
            params={"league": league_id, "season": season},
            headers=self._auth_headers(),
        )

    async def fetch_player_statistics(
        self,
        player_id: int,
        season: int,
        league_id: int | None = None,
        redis_client: aioredis.Redis | None = None,
    ) -> dict:
        """Fetch detailed per-match statistics for a player.

        Args:
            player_id:   API-Football numeric player ID.
            season:      Season year.
            league_id:   Optional league to scope results.
            redis_client: Optional Redis client.
        """
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "api_football",
            endpoint="player_stats",
            player=player_id,
            season=season,
            league=league_id,
        )
        params: dict[str, Any] = {"id": player_id, "season": season}
        if league_id is not None:
            params["league"] = league_id
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_API_FOOTBALL_BASE}/players",
            params=params,
            headers=self._auth_headers(),
        )

    async def fetch_head_to_head(
        self,
        team_a_id: int,
        team_b_id: int,
        last: int = 10,
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch head-to-head history between two teams.

        Args:
            team_a_id: Numeric ID of the first team.
            team_b_id: Numeric ID of the second team.
            last:      How many recent meetings to fetch (default 10).
        """
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "api_football", endpoint="h2h", teams=f"{team_a_id}-{team_b_id}", last=last
        )
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_API_FOOTBALL_BASE}/fixtures/headtohead",
            params={"h2h": f"{team_a_id}-{team_b_id}", "last": last},
            headers=self._auth_headers(),
        )


# ---------------------------------------------------------------------------
# Client 3 — Sportmonks (https://www.sportmonks.com)
# ---------------------------------------------------------------------------

_SPORTMONKS_BASE = "https://api.sportmonks.com/v3/football"


class SportmonksClient:
    """Async client for Sportmonks Football API.

    Authentication: ``Authorization: <token>`` header.
    Includes: fixture metadata, lineups, weather, referee details.
    """

    def __init__(self, timeout: float = 15.0) -> None:
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> SportmonksClient:
        self._client = httpx.AsyncClient(timeout=self._timeout)
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()

    def _auth_headers(self) -> dict[str, str]:
        if not settings.sportmonks_api_token:
            raise ProviderError(
                "SPORTMONKS_API_TOKEN is not set. Add it to your backend/.env file."
            )
        return {"Authorization": settings.sportmonks_api_token}

    async def fetch_fixtures_by_date(
        self,
        date: str,  # "YYYY-MM-DD"
        include: str = "participants;scores;weather;referee",
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch fixtures (with weather & referee) for a specific date.

        Args:
            date:    ISO date string, e.g. ``"2025-04-12"``.
            include: Colon-separated Sportmonks includes.
        """
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "sportmonks", endpoint="fixtures_by_date", date=date, include=include
        )
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_SPORTMONKS_BASE}/fixtures/date/{date}",
            params={"include": include},
            headers=self._auth_headers(),
        )

    async def fetch_fixture_detail(
        self,
        fixture_id: int,
        include: str = "lineup;events;weather;referee;statistics",
        redis_client: aioredis.Redis | None = None,
    ) -> dict:
        """Fetch detailed data for a single fixture.

        Args:
            fixture_id: Sportmonks numeric fixture ID.
            include:    Colon-separated resource includes.
        """
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "sportmonks", endpoint="fixture_detail", id=fixture_id, include=include
        )
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_SPORTMONKS_BASE}/fixtures/{fixture_id}",
            params={"include": include},
            headers=self._auth_headers(),
        )

    async def fetch_odds_by_fixture(
        self,
        fixture_id: int,
        redis_client: aioredis.Redis | None = None,
    ) -> list[dict]:
        """Fetch pre-match odds for a specific fixture ID."""
        assert self._client, "Use as async context manager."
        cache_key = build_cache_key(
            "sportmonks", endpoint="odds", fixture=fixture_id
        )
        return await _gatekeeper_fetch(
            redis_client=redis_client,
            cache_key=cache_key,
            http_client=self._client,
            url=f"{_SPORTMONKS_BASE}/odds/pre-match/fixtures/{fixture_id}",
            headers=self._auth_headers(),
        )


