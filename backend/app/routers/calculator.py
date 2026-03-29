"""Calculator router — POST /api/calculate-parlay."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import ParlayRequest, ParlayResponse
from app.services.bet_calculator import calculate_accumulator

router = APIRouter(prefix="/api", tags=["calculator"])


@router.post("/calculate-parlay", response_model=ParlayResponse)
async def calculate_parlay(body: ParlayRequest) -> dict:
    """Calculate the combined odds, payout, and profit for a parlay bet.

    Accepts a stake and an array of decimal odds (one per leg) and returns
    the accumulator result.
    """
    result = calculate_accumulator(stake=body.stake, odds_list=body.odds)
    return result
