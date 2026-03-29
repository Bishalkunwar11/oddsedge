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
 * Sportsbook-style match card showing teams, kickoff, league, and
 * primary 1×2 odds buttons. Clicking an odds button toggles a bet-slip
 * selection.
 */
export default function MatchCard({ match }: MatchCardProps) {
  const { toggleSelection, isSelected } = useBetSlipStore();

  // Extract h2h odds — group by outcome_name, pick best price per outcome
  const h2hOdds = match.odds.filter((o) => o.market === "h2h");
  const bestByOutcome = getBestPrices(h2hOdds);

  // Build the 1 / X / 2 order
  const homeOdds = bestByOutcome.get(match.home_team);
  const drawOdds = bestByOutcome.get("Draw");
  const awayOdds = bestByOutcome.get(match.away_team);

  const buttons: { label: string; price: number; bookmaker: string; outcomeName: string }[] = [];
  if (homeOdds) buttons.push({ label: "1", ...homeOdds, outcomeName: match.home_team });
  if (drawOdds) buttons.push({ label: "X", ...drawOdds, outcomeName: "Draw" });
  if (awayOdds) buttons.push({ label: "2", ...awayOdds, outcomeName: match.away_team });

  // Format kickoff
  const kickoff = formatKickoff(match.commence_time);

  // League display
  const leagueShort = match.league.replace(/^(English |Spanish |Italian |German |French )/, "");

  const handleToggle = (btn: typeof buttons[number]) => {
    const sel: BetSelection = {
      id: makeSelectionId(match.match_id, "h2h", btn.outcomeName),
      matchId: match.match_id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      league: match.league,
      market: "h2h",
      outcomeName: btn.outcomeName,
      outcomePrice: btn.price,
      bookmaker: btn.bookmaker,
    };
    toggleSelection(sel);
  };

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl hover:border-border-mid transition-colors group">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-dim uppercase tracking-wider">
          <span>⚽</span>
          {leagueShort}
        </span>
        <span className="text-[11px] text-text-dim tabular-nums">
          🕐 {kickoff}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between px-5 pb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-text-primary truncate">
            {match.home_team}
          </p>
          <p className="text-[14px] font-semibold text-text-primary truncate mt-0.5">
            {match.away_team}
          </p>
        </div>

        {/* Odds buttons */}
        <div className="flex gap-2 ml-4 shrink-0">
          {buttons.map((btn) => {
            const selId = makeSelectionId(match.match_id, "h2h", btn.outcomeName);
            return (
              <OddsButton
                key={btn.label}
                label={btn.label}
                price={btn.price}
                isSelected={isSelected(selId)}
                onClick={() => handleToggle(btn)}
              />
            );
          })}
          {buttons.length === 0 && (
            <span className="text-[12px] text-text-dim italic">
              No odds
            </span>
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
