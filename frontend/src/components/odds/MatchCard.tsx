"use client";

import { useState, useEffect } from "react";
import type { Match, MatchOdds, PlayerPropStats, MatchContext } from "@/lib/api";
import { fetchPlayerProps, fetchMatchContext } from "@/lib/api";
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
  const [propStats, setPropStats] = useState<PlayerPropStats | null>(null);
  const [matchContext, setMatchContext] = useState<MatchContext | null>(null);
  const [loadingProp, setLoadingProp] = useState(false);

  // Fetch mock stats when opened
  useEffect(() => {
    if (isDrawerOpen && (!propStats || !matchContext) && !loadingProp) {
        setLoadingProp(true);
        const pName = encodeURIComponent(match.home_team + " Striker");
        const opp = encodeURIComponent(match.away_team);
        const mid = match.match_id;

        // Fetch Both: Player Props & Match Context
        // Fetch Both: Player Props & Match Context using safe wrappers
        Promise.all([
          fetchPlayerProps(pName, "shots_on_target", 1.5, opp),
          fetchMatchContext(mid, match.home_team, match.away_team)
        ])
        .then(([propData, contextData]) => {
          setPropStats(propData);
          setMatchContext(contextData);
          setLoadingProp(false);
        })
        .catch(() => setLoadingProp(false));
    }
  }, [isDrawerOpen, propStats, matchContext, loadingProp, match.home_team, match.away_team, match.match_id]);

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
          // Use fetched matchContext if available, otherwise fall back to deterministic mock
          // (Since both use the same seed logic in this demo, they will match)
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
          
          // Data source: API context or deterministic fallback
          const weatherText = matchContext?.weather || weathers[seed % 3].text;
          const weatherImpact = matchContext?.weather_impact;
          const displayWeather = weatherImpact ? `${weatherText} (${weatherImpact})` : weatherText;
          const weatherIcon = weathers.find(w => weatherText.includes(w.text))?.icon || "☀️";
          const weatherCls = weathers.find(w => weatherText.includes(w.text))?.cls || weathers[0].cls;

          const refText = matchContext?.referee_style || refs[seed % 2].text;
          const refIcon = refText.includes("Strict") ? "🟨" : "⚖️";
          const refCls = refText.includes("Strict") ? refs[1].cls : refs[0].cls;

          const isFatigued = matchContext ? !!matchContext.fatigue_warning : (seed % 10) > 7;
          const fatigueText = matchContext?.fatigue_warning || `${match.away_team} Rest Disadvantage`;

          return (
            <>
              {(weatherText !== "Clear" || weatherImpact) && (
                <div className={`px-2 py-0.5 rounded flex items-center gap-1 text-[10px] tracking-wide ${weatherCls}`}>
                  <span>{weatherIcon}</span> {displayWeather}
                </div>
              )}
              {refText.includes("Strict") && (
                <div className={`px-2 py-0.5 rounded flex items-center gap-1 text-[10px] tracking-wide ${refCls}`}>
                  <span>{refIcon}</span> {refText}
                </div>
              )}
              {isFatigued && (
                <div className="px-2 py-0.5 rounded flex items-center gap-1 text-[10px] tracking-wide bg-destructive/10 text-destructive border border-destructive/30 font-bold">
                  <span>⚠️</span> {fatigueText}
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
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-input rounded w-3/4"></div>
                    <div className="h-24 bg-input rounded-xl w-full"></div>
                    <div className="h-20 bg-input rounded-xl w-full"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header: Pulse of the Prop */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-[12px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-chart-2 animate-ping" />
                        Pulse of the Prop
                      </h4>
                      <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">{propStats.prop_type.replace(/_/g, " ")} | Line {propStats.line}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       {/* Season Strike Rate Indicator */}
                       <div className="bg-card/50 border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                          <div className="relative w-16 h-16 mb-2">
                             <svg className="w-full h-full transform -rotate-90">
                               <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
                               <motion.circle 
                                 cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" 
                                 strokeDasharray={176}
                                 initial={{ strokeDashoffset: 176 }}
                                 animate={{ strokeDashoffset: 176 - (176 * propStats.hit_rate_szn) / 100 }}
                                 transition={{ duration: 1, ease: "easeOut" }}
                                 className="text-chart-2" 
                               />
                             </svg>
                             <div className="absolute inset-0 flex items-center justify-center">
                               <span className="text-[13px] font-black">{Math.round(propStats.hit_rate_szn)}%</span>
                             </div>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-tighter">Season Strike Rate</span>
                       </div>

                       {/* H2H context */}
                       <div className="bg-card/50 border border-border rounded-xl p-3 flex flex-col justify-center gap-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">vs {propStats.h2h_vs_opponent?.opponent || "Opponent"}</span>
                          <div className="text-[18px] font-black text-chart-2 tabular-nums">
                            {propStats.h2h_vs_opponent?.avg_value || "-"}
                            <span className="text-[10px] text-muted-foreground ml-1 font-normal">avg</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground leading-tight">Based on last {propStats.h2h_vs_opponent?.games_played || 0} meetings</p>
                       </div>
                    </div>

                    {/* Performance Histogram (Last 5) */}
                    <div className="bg-input/20 rounded-xl p-3 border border-border">
                       <div className="flex items-center justify-between mb-3 px-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Performance (Last 5)</span>
                          <div className="flex gap-2">
                             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-chart-2" /><span className="text-[8px] uppercase font-bold text-muted-foreground">HIT</span></div>
                             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-destructive" /><span className="text-[8px] uppercase font-bold text-muted-foreground">MISS</span></div>
                          </div>
                       </div>
                       <div className="flex items-end justify-between gap-1 h-16 mb-2">
                          {propStats.last_5_games.map((log, i) => {
                             const maxVal = Math.max(...propStats.last_5_games.map(l => l.value), propStats.line + 1);
                             const barHeight = (log.value / maxVal) * 100;
                             const linePos = (propStats.line / maxVal) * 100;
                             
                             return (
                               <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                                  <div className="relative w-full h-12 bg-border/20 rounded-sm overflow-hidden flex items-end">
                                     {/* Target Line marker */}
                                     {/* <div className="absolute left-0 right-0 border-t border-dashed border-white/20 z-10" style={{ bottom: `${linePos}%` }} /> */}
                                     <motion.div 
                                       initial={{ height: 0 }}
                                       animate={{ height: `${barHeight}%` }}
                                       className={`w-full ${log.hit ? 'bg-chart-2/40 group-hover/bar:bg-chart-2/60' : 'bg-destructive/40 group-hover/bar:bg-destructive/60'} transition-colors`}
                                     />
                                  </div>
                                  <span className="text-[10px] font-black tabular-nums">{log.value}</span>
                                  <span className="text-[7px] font-bold text-muted-foreground/60 uppercase group-hover/bar:text-foreground">{log.opponent.substring(0,3)}</span>
                               </div>
                             );
                          })}
                       </div>
                    </div>

                    {/* Add to slip action */}
                    <div className="flex items-center justify-between gap-4 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-foreground">{match.home_team} Prop</span>
                        <span className="text-[10px] text-muted-foreground">O {propStats.line} {propStats.prop_type.replace(/_/g, " ")}</span>
                      </div>
                      <div className="w-24">
                        <OddsButton 
                          price={2.40} 
                          isSelected={isSelected(makeSelectionId(match.match_id, "player_props", `${match.home_team} Striker O ${propStats.line} ${propStats.prop_type}`))}
                          onClick={() => {
                            toggleSelection({
                              id: makeSelectionId(match.match_id, "player_props", `${match.home_team} Striker O ${propStats.line} ${propStats.prop_type}`),
                              matchId: match.match_id,
                              homeTeam: match.home_team,
                              awayTeam: match.away_team,
                              league: match.league,
                              market: "Player Props",
                              outcomeName: `${match.home_team} Striker O ${propStats.line} ${propStats.prop_type}`,
                              outcomePrice: 2.40,
                              bookmaker: "DraftKings",
                              propType: propStats.prop_type,
                              playerName: `${match.home_team} Striker`
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 mt-4">Match Tactical Context</div>
                    <div className="space-y-1">
                      {(matchContext?.team_h2h_history || []).map((res: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors px-1 rounded-sm">
                          <span className="text-muted-foreground/60 font-mono text-[9px]">{res.date}</span>
                          <span className="font-bold text-foreground flex items-center gap-1">
                             <span className="text-[10px] opacity-70">{match.home_team.substring(0,3)}</span>
                             {res.home_score} - {res.away_score}
                             <span className="text-[10px] opacity-70">{match.away_team.substring(0,3)}</span>
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-tighter ${res.winner === "Draw" ? "text-muted-foreground" : res.winner === "Home" ? "text-chart-2" : "text-destructive"}`}>
                            {res.winner === "Draw" ? "Draw" : res.winner === "Home" ? "Home Win" : "Away Win"}
                          </span>
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

