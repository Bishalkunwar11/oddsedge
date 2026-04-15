"""Calculator router — POST /api/calculate-parlay."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import ParlayRequest, ParlayResponse, SmartParlayRequest, SmartParlayResponse
from app.services.bet_calculator import calculate_accumulator
from app.services.smart_parlay import analyze_smart_parlay

router = APIRouter(prefix="/api", tags=["calculator"])


@router.post("/calculate-parlay", response_model=ParlayResponse)
async def calculate_parlay(body: ParlayRequest) -> dict:
    """Calculate the combined odds, payout, and profit for a parlay bet."""
    result = calculate_accumulator(stake=body.stake, odds_list=body.odds)
    return result


@router.post("/smart-parlay/analyze", response_model=SmartParlayResponse)
async def smart_parlay_analyze(body: SmartParlayRequest) -> dict:
    """Analyze a multi-leg parlay for contradictions and correlations, assigning a grade."""
    return analyze_smart_parlay(body)
