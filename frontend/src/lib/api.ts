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
  contextual_adjustment?: number;
  contextual_reason?: string;
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


export interface SmartParlayLeg {
  match_id: string;
  market: string;
  outcome_name: string;
  prop_type?: string;
  player_name?: string;
}

export interface SmartParlayRequest {
  legs: SmartParlayLeg[];
  stake: number;
}

export interface ParlayContradiction {
  leg_a_outcome: string;
  leg_b_outcome: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

export interface SmartParlayResponse {
  grade: string;
  score: number;
  contradictions: ParlayContradiction[];
  line_shopper_best_bookie: string;
  line_shopper_best_odds: number;
  payout: number;
}

export interface LastGameLog {
  opponent: string;
  date: string;
  value: number;
  hit: boolean;
}

export interface H2HStats {
  opponent: string;
  games_played: number;
  avg_value: number;
}

export interface PlayerPropStats {
  player_name: string;
  prop_type: string;
  line: number;
  last_5_games: LastGameLog[];
  h2h_vs_opponent: H2HStats | null;
  hit_rate_l5: number;
  hit_rate_szn: number;
}

export interface HistoricalMatch {
  date: string;
  home_score: number;
  away_score: number;
  winner: string | null;
}

export interface MatchContext {
  match_id: string;
  weather: string;
  weather_impact: string | null;
  referee_style: string;
  fatigue_warning: string | null;
  team_h2h_history: HistoricalMatch[];
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
  return (await res.json()) as Promise<T>;
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



export function analyzeSmartParlay(
  legs: SmartParlayLeg[],
  stake: number
): Promise<SmartParlayResponse> {
  return apiFetch<SmartParlayResponse>("/api/smart-parlay/analyze", {
    method: "POST",
    body: JSON.stringify({ legs, stake }),
  });
}

export function fetchPlayerProps(
  playerName: string,
  propType: string = "shots_on_target",
  line: number = 1.5,
  opponent?: string
): Promise<PlayerPropStats> {
  const qs = new URLSearchParams({ prop_type: propType, line: line.toString() });
  if (opponent) qs.append("opponent", opponent);
  return apiFetch<PlayerPropStats>(`/api/player/${encodeURIComponent(playerName)}/props?${qs.toString()}`);
}

export function fetchMatchContext(
  matchId: string,
  homeTeam: string,
  awayTeam: string
): Promise<MatchContext> {
  const qs = new URLSearchParams({ home_team: homeTeam, away_team: awayTeam });
  return apiFetch<MatchContext>(`/api/matches/${matchId}/context?${qs.toString()}`);
}
