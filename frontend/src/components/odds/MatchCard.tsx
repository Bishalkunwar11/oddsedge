"use client";

import { useState, useEffect } from "react";
import type { Match, MatchOdds } from "@/lib/api";
import {
  useBetSlipStore,
  makeSelectionId,
  type BetSelection,
} from "@/store/betSlipStore";
import { motion, AnimatePresence } from "framer-motion";
import OddsButton from "./OddsButton";

interface MatchCardProps {
  match: Match;
}

/**
 * High-Fidelity DraftKings-style match card using CSS Grid and Antigravity UX Motion.
 * Displays Away Team, Draw, and Home Team across 3 key markets: Spread, Total, and Moneyline.
 * Spread and Total are mock data placeholders until the proxy bridges them.
 */
export default function MatchCard({ match }: MatchCardProps) {
  const { toggleSelection, isSelected } = useBetSlipStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [propStats, setPropStats] = useState<any>(null);
  const [loadingProp, setLoadingProp] = useState(false);

  // Fetch mock stats when opened
  useEffect(() => {
    if (isDrawerOpen && !propStats && !loadingProp) {
        setLoadingProp(true);
        // Map to mock python fastAPI hitting loop
        const pName = encodeURIComponent(match.home_team + " Striker");
        const opp = encodeURIComponent(match.away_team);
        fetch(`http://127.0.0.1:8000/api/player/${pName}/props?line=1.5&opponent=${opp}`)
          .then((r) => r.json())
          .then((data) => {
             setPropStats(data);
             setLoadingProp(false);
          })
          .catch(() => setLoadingProp(false));
    }
  }, [isDrawerOpen, propStats, loadingProp, match.home_team, match.away_team]);

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
    <motion.div
      whileHover={{ y: -4, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-card border border-border/60 hover:border-primary/50 rounded-xl transition-colors duration-300 group p-4 sm:p-5 hover:shadow-[0_15px_30px_-5px_rgba(30,58,138,0.3)] relative overflow-hidden"
    >
      {/* Edge gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider relative z-10">
        <span className="flex items-center gap-1.5">
          <span>⚽</span> {leagueShort}
        </span>
        <span className="tabular-nums font-mono">🕐 {kickoff}</span>
      </div>

      {/* Engine 3.2 Tactical Context Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3 relative z-10">
        {(() => {
          // Deterministically map context off the match_id
          const seed = match.match_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
          
          const weathers = [
            { id: 0, text: "Clear", icon: "☀️", cls: "bg-card text-muted-foreground border border-border" },
            { id: 1, text: "Heavy Rain (Under 2.5 Edge)", icon: "🌧️", cls: "bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold" },
            { id: 2, text: "Snow (Under 1.5 Edge)", icon: "❄️", cls: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold" }
          ];
          const refs = [
            { id: 0, text: "Average Ref (3.8 YC/G)", icon: "⚖️", cls: "bg-card text-muted-foreground border border-border" },
            { id: 1, text: "Strict Ref (5.2 YC/G)", icon: "🟨", cls: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 font-bold" }
          ];
          
          const w = weathers[seed % 3];
          const r = refs[seed % 2];
          const isFatigued = (seed % 10) > 7;

          return (
            <>
              {w.id !== 0 && (
                <div className={`px-2 py-0.5 rounded flex items-center gap-1 text-[10px] tracking-wide ${w.cls}`}>
                  <span>{w.icon}</span> {w.text}
                </div>
              )}
              {r.id !== 0 && (
                <div className={`px-2 py-0.5 rounded flex items-center gap-1 text-[10px] tracking-wide ${r.cls}`}>
                  <span>{r.icon}</span> {r.text}
                </div>
              )}
              {isFatigued && (
                <div className="px-2 py-0.5 rounded flex items-center gap-1 text-[10px] tracking-wide bg-destructive/10 text-destructive border border-destructive/30 font-bold">
                  <span>⚠️</span> {match.away_team} Rest Disadvantage
                </div>
              )}
            </>
          );
        })()}
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

      {/* Engine 2.2 Featured Prop Trigger */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="w-full flex items-center justify-between group/prop transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[14px]">🔥</span>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold text-foreground">Featured Prop: {match.home_team} Striker</span>
              <span className="text-[10px] text-muted-foreground">O 1.5 Shots on Target</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded bg-chart-2/10 text-chart-2 text-[10px] font-bold">+140</div>
            <motion.svg 
              animate={{ rotate: isDrawerOpen ? 180 : 0 }} 
              className="w-4 h-4 text-muted-foreground group-hover/prop:text-primary transition-colors" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </button>

        <AnimatePresence>
          {isDrawerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-1">
                {loadingProp || !propStats ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-6 bg-input rounded w-full"></div>
                    <div className="h-10 bg-input rounded w-full mt-2"></div>
                  </div>
                ) : (
                  <div className="bg-input/30 rounded-lg p-3 border border-border">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Hit Rate (SZN)</div>
                        <div className="text-[14px] font-black text-chart-2 tabular-nums">{propStats.hit_rate_szn}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">H2H vs {match.away_team}</div>
                        <div className="text-[12px] font-semibold text-foreground">{propStats.h2h_vs_opponent?.avg_value || "-"} avg / gm</div>
                      </div>
                    </div>

                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Last 5 Matches</div>
                    <div className="flex gap-1" title="Green = Hit, Red = Miss">
                      {propStats.last_5_games.map((game: any, i: number) => (
                        <div 
                           key={i} 
                           className={`flex-1 h-6 rounded flex items-center justify-center text-[10px] font-bold ${game.hit ? 'bg-chart-2/20 text-chart-2 border border-chart-2/30' : 'bg-destructive/10 text-destructive/70 border border-destructive/20'}`}
                           title={`vs ${game.opponent}: ${game.value} (Line: ${propStats.line})`}
                        >
                          {game.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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

