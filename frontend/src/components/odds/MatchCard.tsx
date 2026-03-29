"use client";

import type { Match, MatchOdds } from "@/lib/api";
import {
  useBetSlipStore,
  makeSelectionId,
  type BetSelection,
} from "@/store/betSlipStore";
import OddsButton from "./OddsButton";

interface MatchCardProps {
  match: Match;
}

/**
 * High-Fidelity DraftKings-style match card using CSS Grid.
 * Displays Away Team, Draw, and Home Team across 3 key markets: Spread, Total, and Moneyline.
 * Spread and Total are mock data placeholders until the proxy bridges them.
 */
export default function MatchCard({ match }: MatchCardProps) {
  const { toggleSelection, isSelected } = useBetSlipStore();

  // Extract h2h odds — group by outcome_name, pick best price per outcome
  const h2hOdds = match.odds.filter((o) => o.market === "h2h");
  const bestByOutcome = getBestPrices(h2hOdds);

  // Build the Away / Draw / Home order
  const awayOdds = bestByOutcome.get(match.away_team);
  const drawOdds = bestByOutcome.get("Draw");
  const homeOdds = bestByOutcome.get(match.home_team);

  // Format kickoff
  const kickoff = formatKickoff(match.commence_time);

  // League display
  const leagueShort = match.league.replace(/^(English |Spanish |Italian |German |French )/, "");

  const handleToggle = (outcomeName: string, price: number, bookmaker: string, market: string = "h2h") => {
    const sel: BetSelection = {
      id: makeSelectionId(match.match_id, market, outcomeName),
      matchId: match.match_id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      league: match.league,
      market,
      outcomeName,
      outcomePrice: price,
      bookmaker,
    };
    toggleSelection(sel);
  };

  // Check selection
  const isSel = (market: string, outcome: string) =>
    isSelected(makeSelectionId(match.match_id, market, outcome));

  return (
    <div className="bg-card border border-border rounded-xl hover:border-border/80 transition-colors group p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span>⚽</span> {leagueShort}
        </span>
        <span className="tabular-nums font-mono">🕐 {kickoff}</span>
      </div>

      {/* 
        DraftKings Style Grid: 
        Mobile: Stack columns or allow horizontal scrolling. 
        Desktop: 4 columns (Team Column + 3 Odds Columns).
      */}
      <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(72px,1fr))] sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(80px,1fr))] gap-x-2 gap-y-1.5 items-center">
        {/* Row 1: Headers */}
        <div className="hidden sm:block text-[10px] uppercase font-semibold text-transparent select-none">
          Teams
        </div>
        <div className="text-[10px] text-center font-semibold text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2 ml-auto w-full max-w-[100px]">
          Spread
        </div>
        <div className="text-[10px] text-center font-semibold text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2 ml-auto w-full max-w-[100px]">
          Total
        </div>
        <div className="text-[10px] text-center font-semibold text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2 ml-auto w-full max-w-[100px]">
          Moneyline
        </div>

        {/* Row 2: Away Team */}
        <div className="flex flex-col justify-center min-h-[44px]">
          <p className="text-[13px] sm:text-[14px] font-bold text-foreground truncate">
            {match.away_team}
          </p>
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {/* Mock Spread */}
          <OddsButton
            label="+1.5"
            price={1.85}
            isSelected={isSel("spread", `${match.away_team} +1.5`)}
            onClick={() => handleToggle(`${match.away_team} +1.5`, 1.85, "DraftKings", "spread")}
          />
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {/* Mock Total Over */}
          <OddsButton
            label="O 2.5"
            price={1.9}
            isSelected={isSel("total", "Over 2.5")}
            onClick={() => handleToggle("Over 2.5", 1.9, "DraftKings", "total")}
          />
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {awayOdds ? (
            <OddsButton
              price={awayOdds.price}
              isSelected={isSel("h2h", match.away_team)}
              onClick={() => handleToggle(match.away_team, awayOdds.price, awayOdds.bookmaker)}
            />
          ) : (
            <div className="h-[44px] flex items-center justify-center border border-transparent">-</div>
          )}
        </div>

        {/* Row 3: Draw (Only applicable in soccer H2H) */}
        <div className="flex flex-col justify-center min-h-[44px]">
          <p className="text-[13px] sm:text-[14px] font-semibold text-muted-foreground truncate">
            Draw
          </p>
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          <div className="h-[44px] flex items-center justify-center border border-transparent text-muted-foreground/30">-</div>
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          <div className="h-[44px] flex items-center justify-center border border-transparent text-muted-foreground/30">-</div>
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {drawOdds ? (
            <OddsButton
              price={drawOdds.price}
              isSelected={isSel("h2h", "Draw")}
              isSuspended={true} // FORCED SUSPENDED FOR PHASE 4 UI TESTING
              onClick={() => handleToggle("Draw", drawOdds.price, drawOdds.bookmaker)}
            />
          ) : (
            <div className="h-[44px] flex items-center justify-center border border-transparent">-</div>
          )}
        </div>

        {/* Row 4: Home Team */}
        <div className="flex flex-col justify-center min-h-[44px]">
          <p className="text-[13px] sm:text-[14px] font-bold text-foreground truncate">
            {match.home_team}
          </p>
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {/* Mock Spread */}
          <OddsButton
            label="-1.5"
            price={1.95}
            isSelected={isSel("spread", `${match.home_team} -1.5`)}
            onClick={() => handleToggle(`${match.home_team} -1.5`, 1.95, "DraftKings", "spread")}
          />
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {/* Mock Total Under */}
          <OddsButton
            label="U 2.5"
            price={1.85}
            isSelected={isSel("total", "Under 2.5")}
            onClick={() => handleToggle("Under 2.5", 1.85, "DraftKings", "total")}
          />
        </div>
        <div className="ml-auto w-full max-w-[100px]">
          {homeOdds ? (
            <OddsButton
              price={homeOdds.price}
              isSelected={isSel("h2h", match.home_team)}
              onClick={() => handleToggle(match.home_team, homeOdds.price, homeOdds.bookmaker)}
            />
          ) : (
            <div className="h-[44px] flex items-center justify-center border border-transparent">-</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getBestPrices(
  odds: MatchOdds[]
): Map<string, { price: number; bookmaker: string }> {
  const map = new Map<string, { price: number; bookmaker: string }>();
  for (const o of odds) {
    const existing = map.get(o.outcome_name);
    if (!existing || o.outcome_price > existing.price) {
      map.set(o.outcome_name, {
        price: o.outcome_price,
        bookmaker: o.bookmaker,
      });
    }
  }
  return map;
}

function formatKickoff(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

