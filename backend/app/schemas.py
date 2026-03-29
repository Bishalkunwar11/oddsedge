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
