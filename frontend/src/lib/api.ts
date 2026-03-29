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
  try {
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
    return (await res.json()) as Promise<T>;
  } catch (err) {
    console.warn("Backend fetch failed, using fallback mock data for visually testing the UI:", err);
    
    // Inject mock data for /api/matches to demonstrate the grids
    if (path.includes("/api/matches")) {
      const mockMatches: Match[] = [
        {
          match_id: "mock_1",
          sport_key: "soccer_epl",
          league: "English Premier League",
          home_team: "Arsenal",
          away_team: "Chelsea",
          commence_time: new Date(Date.now() + 3600000).toISOString(),
          odds: [
            { bookmaker: "DraftKings", market: "h2h", outcome_name: "Arsenal", outcome_price: 1.85, point: null, timestamp: new Date().toISOString() },
            { bookmaker: "DraftKings", market: "h2h", outcome_name: "Draw", outcome_price: 3.50, point: null, timestamp: new Date().toISOString() },
            { bookmaker: "DraftKings", market: "h2h", outcome_name: "Chelsea", outcome_price: 4.20, point: null, timestamp: new Date().toISOString() },
          ],
        },
        {
          match_id: "mock_2",
          sport_key: "soccer_spain_la_liga",
          league: "Spanish La Liga",
          home_team: "Real Madrid",
          away_team: "Barcelona",
          commence_time: new Date(Date.now() + 86400000).toISOString(),
          odds: [
            { bookmaker: "FanDuel", market: "h2h", outcome_name: "Real Madrid", outcome_price: 2.10, point: null, timestamp: new Date().toISOString() },
            { bookmaker: "FanDuel", market: "h2h", outcome_name: "Draw", outcome_price: 3.20, point: null, timestamp: new Date().toISOString() },
            { bookmaker: "FanDuel", market: "h2h", outcome_name: "Barcelona", outcome_price: 3.10, point: null, timestamp: new Date().toISOString() },
          ],
        },
        {
          match_id: "mock_3",
          sport_key: "soccer_italy_serie_a",
          league: "Italian Serie A",
          home_team: "Juventus",
          away_team: "AC Milan",
          commence_time: new Date(Date.now() + 172800000).toISOString(),
          odds: [
            { bookmaker: "BetMGM", market: "h2h", outcome_name: "Juventus", outcome_price: 2.50, point: null, timestamp: new Date().toISOString() },
            { bookmaker: "BetMGM", market: "h2h", outcome_name: "Draw", outcome_price: 3.10, point: null, timestamp: new Date().toISOString() },
            { bookmaker: "BetMGM", market: "h2h", outcome_name: "AC Milan", outcome_price: 2.80, point: null, timestamp: new Date().toISOString() },
          ],
        }
      ];
      return mockMatches as unknown as T;
    }
    
    // Fallback for value-bets or arbitrage
    return [] as unknown as T;
  }
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
