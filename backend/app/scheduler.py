"""Background task scheduler for OddsEdge.

Architecture
────────────
Uses APScheduler's ``AsyncIOScheduler`` which co-operatively runs async jobs
inside uvicorn's *existing* event loop — nothing is ever blocked, and no
extra threads or processes are created.

Job schedule (designed around free-tier API limits)
────────────────────────────────────────────────────
  fetch_daily_fixtures   → cron  02:00 AM daily   (API-Football / Sportmonks)
                           API-Football free: 100 req/day → run once, cache all
  fetch_hourly_updates   → interval  every 60 min  (lineup changes, injuries)
                           Sportmonks: lightweight metadata poll
  fetch_live_odds        → interval  every 60 sec   (The Odds API)
                           Odds API free: 500 req/month ≈ avoid hammering;
                           the gatekeeper in api_clients.py caches for 5 min,
                           so real HTTP hits are at most once per TTL, not once
                           per schedule tick.

Wiring into FastAPI
───────────────────
Call ``start_scheduler()`` / ``stop_scheduler()`` from the app's lifespan
context (see main.py).  The module exposes a ``scheduler`` singleton so
callers can introspect job state if needed (e.g. an admin endpoint).
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scheduler singleton
# ---------------------------------------------------------------------------

scheduler = AsyncIOScheduler(
    # Give the scheduler its own logger namespace
    logger=logging.getLogger("apscheduler"),
    # Job defaults: coalesce missed runs (e.g. after a server restart) and
    # cap the max concurrent instances per job to 1 to avoid pile-ups.
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 60,   # Allow jobs to fire up to 60s late before skipping
    },
)


# ---------------------------------------------------------------------------
# Job functions — LIVE implementations
# ---------------------------------------------------------------------------

async def fetch_daily_fixtures() -> None:
    """Pull tomorrow's fixture metadata from API-Football + Sportmonks.

    Scheduled: cron  02:00 AM server-local time every day.

    Rate-limit budget:
    - API-Football free tier: 100 requests/day — batch per-league, not per-fixture.
    - Sportmonks free tier: limited daily fixtures — same constraint.
    """
    import datetime

    from app.config import settings
    from app.redis import get_redis
    from app.services.api_clients import (
        ApiFootballClient,
        ProviderError,
        ProviderTimeoutError,
        RateLimitError,
        SportmonksClient,
    )

    logger.info("⏰ [SCHEDULER] Running daily fixture pull — fetching from API-Football + Sportmonks…")
    redis = get_redis()

    # ── API-Football: batch fixture pull per league ──────────────────────
    if settings.api_football_key:
        try:
            async with ApiFootballClient() as af_client:
                leagues = [39, 140, 135, 78, 61]  # EPL, La Liga, Serie A, Bundesliga, Ligue 1
                for lid in leagues:
                    try:
                        data = await af_client.fetch_fixtures(league_id=lid, season=2025, redis_client=redis)
                        count = len(data) if isinstance(data, list) else 1
                        logger.info("   API-Football league=%d: fetched %d fixtures", lid, count)
                    except (RateLimitError, ProviderTimeoutError, ProviderError) as exc:
                        logger.error("   API-Football league=%d failed: %s", lid, exc)
        except Exception as exc:
            logger.exception("   API-Football client error: %s", exc)
    else:
        logger.warning("   API_FOOTBALL_KEY not set — skipping API-Football fixture pull.")

    # ── Sportmonks: today's fixtures with metadata ───────────────────────
    if settings.sportmonks_api_token:
        try:
            async with SportmonksClient() as sm_client:
                today = datetime.date.today().isoformat()
                data = await sm_client.fetch_fixtures_by_date(date=today, redis_client=redis)
                count = len(data) if isinstance(data, list) else 1
                logger.info("   Sportmonks date=%s: fetched %d fixtures", today, count)
        except (RateLimitError, ProviderTimeoutError, ProviderError) as exc:
            logger.error("   Sportmonks failed: %s", exc)
        except Exception as exc:
            logger.exception("   Sportmonks client error: %s", exc)
    else:
        logger.warning("   SPORTMONKS_API_TOKEN not set — skipping Sportmonks fixture pull.")

    logger.info("✅ [SCHEDULER] Daily fixture pull complete.")


async def fetch_hourly_updates() -> None:
    """Poll for lineup changes, injury news, and referee assignments.

    Scheduled: interval  every 60 minutes.
    Lightweight — only refreshes metadata, not full fixture lists.
    """
    from app.config import settings
    from app.redis import get_redis
    from app.services.api_clients import (
        ProviderError,
        ProviderTimeoutError,
        RateLimitError,
        SportmonksClient,
    )

    logger.info("⏰ [SCHEDULER] Running hourly updates — refreshing lineups, referees, weather…")
    redis = get_redis()

    if settings.sportmonks_api_token:
        try:
            async with SportmonksClient() as sm_client:
                import datetime
                today = datetime.date.today().isoformat()
                data = await sm_client.fetch_fixtures_by_date(
                    date=today,
                    include="participants;scores;weather;referee;lineup",
                    redis_client=redis,
                )
                count = len(data) if isinstance(data, list) else 1
                logger.info("   Sportmonks hourly refresh: %d fixtures updated", count)
        except (RateLimitError, ProviderTimeoutError, ProviderError) as exc:
            logger.error("   Sportmonks hourly refresh failed: %s", exc)
        except Exception as exc:
            logger.exception("   Sportmonks hourly error: %s", exc)
    else:
        logger.warning("   SPORTMONKS_API_TOKEN not set — skipping hourly updates.")

    # Also refresh live odds data in the background
    try:
        from app.services.live_data import fetch_and_cache_live_odds
        rows = await fetch_and_cache_live_odds(redis_client=redis, force_refresh=False)
        logger.info("   Live odds cache: %d rows available", len(rows))
    except Exception as exc:
        logger.error("   Live odds hourly refresh failed: %s", exc)

    logger.info("✅ [SCHEDULER] Hourly updates complete.")


async def fetch_live_odds() -> None:
    """Refresh pre-match odds from The Odds API for all tracked leagues.

    Scheduled: interval  every 60 seconds.

    The gatekeeper in live_data.py caches results for 5 min, so even though
    this job fires every 60s, real HTTP hits only happen once per TTL window.
    """
    from app.redis import get_redis
    from app.services.live_data import fetch_and_cache_live_odds

    logger.info("⏰ [SCHEDULER] Fetching live odds from The Odds API…")
    redis = get_redis()

    try:
        rows = await fetch_and_cache_live_odds(redis_client=redis, force_refresh=False)
        logger.info("✅ [SCHEDULER] Live odds fetch complete — %d rows.", len(rows))
    except Exception as exc:
        logger.error("❌ [SCHEDULER] Live odds fetch failed: %s", exc)


# ---------------------------------------------------------------------------
# Registration — wires jobs to the scheduler singleton
# ---------------------------------------------------------------------------

def _register_jobs() -> None:
    """Attach all jobs to ``scheduler``.  Called once during startup."""

    # ── Daily fixture pull — 02:00 AM every day ─────────────────────────
    scheduler.add_job(
        fetch_daily_fixtures,
        trigger=CronTrigger(hour=2, minute=0),
        id="daily_fixtures",
        name="Daily Fixture Pull (API-Football + Sportmonks)",
        replace_existing=True,
    )

    # ── Hourly metadata refresh ──────────────────────────────────────────
    scheduler.add_job(
        fetch_hourly_updates,
        trigger=IntervalTrigger(hours=1),
        id="hourly_updates",
        name="Hourly Metadata Refresh (lineups / referees / weather)",
        replace_existing=True,
    )

    # ── Live odds — every 60 seconds (gatekeeper caches for 5 min) ──────
    scheduler.add_job(
        fetch_live_odds,
        trigger=IntervalTrigger(seconds=60),
        id="live_odds",
        name="Live Odds Refresh (The Odds API — gatekeeper cached)",
        replace_existing=True,
    )

    for job in scheduler.get_jobs():
        next_run = getattr(job, "next_fire_time", None) or getattr(job, "next_run_time", "pending")
        logger.info(
            "📅 Registered job: %-40s  next_run=%s",
            job.name,
            next_run,
        )


# ---------------------------------------------------------------------------
# Public lifecycle helpers (called from main.py lifespan)
# ---------------------------------------------------------------------------

def start_scheduler() -> None:
    """Start the AsyncIOScheduler and register all background jobs.

    Must be called from inside an already-running asyncio event loop
    (e.g. from the FastAPI lifespan context).
    """
    _register_jobs()
    scheduler.start()
    logger.info("🚀 Background scheduler started. %d job(s) registered.", len(scheduler.get_jobs()))


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler on application exit.

    ``wait=False`` avoids blocking the event loop during shutdown; any
    currently-executing jobs will be allowed to complete naturally.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 Background scheduler shut down.")
