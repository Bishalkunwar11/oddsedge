"""Service for generating contextual and tactical match data (Weather, Form, Referees, Fatigue)."""

import random

from app.schemas import MatchContext

_WEATHERS = [
    ("Clear", None),
    ("Overcast", None),
    ("Heavy Rain", "Under 2.5 Edge"),
    ("High Winds", "Under 2.5 Edge"),
    ("Snow", "Under 1.5 Edge")
]

_REFEREES = [
    "Strict Ref (5.2 YC/G)",
    "Strict Ref (6.1 YC/G)",
    "Lenient Ref (2.1 YC/G)",
    "Average Ref (3.8 YC/G)"
]

def get_match_context(match_id: str, home_team: str, away_team: str) -> MatchContext:
    """
    Ingest or simulate external physical factors for Engine 3.
    """
    # Deterministic randomness based on match_id
    seed_hash = sum(ord(c) for c in match_id)
    random.seed(seed_hash)

    weather, weather_impact = random.choice(_WEATHERS)
    referee_style = random.choice(_REFEREES)

    # Randomly assign fatigue
    fatigue_warning = None
    fatigue_chance = random.random()
    if fatigue_chance > 0.8:
        fatigue_warning = f"{home_team} played 72h ago (Rest Disadvantage)"
    elif fatigue_chance < 0.2:
        fatigue_warning = f"{away_team} played 48h ago (Rest Disadvantage)"

    # Team History Mock
    from datetime import datetime, timedelta
    team_h2h_history = []
    now = datetime.utcnow()
    for i in range(3):
        h_score = random.randint(0, 3)
        a_score = random.randint(0, 3)
        winner = home_team if h_score > a_score else (away_team if a_score > h_score else "Draw")
        team_h2h_history.append({
            "date": (now - timedelta(days=(i+1)*120)).strftime("%Y-%m-%d"),
            "home_score": h_score,
            "away_score": a_score,
            "winner": winner
        })

    # reset global seed just in case
    random.seed()

    return MatchContext(
        match_id=match_id,
        weather=weather,
        weather_impact=weather_impact,
        referee_style=referee_style,
        fatigue_warning=fatigue_warning,
        team_h2h_history=team_h2h_history
    )
