"""Pure-function odds analysis: arbitrage, value bets, consensus line.

Replaces the pandas-based ``OddsAnalyzer`` from ``src/analyzer.py`` with
plain-Python logic that operates on lists of dicts (DB row mappings).
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from app.config import DEFAULT_EDGE_THRESHOLD, SHARP_BOOKMAKERS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core mathematics
# ---------------------------------------------------------------------------


def implied_probability(decimal_odds: float) -> float:
    """Convert decimal odds to implied probability.

    Raises:
        ValueError: If *decimal_odds* is not positive.
    """
    if decimal_odds <= 0:
        raise ValueError(f"decimal_odds must be positive, got {decimal_odds}")
    return 1.0 / decimal_odds


def calculate_margin(odds_list: list[float]) -> float:
    """Calculate bookmaker margin (overround).

    Raises:
        ValueError: If *odds_list* is empty or contains non-positive values.
    """
    if not odds_list:
        raise ValueError("odds_list must not be empty.")
    for o in odds_list:
        if o <= 0:
            raise ValueError(f"All odds must be positive, got {o}")
    return sum(1.0 / o for o in odds_list) - 1.0


def calculate_fair_odds(odds_list: list[float]) -> list[float]:
    """Remove the margin from odds to get fair prices."""
    if not odds_list:
        raise ValueError("odds_list must not be empty.")
    total_implied = sum(1.0 / o for o in odds_list)
    return [o * total_implied for o in odds_list]


# ---------------------------------------------------------------------------
# Arbitrage detection
# ---------------------------------------------------------------------------


def find_arbitrage(odds_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Find arbitrage opportunities across bookmakers.

    For each ``(match_id, market)`` group, picks the best price per outcome
    across all bookmakers.  If ``sum(1/best) < 1`` an arb exists.

    Args:
        odds_rows: Flat list of dicts with keys ``match_id``, ``home_team``,
            ``away_team``, ``commence_time``, ``bookmaker``, ``market``,
            ``outcome_name``, ``outcome_price``.

    Returns:
        List of arb-opportunity dicts.
    """
    if not odds_rows:
        return []

    # Group by (match_id, market)
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in odds_rows:
        key = (row["match_id"], row["market"])
        groups[key].append(row)

    results: list[dict[str, Any]] = []
    for (match_id, market), rows in groups.items():
        # Best price per outcome
        best: dict[str, float] = {}
        for r in rows:
            name = r["outcome_name"]
            price = r["outcome_price"]
            if price > 0 and (name not in best or price > best[name]):
                best[name] = price

        if not best:
            continue

        inv_sum = sum(1.0 / p for p in best.values())
        if inv_sum < 1.0:
            arb_pct = round((1.0 / inv_sum - 1.0) * 100, 4)
            meta = rows[0]
            results.append(
                {
                    "match_id": match_id,
                    "home_team": meta["home_team"],
                    "away_team": meta["away_team"],
                    "commence_time": meta["commence_time"],
                    "market": market,
                    "arb_pct": arb_pct,
                    "best_odds": best,
                }
            )

    return results


# ---------------------------------------------------------------------------
# Consensus line (sharp bookmakers)
# ---------------------------------------------------------------------------


def get_consensus_line(
    odds_rows: list[dict[str, Any]],
    sharp_books: list[str] | None = None,
) -> dict[tuple[str, str, str], float]:
    """Average implied probabilities from sharp bookmakers.

    Args:
        odds_rows: Flat odds rows (same schema as ``find_arbitrage``).
        sharp_books: Sharp bookmaker names (case-insensitive).

    Returns:
        Dict mapping ``(match_id, market, outcome_name)`` → consensus prob.
    """
    if sharp_books is None:
        sharp_books = SHARP_BOOKMAKERS

    sharp_lower = {b.lower() for b in sharp_books}
    sharp_rows = [r for r in odds_rows if r["bookmaker"].lower() in sharp_lower]

    if not sharp_rows:
        logger.warning(
            "No sharp bookmaker data found; falling back to all bookmakers."
        )
        sharp_rows = odds_rows

    # Accumulate implied probs per (match_id, market, outcome_name)
    accum: dict[tuple[str, str, str], list[float]] = defaultdict(list)
    for r in sharp_rows:
        key = (r["match_id"], r["market"], r["outcome_name"])
        if r["outcome_price"] > 0:
            accum[key].append(1.0 / r["outcome_price"])

    return {k: sum(v) / len(v) for k, v in accum.items()}


# ---------------------------------------------------------------------------
# Value bets
# ---------------------------------------------------------------------------


def find_value_bets(
    odds_rows: list[dict[str, Any]],
    sharp_bookmakers: list[str] | None = None,
    threshold: float = DEFAULT_EDGE_THRESHOLD,
) -> list[dict[str, Any]]:
    """Identify value bets by comparing bookmaker odds to the sharp line.

    A value bet exists when a bookmaker's implied probability is lower than
    the consensus probability minus *threshold*.

    Returns:
        List of value-bet dicts with ``match_id``, ``home_team``,
        ``away_team``, ``commence_time``, ``market``, ``outcome_name``,
        ``bookmaker``, ``outcome_price``, ``bookmaker_prob``,
        ``consensus_prob``, ``edge``.
    """
    if not odds_rows:
        return []

    consensus = get_consensus_line(odds_rows, sharp_bookmakers)
    if not consensus:
        return []

    results: list[dict[str, Any]] = []
    for row in odds_rows:
        price = row["outcome_price"]
        if price <= 0:
            continue
        key = (row["match_id"], row["market"], row["outcome_name"])
        cons_prob = consensus.get(key)
        if cons_prob is None:
            continue

        bookie_prob = 1.0 / price
        if bookie_prob < cons_prob - threshold:
            edge = round(cons_prob - bookie_prob, 4)
            results.append(
                {
                    "match_id": row["match_id"],
                    "home_team": row["home_team"],
                    "away_team": row["away_team"],
                    "commence_time": row["commence_time"],
                    "market": row["market"],
                    "outcome_name": row["outcome_name"],
                    "bookmaker": row["bookmaker"],
                    "outcome_price": price,
                    "bookmaker_prob": round(bookie_prob, 4),
                    "consensus_prob": round(cons_prob, 4),
                    "edge": edge,
                }
            )

    return results
