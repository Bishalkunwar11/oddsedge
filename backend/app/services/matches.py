"""Async database queries for matches and odds.

Replaces the Streamlit-cached loader functions from ``src/data/loaders.py``
with proper async SQLAlchemy queries.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Match, Odds


async def get_upcoming_matches(
    db: AsyncSession,
    sport_keys: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Return all matches whose commence_time is in the future.

    Args:
        db: Async database session.
        sport_keys: Optional sport-key filter.

    Returns:
        List of match dicts.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        select(Match)
        .where(Match.commence_time >= now)
        .order_by(Match.commence_time)
    )
    if sport_keys:
        stmt = stmt.where(Match.sport_key.in_(sport_keys))

    result = await db.execute(stmt)
    matches = result.scalars().all()
    return [
        {
            "match_id": m.match_id,
            "sport_key": m.sport_key,
            "league": m.league,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "commence_time": m.commence_time.isoformat(),
            "created_at": m.created_at.isoformat(),
        }
        for m in matches
    ]


async def get_latest_odds(
    db: AsyncSession,
    sport_keys: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Return the most recent odds snapshot per match/bookmaker/market/outcome.

    Uses a window function (``ROW_NUMBER()``) to pick only the latest row
    per partition, mirroring the original SQLite query from ``db_manager.py``.

    Args:
        db: Async database session.
        sport_keys: Optional sport-key filter.

    Returns:
        Flat list of dicts with match metadata + odds fields.
    """
    # Subquery: rank odds rows per partition
    row_num = (
        func.row_number()
        .over(
            partition_by=[
                Odds.match_id,
                Odds.bookmaker,
                Odds.market,
                Odds.outcome_name,
            ],
            order_by=Odds.id.desc(),
        )
        .label("rn")
    )

    subq = (
        select(Odds, row_num)
        .subquery()
    )

    stmt = (
        select(
            Match.match_id,
            Match.sport_key,
            Match.league,
            Match.home_team,
            Match.away_team,
            Match.commence_time,
            subq.c.bookmaker,
            subq.c.market,
            subq.c.outcome_name,
            subq.c.outcome_price,
            subq.c.point,
            subq.c.timestamp,
        )
        .join(subq, Match.match_id == subq.c.match_id)
        .where(subq.c.rn == 1)
    )

    if sport_keys:
        stmt = stmt.where(Match.sport_key.in_(sport_keys))

    stmt = stmt.order_by(Match.commence_time, Match.match_id, subq.c.bookmaker)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "match_id": r.match_id,
            "sport_key": r.sport_key,
            "league": r.league,
            "home_team": r.home_team,
            "away_team": r.away_team,
            "commence_time": r.commence_time.isoformat()
                if isinstance(r.commence_time, datetime) else str(r.commence_time),
            "bookmaker": r.bookmaker,
            "market": r.market,
            "outcome_name": r.outcome_name,
            "outcome_price": r.outcome_price,
            "point": r.point,
            "timestamp": r.timestamp.isoformat()
                if isinstance(r.timestamp, datetime) else str(r.timestamp),
        }
        for r in rows
    ]
