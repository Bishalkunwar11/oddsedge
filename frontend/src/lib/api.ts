/**
 * API client for the FastAPI backend.
 *
 * Points at the backend dev server (http://localhost:8000) by default.
 * Override via NEXT_PUBLIC_API_URL environment variable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────

export interface MatchOdds {
  bookmaker: string;
  market: string;
  outcome_name: string;
  outcome_price: number;
  point: number | null;
  timestamp: string;
}

export interface Match {
  match_id: string;
  sport_key: string;
  league: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  odds: MatchOdds[];
}

export interface ValueBet {
  match_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  market: string;
  outcome_name: string;
  bookmaker: string;
  outcome_price: number;
  bookmaker_prob: number;
  consensus_prob: number;
  edge: number;
}

export interface ArbitrageOpp {
  match_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  market: string;
  arb_pct: number;
  best_odds: Record<string, number>;
}

export interface ParlayResult {
  stake: number;
  num_legs: number;
  combined_odds: number;
  payout: number;
  profit: number;
  implied_probability: number;
}

// ─── Fetch helpers ───────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Endpoints ───────────────────────────────────────────────────────

export function fetchMatches(sportKeys?: string[]): Promise<Match[]> {
  const params = new URLSearchParams();
  sportKeys?.forEach((k) => params.append("sport_key", k));
  const qs = params.toString();
  return apiFetch<Match[]>(`/api/matches${qs ? `?${qs}` : ""}`);
}

export function fetchValueBets(
  sportKeys?: string[],
  threshold?: number
): Promise<ValueBet[]> {
  const params = new URLSearchParams();
  sportKeys?.forEach((k) => params.append("sport_key", k));
  if (threshold !== undefined) params.set("threshold", String(threshold));
  const qs = params.toString();
  return apiFetch<ValueBet[]>(`/api/value-bets${qs ? `?${qs}` : ""}`);
}

export function fetchArbitrage(sportKeys?: string[]): Promise<ArbitrageOpp[]> {
  const params = new URLSearchParams();
  sportKeys?.forEach((k) => params.append("sport_key", k));
  const qs = params.toString();
  return apiFetch<ArbitrageOpp[]>(`/api/arbitrage${qs ? `?${qs}` : ""}`);
}

export function calculateParlay(
  stake: number,
  odds: number[]
): Promise<ParlayResult> {
  return apiFetch<ParlayResult>("/api/calculate-parlay", {
    method: "POST",
    body: JSON.stringify({ stake, odds }),
  });
}
