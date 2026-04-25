from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PlayerGameLog
from app.schemas import H2HStats, LastGameLog, PlayerPropStats


async def get_player_analytics(
    db: AsyncSession,
    player_name: str,
    prop_type: str,
    line: float,
    opponent: str | None = None
) -> PlayerPropStats:
    """Calculate hit rates and fetch historical logs for a specific player prop."""

    # 1. Fetch Last 5 Games
    stmt = (
        select(PlayerGameLog)
        .where(func.lower(PlayerGameLog.player_name) == player_name.lower())
        .order_by(PlayerGameLog.date.desc())
        .limit(20) # Fetch more to calculate season rate too
    )
    result = await db.execute(stmt)
    all_logs = result.scalars().all()

    # Fallback if no data in DB (Ensures the UI doesn't break during initial dev)
    if not all_logs:
        return _generate_fallback_analytics(player_name, prop_type, line, opponent)

    # 2. Process Logs
    last_5_raw = all_logs[:5]
    last_5_logs = []
    hits_l5 = 0

    for log in last_5_raw:
        val = getattr(log, prop_type, 0)
        is_hit = val >= line
        if is_hit:
            hits_l5 += 1

        last_5_logs.append(LastGameLog(
            opponent=log.opponent,
            date=log.date.strftime("%Y-%m-%d"),
            value=float(val),
            hit=is_hit
        ))

    # 3. Calculate Season Hit Rate (from the 20 fetched)
    hits_szn = sum(1 for log in all_logs if getattr(log, prop_type, 0) >= line)
    hit_rate_szn = (hits_szn / len(all_logs)) * 100.0 if all_logs else 0.0

    # 4. H2H Stats
    h2h_stats = None
    if opponent:
        h2h_logs = [log for log in all_logs if log.opponent.lower() == opponent.lower()]
        if h2h_logs:
            avg_val = sum(getattr(log, prop_type, 0) for log in h2h_logs) / len(h2h_logs)
            h2h_stats = H2HStats(
                opponent=opponent,
                games_played=len(h2h_logs),
                avg_value=round(float(avg_val), 2)
            )

    return PlayerPropStats(
        player_name=player_name,
        prop_type=prop_type,
        line=line,
        last_5_games=last_5_logs,
        h2h_vs_opponent=h2h_stats,
        hit_rate_l5=(hits_l5 / 5) * 100.0 if len(last_5_logs) >= 5 else (hits_l5 / len(last_5_logs)) * 100.0 if last_5_logs else 0.0,
        hit_rate_szn=round(hit_rate_szn, 1)
    )

def _generate_fallback_analytics(player_name: str, prop_type: str, line: float, opponent: str | None) -> PlayerPropStats:
    """Internal mock generator for when the DB is empty."""

    now = datetime.utcnow()
    opponents = ["Arsenal", "Chelsea", "Man Utd", "Liverpool", "Spurs", "Newcastle"]
    last_5 = []
    hits = 0
    for i in range(5):
        val = max(0.0, round(random.gauss(line, 1.2), 0))
        is_hit = val >= line
        if is_hit:
            hits += 1
        last_5.append(LastGameLog(
            opponent=opponents[i % len(opponents)],
            date=(now - timedelta(days=(i+1)*7)).strftime("%Y-%m-%d"),
            value=float(val),
            hit=is_hit
        ))

    return PlayerPropStats(
        player_name=player_name.title(),
        prop_type=prop_type,
        line=line,
        last_5_games=last_5,
        h2h_vs_opponent=H2HStats(opponent=opponent or "Arsenal", games_played=3, avg_value=line * 0.9) if opponent else None,
        hit_rate_l5=(hits / 5) * 100.0,
        hit_rate_szn=random.choice([55.5, 62.0, 48.3])
    )


