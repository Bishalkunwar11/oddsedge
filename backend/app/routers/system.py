"""System diagnostics & scheduler management endpoints.

Routes
──────
  GET  /api/system/scheduler-status          → List all registered jobs + next fire time
  POST /api/system/trigger-job/{job_id}      → Manually execute a specific job immediately
  GET  /api/system/health-extended           → Extended health: scheduler state + Redis + DB

All endpoints are designed to degrade gracefully when subsystems are
unavailable (e.g. scheduler not yet started, Redis offline).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.scheduler import scheduler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["system / diagnostics"])


# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------


class JobDetail(BaseModel):
    """Metadata snapshot for a single scheduled job."""

    job_id: str
    name: str
    trigger: str
    next_fire_time: str | None   # ISO-8601 string or None if paused/unscheduled
    is_running: bool             # True while the job coroutine is executing


class SchedulerStatusResponse(BaseModel):
    """Full scheduler health snapshot."""

    scheduler_running: bool
    job_count: int
    jobs: list[JobDetail]
    server_utc: str


class TriggerResponse(BaseModel):
    """Result of a manual job trigger."""

    job_id: str
    name: str
    triggered_at: str           # ISO-8601 UTC timestamp of when we fired it
    status: str                 # "triggered" | "error"
    detail: str | None = None   # Error message if status == "error"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _job_to_detail(job: Any) -> JobDetail:
    """Convert an APScheduler Job object to our typed JobDetail schema."""
    # APScheduler ≥3.10 uses next_fire_time; handle both attribute names safely
    raw_nft = getattr(job, "next_fire_time", None) or getattr(job, "next_run_time", None)
    next_fire: str | None = raw_nft.isoformat() if hasattr(raw_nft, "isoformat") else None

    # Trigger string representation (e.g. "cron[hour='2', minute='0']")
    trigger_str = str(getattr(job, "trigger", "unknown"))

    return JobDetail(
        job_id=job.id,
        name=job.name,
        trigger=trigger_str,
        next_fire_time=next_fire,
        is_running=False,  # APScheduler doesn't expose this directly; reserved for future
    )


def _scheduler_guard() -> None:
    """Raise 503 if the scheduler is not initialised yet."""
    if not scheduler.running:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Scheduler is not running. "
                "The application may still be starting up, or it was shut down."
            ),
        )


# ---------------------------------------------------------------------------
# Phase 1 — GET /api/system/scheduler-status
# ---------------------------------------------------------------------------


@router.get(
    "/scheduler-status",
    response_model=SchedulerStatusResponse,
    summary="List all registered scheduler jobs",
    description=(
        "Returns the complete list of APScheduler background jobs with their "
        "trigger configuration and next scheduled fire time. Useful for verifying "
        "that all cron/interval jobs are alive after a server restart."
    ),
)
async def get_scheduler_status() -> SchedulerStatusResponse:
    """Inspect the live scheduler and return a snapshot of all registered jobs."""
    is_running = scheduler.running

    if not is_running:
        # Return a valid (but empty) response rather than a hard 503 for read-only status
        return SchedulerStatusResponse(
            scheduler_running=False,
            job_count=0,
            jobs=[],
            server_utc=datetime.now(timezone.utc).isoformat(),
        )

    jobs = [_job_to_detail(j) for j in scheduler.get_jobs()]

    return SchedulerStatusResponse(
        scheduler_running=True,
        job_count=len(jobs),
        jobs=jobs,
        server_utc=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# Phase 2 — POST /api/system/trigger-job/{job_id}
# ---------------------------------------------------------------------------


# Map of valid job IDs → their async callables for direct invocation.
# This acts as an explicit allowlist — unknown job IDs are rejected with 404.
_KNOWN_JOBS: dict[str, str] = {
    "daily_fixtures": "fetch_daily_fixtures",
    "hourly_updates": "fetch_hourly_updates",
    "live_odds": "fetch_live_odds",
}


@router.post(
    "/trigger-job/{job_id}",
    response_model=TriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Manually trigger a scheduled job immediately",
    description=(
        "Forces a specific background job to execute **right now**, bypassing its "
        "scheduled trigger. Useful for QA, debugging, and verifying that external "
        "API integrations are working without waiting for the next cron window.\n\n"
        "**Valid job IDs:** `daily_fixtures`, `hourly_updates`, `live_odds`\n\n"
        "The job runs asynchronously. Check server logs for its output."
    ),
)
async def trigger_job(job_id: str) -> TriggerResponse:
    """Immediately execute the named APScheduler job.

    The job is invoked directly as a coroutine in the current request's event
    loop.  APScheduler's own scheduling state is not modified — the next
    scheduled run time remains unchanged.

    Args:
        job_id: One of ``daily_fixtures``, ``hourly_updates``, ``live_odds``.

    Returns:
        ``TriggerResponse`` with status ``"triggered"`` on success, or
        ``"error"`` with a detail message on failure.

    Raises:
        404: ``job_id`` is not in the allowlist.
        503: Scheduler is not running.
    """
    _scheduler_guard()

    # --- Allowlist validation ------------------------------------------------
    if job_id not in _KNOWN_JOBS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Unknown job_id '{job_id}'. "
                f"Valid options: {', '.join(_KNOWN_JOBS.keys())}"
            ),
        )

    # --- Verify the job is actually registered in the live scheduler ---------
    live_job = scheduler.get_job(job_id)
    if live_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Job '{job_id}' was not found in the live scheduler. "
                "It may have been removed or failed to register."
            ),
        )

    triggered_at = datetime.now(timezone.utc).isoformat()
    job_name = live_job.name

    logger.info(
        "🔧 [SYSTEM] Manual trigger requested for job '%s' (%s) at %s",
        job_id,
        job_name,
        triggered_at,
    )

    # --- Directly invoke the async job coroutine ----------------------------
    # We import the coroutine function from the scheduler module at call-time
    # so there is no circular-import risk at module initialisation.
    try:
        from app.scheduler import (
            fetch_daily_fixtures,
            fetch_hourly_updates,
            fetch_live_odds,
        )

        fn_map = {
            "daily_fixtures": fetch_daily_fixtures,
            "hourly_updates": fetch_hourly_updates,
            "live_odds": fetch_live_odds,
        }

        coroutine_fn = fn_map[job_id]
        # Run as a background task so the HTTP response returns immediately
        # and the job output appears in the server logs.
        asyncio.create_task(coroutine_fn())

        logger.info("✅ [SYSTEM] Job '%s' dispatched as background task.", job_id)

        return TriggerResponse(
            job_id=job_id,
            name=job_name,
            triggered_at=triggered_at,
            status="triggered",
            detail=f"Job '{job_id}' dispatched successfully. Check server logs for output.",
        )

    except Exception as exc:
        logger.exception("❌ [SYSTEM] Failed to trigger job '%s': %s", job_id, exc)
        return TriggerResponse(
            job_id=job_id,
            name=job_name,
            triggered_at=triggered_at,
            status="error",
            detail=str(exc),
        )


# ---------------------------------------------------------------------------
# Bonus — GET /api/system/health-extended
# ---------------------------------------------------------------------------


@router.get(
    "/health-extended",
    summary="Extended system health check",
    description="Returns scheduler state, Redis connectivity, and server timestamp.",
)
async def health_extended() -> dict[str, Any]:
    """Extended health check — checks scheduler, Redis, and returns server time."""
    from app.redis import get_redis

    redis_client = get_redis()
    redis_ok = False
    if redis_client is not None:
        try:
            redis_ok = await redis_client.ping()
        except Exception:
            redis_ok = False

    scheduler_jobs = []
    if scheduler.running:
        scheduler_jobs = [
            {"id": j.id, "name": j.name} for j in scheduler.get_jobs()
        ]

    return {
        "status": "ok",
        "server_utc": datetime.now(timezone.utc).isoformat(),
        "scheduler": {
            "running": scheduler.running,
            "job_count": len(scheduler_jobs),
            "jobs": scheduler_jobs,
        },
        "redis": {
            "connected": redis_ok,
        },
    }
