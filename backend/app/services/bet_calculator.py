"""Betting calculations: parlay/accumulator, payout, Kelly, dutching.

Extracted from ``src/bet_calculator.py`` — pure functions, no external deps.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from itertools import combinations

# ---------------------------------------------------------------------------
# Odds conversion
# ---------------------------------------------------------------------------


def decimal_to_fractional(decimal_odds: float) -> tuple[int, int]:
    """Convert decimal odds to fractional ``(numerator, denominator)``."""
    if decimal_odds <= 1.0:
        raise ValueError(f"decimal_odds must be > 1, got {decimal_odds}")
    numerator = round((decimal_odds - 1) * 100)
    denominator = 100
    gcd = math.gcd(numerator, denominator)
    return numerator // gcd, denominator // gcd


def decimal_to_american(decimal_odds: float) -> int:
    """Convert decimal odds to American (moneyline) odds."""
    if decimal_odds <= 1.0:
        raise ValueError(f"decimal_odds must be > 1, got {decimal_odds}")
    if decimal_odds >= 2.0:
        return round((decimal_odds - 1) * 100)
    return round(-100 / (decimal_odds - 1))


def american_to_decimal(american_odds: int) -> float:
    """Convert American odds to decimal."""
    if american_odds == 0:
        raise ValueError("american_odds cannot be zero.")
    if american_odds > 0:
        return round(american_odds / 100 + 1, 4)
    return round(100 / abs(american_odds) + 1, 4)


def fractional_to_decimal(numerator: int, denominator: int) -> float:
    """Convert fractional odds to decimal."""
    if denominator == 0:
        raise ValueError("denominator cannot be zero.")
    if numerator < 0 or denominator < 0:
        raise ValueError("numerator and denominator must be non-negative.")
    return round(numerator / denominator + 1, 4)


# ---------------------------------------------------------------------------
# Payout calculations
# ---------------------------------------------------------------------------


def calculate_payout(stake: float, decimal_odds: float) -> dict[str, float]:
    """Calculate payout and profit for a single bet."""
    if stake < 0:
        raise ValueError(f"stake must be non-negative, got {stake}")
    if decimal_odds <= 0:
        raise ValueError(f"decimal_odds must be positive, got {decimal_odds}")
    payout = round(stake * decimal_odds, 2)
    profit = round(payout - stake, 2)
    implied_prob = round(1.0 / decimal_odds, 4)
    return {
        "stake": stake,
        "decimal_odds": decimal_odds,
        "payout": payout,
        "profit": profit,
        "implied_probability": implied_prob,
    }


def calculate_accumulator(
    stake: float, odds_list: Sequence[float]
) -> dict[str, float | int]:
    """Calculate combined odds and payout for a parlay / accumulator.

    Args:
        stake: Amount wagered on the accumulator.
        odds_list: Decimal odds for each leg.

    Returns:
        Dict with ``stake``, ``num_legs``, ``combined_odds``, ``payout``,
        ``profit``, ``implied_probability``.
    """
    if stake < 0:
        raise ValueError(f"stake must be non-negative, got {stake}")
    if not odds_list:
        raise ValueError("odds_list must not be empty.")
    combined = 1.0
    for o in odds_list:
        if o <= 1.0:
            raise ValueError(f"All decimal odds must be > 1, got {o}")
        combined *= o
    combined = round(combined, 4)
    payout = round(stake * combined, 2)
    profit = round(payout - stake, 2)
    implied_prob = round(1.0 / combined, 6) if combined > 0 else 0.0
    return {
        "stake": stake,
        "num_legs": len(odds_list),
        "combined_odds": combined,
        "payout": payout,
        "profit": profit,
        "implied_probability": implied_prob,
    }


# ---------------------------------------------------------------------------
# Kelly Criterion
# ---------------------------------------------------------------------------


def kelly_criterion(
    decimal_odds: float,
    win_probability: float,
    bankroll: float = 1.0,
    fractional_kelly: float = 1.0,
) -> dict[str, float]:
    """Calculate the Kelly Criterion optimal stake.

    ``f* = (p * (odds - 1) - (1 - p)) / (odds - 1)``
    """
    if decimal_odds <= 1.0:
        raise ValueError(f"decimal_odds must be > 1, got {decimal_odds}")
    if not 0 < win_probability < 1:
        raise ValueError(f"win_probability must be in (0, 1), got {win_probability}")
    if bankroll <= 0:
        raise ValueError(f"bankroll must be positive, got {bankroll}")
    if not 0 < fractional_kelly <= 1:
        raise ValueError(f"fractional_kelly must be in (0, 1], got {fractional_kelly}")

    b = decimal_odds - 1
    q = 1 - win_probability
    kelly_f = max((win_probability * b - q) / b, 0.0)

    edge = round(win_probability * decimal_odds - 1, 4)
    adjusted = round(kelly_f * fractional_kelly, 4)
    recommended = round(adjusted * bankroll, 2)

    return {
        "decimal_odds": decimal_odds,
        "win_probability": win_probability,
        "edge": edge,
        "kelly_fraction": adjusted,
        "recommended_stake": recommended,
        "bankroll": bankroll,
    }


# ---------------------------------------------------------------------------
# Dutching
# ---------------------------------------------------------------------------


def dutching_calculator(
    total_stake: float, odds_list: Sequence[float]
) -> dict[str, object]:
    """Distribute stake across selections to equalise profit."""
    if total_stake <= 0:
        raise ValueError(f"total_stake must be positive, got {total_stake}")
    if not odds_list:
        raise ValueError("odds_list must not be empty.")
    inv_sum = 0.0
    for o in odds_list:
        if o <= 0:
            raise ValueError(f"All odds must be positive, got {o}")
        inv_sum += 1.0 / o
    stakes = [round(total_stake * (1.0 / o) / inv_sum, 2) for o in odds_list]
    equal_payout = round(total_stake / inv_sum, 2)
    profit = round(equal_payout - total_stake, 2)
    margin = round(inv_sum - 1.0, 4)
    return {
        "total_stake": total_stake,
        "stakes": stakes,
        "equal_payout": equal_payout,
        "profit": profit,
        "margin": margin,
    }


# ---------------------------------------------------------------------------
# Round-robin parlays
# ---------------------------------------------------------------------------


def calculate_round_robin(
    stake_per_combo: float,
    odds_list: Sequence[float],
    combo_size: int,
) -> dict[str, object]:
    """Calculate all round-robin parlays of a given combination size."""
    if stake_per_combo < 0:
        raise ValueError(f"stake_per_combo must be non-negative, got {stake_per_combo}")
    if not odds_list:
        raise ValueError("odds_list must not be empty.")
    if combo_size < 2:
        raise ValueError(f"combo_size must be >= 2, got {combo_size}")
    if combo_size > len(odds_list):
        raise ValueError(
            f"combo_size ({combo_size}) cannot exceed number of "
            f"selections ({len(odds_list)})."
        )
    for o in odds_list:
        if o <= 1.0:
            raise ValueError(f"All decimal odds must be > 1, got {o}")

    combos: list[dict] = []
    for indices in combinations(range(len(odds_list)), combo_size):
        combined = 1.0
        for i in indices:
            combined *= odds_list[i]
        combined = round(combined, 4)
        payout = round(stake_per_combo * combined, 2)
        combos.append(
            {"legs": list(indices), "combined_odds": combined, "payout": payout}
        )

    num_combos = len(combos)
    total_staked = round(stake_per_combo * num_combos, 2)
    total_payout = round(sum(c["payout"] for c in combos), 2)
    total_profit = round(total_payout - total_staked, 2)

    return {
        "stake_per_combo": stake_per_combo,
        "num_combos": num_combos,
        "total_staked": total_staked,
        "combos": combos,
        "total_payout_all_win": total_payout,
        "total_profit_all_win": total_profit,
    }
