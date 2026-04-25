"""Service for grading and validating multi-leg parlay correlations."""

from __future__ import annotations

from app.schemas import (
    ParlayContradiction,
    SmartParlayLeg,
    SmartParlayRequest,
    SmartParlayResponse,
)


def _check_contradictions(legs: list[SmartParlayLeg]) -> list[ParlayContradiction]:
    """Scan the legs array for mutually exclusive or highly negatively correlated outcomes."""
    contradictions = []

    # Map legs by match_id for isolated game script analysis
    match_groups: dict[str, list[SmartParlayLeg]] = {}
    for leg in legs:
        match_groups.setdefault(leg.match_id, []).append(leg)

    for _, group in match_groups.items():
        if len(group) < 2:
            continue

        # Look for the exact contradiction described in requirements:
        # e.g., Game Total Under 1.5 AND Player to Score Anytime
        has_low_under = False
        under_leg = None
        player_scorers = []
        win_outcomes = []

        # Tracking player-specific stats for POSITIVE correlation scoring
        player_stats: dict[str, list[SmartParlayLeg]] = {}

        for leg in group:
            market_lower = leg.market.lower()
            outcome_lower = leg.outcome_name.lower()

            # 1. Total Under vs Scorer check
            if market_lower in ("totals", "over/under", "total goals"):
                if "under" in outcome_lower and ("1.5" in outcome_lower or "2.5" in outcome_lower):
                    has_low_under = True
                    under_leg = leg

            # 2. Player Prop grouping
            if leg.player_name:
                player_stats.setdefault(leg.player_name, []).append(leg)
                if leg.prop_type == "player_goals" or "score" in market_lower:
                    player_scorers.append(leg)

            # 3. Opposing Winner check
            if market_lower in ("h2h", "moneyline", "match result"):
                win_outcomes.append(leg)

        # Apply Contradiction Logic
        if has_low_under and player_scorers and under_leg:
            for scorer in player_scorers:
                contradictions.append(
                    ParlayContradiction(
                        leg_a_outcome=under_leg.outcome_name,
                        leg_b_outcome=scorer.outcome_name,
                        reason=f"Game Under ({under_leg.outcome_name}) contradicts an Anytime Goalscorer prop.",
                        severity="high",
                    )
                )

        if len(win_outcomes) >= 2:
            # Check if they are opposing each other
            winners = [w.outcome_name for w in win_outcomes if w.outcome_name != "Draw"]
            if len(set(winners)) > 1:
                contradictions.append(
                    ParlayContradiction(
                        leg_a_outcome=win_outcomes[0].outcome_name,
                        leg_b_outcome=win_outcomes[1].outcome_name,
                        reason="Mutually exclusive win conditions detected within the same match.",
                        severity="high"
                    )
                )

    return contradictions


def _calculate_score(legs: list[SmartParlayLeg], contradictions: list[ParlayContradiction]) -> float:
    """Calculate an arbitrary 0-100 correlation score for the slip."""
    base_score = 100.0
    num_legs = len(legs)

    # 1. Complexity Penalty
    if num_legs > 8:
        base_score -= (num_legs - 8) * 5
    elif num_legs > 4:
        base_score -= (num_legs - 4) * 2

    # 2. Contradiction Penalty (Heavy)
    for c in contradictions:
        if c.severity == "high":
            base_score -= 50
        elif c.severity == "medium":
            base_score -= 25
        else:
            base_score -= 10

    # 3. Positive Correlation Bonus (The "Smart" part)
    # If same player has multiple positive stats (Shots + Goals), reward it.
    player_map: dict[str, int] = {}
    for leg in legs:
        if leg.player_name:
            player_map[leg.player_name] = player_map.get(leg.player_name, 0) + 1

    for _, count in player_map.items():
        if count >= 2:
            # Reward correlation
            base_score += 10

    return max(0.0, min(100.0, base_score))


def _assign_grade(score: float) -> str:
    """Map a numeric score to an A-F letter grade."""
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 40: return "D"
    return "F"


def analyze_smart_parlay(request: SmartParlayRequest) -> SmartParlayResponse:
    """
    Main entry point for Engine 1.2:
    Takes a SmartParlayRequest, evaluates correlation safety, and outputs
    a graded response with line-shopper aggregations. 
    """
    contradictions = _check_contradictions(request.legs)
    score = _calculate_score(request.legs, contradictions)
    grade = _assign_grade(score)

    # In a fully connected environment, these would be derived from the database
    # aggregated odds. For Engine 1.2 structure, we calculate mock payouts.
    # Assuming standard -110 juice (1.9x) per leg for the dummy payout.
    combined_mult = 1.0
    for _ in request.legs:
        combined_mult *= 1.9

    return SmartParlayResponse(
        grade=grade,
        score=score,
        contradictions=contradictions,
        line_shopper_best_bookie="DraftKings" if grade in ("A+", "A", "B") else "FanDuel",
        line_shopper_best_odds=round(combined_mult, 2),
        payout=round(request.stake * combined_mult, 2),
    )
