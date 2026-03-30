"""Pydantic schemas for request/response validation."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Match
# ---------------------------------------------------------------------------


class MatchBase(BaseModel):
    """Fields common to match creation and responses."""

    match_id: str
    sport_key: str
    league: str
    home_team: str
    away_team: str
    commence_time: datetime


class MatchResponse(MatchBase):
    """Match data returned from the API."""

    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Odds
# ---------------------------------------------------------------------------


class OddsBase(BaseModel):
    """Fields common to odds creation and responses."""

    match_id: str
    bookmaker: str
    market: str
    outcome_name: str
    outcome_price: float
    point: float | None = None


class OddsResponse(OddsBase):
    """Odds snapshot returned from the API."""

    id: int
    timestamp: datetime

    model_config = {"from_attributes": True}


class OddsWithMatch(OddsResponse):
    """Odds snapshot enriched with match metadata."""

    sport_key: str
    league: str
    home_team: str
    away_team: str
    commence_time: datetime


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------


class FeedbackCreate(BaseModel):
    """Payload for submitting new feedback."""

    category: str = Field(..., min_length=1, max_length=100)
    rating: int = Field(..., ge=1, le=5)
    message: str = Field(..., min_length=1)

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("rating must be between 1 and 5 (inclusive)")
        return v


class FeedbackResponse(BaseModel):
    """Feedback entry returned from the API."""

    id: int
    category: str
    rating: int
    message: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Matches + Odds (combined list response)
# ---------------------------------------------------------------------------


class MatchWithOddsResponse(BaseModel):
    """Match with its latest odds rows, used by GET /api/matches."""

    match_id: str
    sport_key: str
    league: str
    home_team: str
    away_team: str
    commence_time: str
    odds: list[MatchOddsItem]

    model_config = {"from_attributes": True}


class MatchOddsItem(BaseModel):
    """Single odds entry within a match response."""

    bookmaker: str
    market: str
    outcome_name: str
    outcome_price: float
    point: float | None = None
    timestamp: str


# Fix forward reference — MatchWithOddsResponse references MatchOddsItem
MatchWithOddsResponse.model_rebuild()


# ---------------------------------------------------------------------------
# Arbitrage
# ---------------------------------------------------------------------------


class ArbitrageResponse(BaseModel):
    """An arbitrage opportunity."""

    match_id: str
    home_team: str
    away_team: str
    commence_time: str
    market: str
    arb_pct: float
    best_odds: dict[str, float]


# ---------------------------------------------------------------------------
# Value Bets
# ---------------------------------------------------------------------------


class ValueBetResponse(BaseModel):
    """A value-bet opportunity."""

    match_id: str
    home_team: str
    away_team: str
    commence_time: str
    market: str
    outcome_name: str
    bookmaker: str
    outcome_price: float
    bookmaker_prob: float
    consensus_prob: float
    edge: float


# ---------------------------------------------------------------------------
# Parlay / Accumulator
# ---------------------------------------------------------------------------


class ParlayRequest(BaseModel):
    """Request body for POST /api/calculate-parlay."""

    stake: float = Field(..., ge=0, description="Amount wagered")
    odds: list[float] = Field(
        ..., min_length=1, description="Decimal odds for each leg (all > 1.0)"
    )

    @field_validator("odds")
    @classmethod
    def validate_odds(cls, v: list[float]) -> list[float]:
        for o in v:
            if o <= 1.0:
                raise ValueError(f"Each odds value must be > 1.0, got {o}")
        return v


class ParlayResponse(BaseModel):
    """Response for POST /api/calculate-parlay."""

    stake: float
    num_legs: int
    combined_odds: float
    payout: float
    profit: float
    implied_probability: float

# ---------------------------------------------------------------------------
# Line Shopper
# ---------------------------------------------------------------------------


class LineShopperBookie(BaseModel):
    bookmaker: str
    outcome_price: float
    point: float | None = None


class LineShopperResponse(BaseModel):
    """Multi-bookie representation for a single match/prop."""

    match_id: str
    market: str
    outcome_name: str
    best_price: float
    best_bookmaker: str
    bookmakers: list[LineShopperBookie]


# ---------------------------------------------------------------------------
# Smart Parlay Options
# ---------------------------------------------------------------------------


class SmartParlayLeg(BaseModel):
    """A single leg validated for contradiction & correlation grading."""

    match_id: str
    market: str
    outcome_name: str
    prop_type: str | None = None
    player_name: str | None = None


class SmartParlayRequest(BaseModel):
    """Incoming request to grade and price-shop a parlay."""

    legs: list[SmartParlayLeg] = Field(..., min_length=2)
    stake: float = Field(..., ge=0)


class ParlayContradiction(BaseModel):
    """Evaluation result detailing any conflict between two legs."""

    leg_a_outcome: str
    leg_b_outcome: str
    reason: str
    severity: str  # "high", "medium", "low"


class SmartParlayResponse(BaseModel):
    """The graded response with optimized shopping routes."""

    grade: str  # e.g., A, B, C, D, F
    score: float  # 0-100 correlation score
    contradictions: list[ParlayContradiction]
    line_shopper_best_bookie: str
    line_shopper_best_odds: float
    payout: float


# ---------------------------------------------------------------------------
# Player Prop Stats (Engine 2)
# ---------------------------------------------------------------------------


class LastGameLog(BaseModel):
    opponent: str
    date: str
    value: float
    hit: bool


class H2HStats(BaseModel):
    opponent: str
    games_played: int
    avg_value: float


class PlayerPropStats(BaseModel):
    player_name: str
    prop_type: str
    line: float
    last_5_games: list[LastGameLog]
    h2h_vs_opponent: H2HStats | None
    hit_rate_l5: float
    hit_rate_szn: float


# ---------------------------------------------------------------------------
# Contextual Edge (Engine 3)
# ---------------------------------------------------------------------------

class HistoricalMatch(BaseModel):
    """Simple record of a past encounter."""
    date: str
    home_score: int
    away_score: int
    winner: str | None


class MatchContext(BaseModel):
    """External physical factors influencing the match."""
    match_id: str
    weather: str
    weather_impact: str | None
    referee_style: str
    fatigue_warning: str | None
    team_h2h_history: list[HistoricalMatch] = []
