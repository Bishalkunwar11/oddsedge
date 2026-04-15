"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { fetchValueBets, ValueBet } from "@/lib/api";
import { useBetSlipStore, makeSelectionId } from "@/store/betSlipStore";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};

export default function ValueBetsPage() {
  const [bets, setBets] = useState<ValueBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.05); // 5% default
  const { toggleSelection, isSelected } = useBetSlipStore();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchValueBets(undefined, threshold);
        if (isMounted) {
          setBets(data.sort((a, b) => b.edge - a.edge));
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000); // 15s refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [threshold]);

  const avgEdge = bets.length > 0 
    ? (bets.reduce((acc, b) => acc + b.edge, 0) / bets.length) * 100 
    : 0;
  const maxEdge = bets.length > 0 
    ? Math.max(...bets.map(b => b.edge)) * 100 
    : 0;

  return (
    <motion.div 
      className="max-w-5xl mx-auto space-y-6 pb-20"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Page header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Contextual Value Engine</h1>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-2xl">
          Identifying mathematical edges by cross-referencing sharp consensus probabilities 
          with real-time physical factors like weather, referee styles, and team fatigue.
        </p>
      </motion.div>

      {/* Control Panel */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-card/40 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent pointer-events-none" />
        
        <div className="md:col-span-2 space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
            Min Edge Threshold
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={20}
              value={threshold * 100}
              onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
              className="flex-1 h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-chart-2"
            />
            <span className="text-[16px] font-black text-chart-2 tabular-nums font-mono w-14">
              {(threshold * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="md:col-span-1 border-l border-border/30 pl-6 hidden md:block">
           <div className="text-[10px] uppercase font-bold text-muted-foreground/60">Bets Found</div>
           <div className="text-xl font-black tabular-nums">{bets.length}</div>
        </div>
        
        <div className="md:col-span-1 border-l border-border/30 pl-6 hidden md:block">
           <div className="text-[10px] uppercase font-bold text-muted-foreground/60">Avg Edge</div>
           <div className="text-xl font-black tabular-nums text-chart-2">{avgEdge.toFixed(1)}%</div>
        </div>
      </motion.div>

      {/* Value Bets Grid */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {loading && bets.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="w-12 h-12 border-2 border-chart-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-bold tracking-tight">Syncing with Sharp Consenus...</p>
            </motion.div>
          ) : bets.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center bg-card border border-border border-dashed rounded-2xl">
              <p className="text-muted-foreground font-bold">No value found above {(threshold * 100).toFixed(1)}% threshold.</p>
              <button onClick={() => setThreshold(0.01)} className="mt-4 text-primary text-sm font-bold hover:underline">Try lower threshold</button>
            </motion.div>
          ) : (
            bets.map((bet) => (
              <motion.div
                key={`${bet.match_id}-${bet.outcome_name}-${bet.bookmaker}`}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                variants={item}
                className="group relative bg-card hover:bg-input/20 border border-border/60 hover:border-chart-2/40 rounded-2xl p-5 transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden"
              >
                {/* Edge Intensity Background */}
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-chart-2/[0.03] to-transparent pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                       <span>{bet.market.replace(/_/g, " ")}</span>
                       <span>•</span>
                       <span>{bet.bookmaker}</span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-foreground">
                      {bet.outcome_name}
                    </h3>
                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium">
                       <span>{bet.home_team} vs {bet.away_team}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Contextual Edge Badge */}
                    {bet.contextual_adjustment && bet.contextual_adjustment > 0 && (
                      <div className="flex flex-col items-end">
                        <div className="px-2.5 py-1 rounded-full bg-chart-1/10 text-chart-3 text-[11px] font-black border border-chart-1/20 flex items-center gap-1.5">
                           <span>{bet.contextual_reason?.includes('Weather') ? '🌧️' : '⚠️'}</span>
                           {bet.contextual_reason}
                        </div>
                        <span className="text-[10px] font-bold text-chart-1 mt-1">+{(bet.contextual_adjustment * 100).toFixed(1)}% Context Boost</span>
                      </div>
                    )}

                    <div className="flex items-center gap-8 py-2 px-6 rounded-2xl bg-input/40 border border-border/40">
                      <div className="text-center">
                        <div className="text-[9px] uppercase font-bold text-muted-foreground/60 mb-0.5">Implied</div>
                        <div className="text-sm font-black tabular-nums">{(bet.consensus_prob * 100).toFixed(1)}%</div>
                      </div>
                      <div className="w-px h-8 bg-border/40" />
                      <div className="text-center">
                        <div className="text-[9px] uppercase font-bold text-muted-foreground/60 mb-0.5">Price</div>
                        <div className="text-sm font-black text-chart-2 tabular-nums">{bet.outcome_price.toFixed(2)}x</div>
                      </div>
                      <div className="w-px h-8 bg-border/40" />
                      <div className="text-center">
                        <div className="text-[9px] uppercase font-bold text-muted-foreground/60 mb-0.5 font-bold">Total Edge</div>
                        <div className="text-sm font-black text-chart-2 tabular-nums">{(bet.edge * 100).toFixed(1)}%</div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSelection({
                        id: makeSelectionId(bet.match_id, bet.market, bet.outcome_name),
                        matchId: bet.match_id,
                        homeTeam: bet.home_team,
                        awayTeam: bet.away_team,
                        league: "Value Bet",
                        market: bet.market,
                        outcomeName: bet.outcome_name,
                        outcomePrice: bet.outcome_price,
                        bookmaker: bet.bookmaker
                      })}
                      className={`h-12 px-6 rounded-xl font-black text-[14px] transition-all duration-300 shadow-lg ${
                        isSelected(makeSelectionId(bet.match_id, bet.market, bet.outcome_name))
                          ? "bg-primary text-primary-foreground shadow-primary/20"
                          : "bg-foreground text-background hover:scale-105 active:scale-95 shadow-black/20"
                      }`}
                    >
                      {isSelected(makeSelectionId(bet.match_id, bet.market, bet.outcome_name)) ? "ADDED" : "BET NOW"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
