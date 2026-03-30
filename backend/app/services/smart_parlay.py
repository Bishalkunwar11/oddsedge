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

    for match_id, group in match_groups.items():
        if len(group) < 2:
            continue

        # Look for the exact contradiction described in requirements:
        # e.g., Game Total Under 1.5 AND Player to Score Anytime
        has_low_under = False
        under_leg = None
        player_scorers = []

        for leg in group:
            if leg.market.lower() in ("totals", "over/under"):
                if "under" in leg.outcome_name.lower() and ("1.5" in leg.outcome_name or "2.5" in leg.outcome_name):
                    has_low_under = True
                    under_leg = leg
            elif leg.prop_type == "player_goals" or "score" in leg.market.lower():
                # A player prop indicating scoring
                player_scorers.append(leg)

        if has_low_under and player_scorers and under_leg:
            for scorer in player_scorers:
                contradictions.append(
                    ParlayContradiction(
                        leg_a_outcome=under_leg.outcome_name,
                        leg_b_outcome=scorer.outcome_name,
                        reason="A low Under (1.5 or 2.5) contradicts taking an anytime goalscorer prop.",
                        severity="high",
                    )
                )

    return contradictions


def _calculate_score(num_legs: int, contradictions: list[ParlayContradiction]) -> float:
    """Calculate an arbitrary 0-100 correlation score for the slip."""
    base_score = 100.0

    # Subtract for overextending
    if num_legs > 8:
        base_score -= (num_legs - 8) * 5

    # Subtract heavily for contradictions
    for c in contradictions:
        if c.severity == "high":
            base_score -= 40
        elif c.severity == "medium":
            base_score -= 20
        else:
            base_score -= 10

    return max(0.0, min(100.0, base_score))


def _assign_grade(score: float) -> str:
    """Map a numeric score to an A-F letter grade."""
    if score >= 90:
        return "A+"
    elif score >= 80:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 50:
        return "C"
    elif score >= 30:
        return "D"
    return "F"


def analyze_smart_parlay(request: SmartParlayRequest) -> SmartParlayResponse:
    """
    Main entry point for Engine 1.2:
    Takes a SmartParlayRequest, evaluates correlation safety, and outputs
    a graded response with line-shopper aggregations. 
    """
    contradictions = _check_contradictions(request.legs)
    score = _calculate_score(len(request.legs), contradictions)
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
