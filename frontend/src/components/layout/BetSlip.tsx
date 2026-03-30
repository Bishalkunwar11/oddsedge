"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useBetSlipStore,
  type BetSelection,
  type TabType,
} from "@/store/betSlipStore";

interface BetSlipProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: TabType[] = ["Singles", "Parlays", "Round Robins"];

export default function BetSlip({ isOpen, onClose }: BetSlipProps) {
  const selections = useBetSlipStore((s) => s.selections);
  const activeTab = useBetSlipStore((s) => s.activeTab);
  const setActiveTab = useBetSlipStore((s) => s.setActiveTab);
  
  const globalStake = useBetSlipStore((s) => s.globalStake);
  const setGlobalStake = useBetSlipStore((s) => s.setGlobalStake);
  const singleStakes = useBetSlipStore((s) => s.singleStakes);
  const setSingleStake = useBetSlipStore((s) => s.setSingleStake);
  
  const removeSelection = useBetSlipStore((s) => s.removeSelection);
  const clearSlip = useBetSlipStore((s) => s.clearSlip);
  
  const totalGlobalOdds = useBetSlipStore((s) => s.totalGlobalOdds);
  const potentialGlobalPayout = useBetSlipStore((s) => s.potentialGlobalPayout);
  const totalSinglesStake = useBetSlipStore((s) => s.totalSinglesStake);
  const totalSinglesPayout = useBetSlipStore((s) => s.totalSinglesPayout);

  const isParlay = activeTab === "Parlays";
  const isSingles = activeTab === "Singles";
  const isRoundRobin = activeTab === "Round Robins";

  const totalWager = isParlay ? globalStake : isSingles ? totalSinglesStake() : 0;
  const totalPayout = isParlay ? potentialGlobalPayout() : isSingles ? totalSinglesPayout() : 0;
  const totalProfit = totalPayout - totalWager;
  
  const combinedOdds = totalGlobalOdds();
  const impliedProb = combinedOdds > 0 ? (1 / combinedOdds) * 100 : 0;

  // Engine 1.3: Smart Parlay & Line Shopper Evaluation Mock
  const hasLowUnder = selections.some(s => s.outcomeName.toLowerCase().includes('under 1.5') || s.outcomeName.toLowerCase().includes('under 2.5'));
  const hasGoalscorer = selections.some(s => s.market.toLowerCase().includes('scorer') || s.outcomeName.toLowerCase().includes('score') || s.market.toLowerCase().includes('goal'));
  
  const hasContradiction = hasLowUnder && hasGoalscorer;
  let smartGrade = "A";
  let gradeColor = "bg-green-500/20 text-green-400 border-green-500/30";
  if (hasContradiction) {
    smartGrade = "F";
    gradeColor = "bg-destructive/20 text-destructive border-destructive/30";
  } else if (selections.length >= 6) {
    smartGrade = "C";
    gradeColor = "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
  } else if (selections.length >= 4) {
    smartGrade = "B";
    gradeColor = "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }

  // Mock pricing variations
  const topOpt = combinedOdds * 1.05;
  const midOpt = combinedOdds * 0.98;
  const lowOpt = combinedOdds * 0.92;

  // Pulse effect ready check
  const isReadyToPlace = selections.length > 0 && totalWager > 0;

  return (
    <>
      {/* Overlay (mobile) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Slide-out panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`
              fixed top-0 right-0 z-50 h-full w-[340px] bg-sidebar border-l border-border
              flex flex-col shadow-2xl
              lg:relative lg:z-auto lg:h-full lg:translate-x-0 lg:border-l
            `}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0 bg-sidebar">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-chart-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-[15px] font-bold text-foreground">
              Bet Slip
            </h2>
            <AnimatePresence>
              {selections.length > 0 && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-1.5 py-0.5 rounded bg-chart-2/20 text-chart-2 text-[11px] font-bold"
                >
                  {selections.length}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1">
            {selections.length > 0 && (
              <button
                onClick={clearSlip}
                className="px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors lg:hidden"
              aria-label="Close bet slip"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bet type tabs */}
        <div className="flex border-b border-border shrink-0 bg-sidebar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  relative flex-1 py-3 text-[12px] font-bold transition-colors uppercase tracking-wider
                  ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
                `}
              >
                {tab}
                {isActive && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(30,58,138,0.8)]"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Parlay Summary Banner ── */}
        <AnimatePresence>
          {isParlay && totalWager > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="mx-3 overflow-hidden"
            >
              <div className="rounded-xl bg-gradient-to-r from-primary/10 to-chart-5/10 border border-primary/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Smart Parlay Engine
                  </span>
                  
                  {selections.length > 1 && (
                    <div className={`flex items-center gap-2 px-2 py-0.5 rounded-full border ${gradeColor}`}>
                      <span className="text-[10px] uppercase font-bold tracking-widest">Grade</span>
                      <span className="text-[12px] font-black">{smartGrade}</span>
                    </div>
                  )}
                </div>

                {hasContradiction && selections.length > 1 && (
                  <div className="mb-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 items-start">
                    <span className="text-destructive text-[12px]">⚠️</span>
                    <p className="text-[10px] text-destructive font-semibold leading-tight">
                      Contradiction Detected: You have a low Under line mixed with a player to score prop. High risk of exclusion!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <SummaryCell label="Legs" value={String(selections.length)} />
                  <SummaryCell label="Combined Odds" value={`${combinedOdds.toFixed(2)}x`} accent="green" />
                  <SummaryCell label="Total Payout" value={`$${totalPayout.toFixed(2)}`} accent="green" />
                  <SummaryCell label="Net Profit" value={`$${totalProfit.toFixed(2)}`} accent={totalProfit > 0 ? "green" : "red"} />
                </div>
                <div className="mt-2 text-center text-[10px] text-muted-foreground/70">
                  All {selections.length} legs must win · Implied: {impliedProb.toFixed(1)}%
                </div>
              </div>
            </motion.div>
          )}
          {isRoundRobin && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="mx-3 overflow-hidden"
            >
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Coming Soon</p>
                <p className="text-[12px] text-muted-foreground/70">Round Robin complex combinations are currently under construction.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selections list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 relative">
          <AnimatePresence>
            {selections.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4">
                  <span className="text-3xl">🎫</span>
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-1">
                  Slip is empty
                </p>
                <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                  Click on odds in the lobby to start building your bet slip.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <AnimatePresence>
              {selections.map((sel, idx) => (
                <motion.div
                  key={sel.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <SelectionCard
                    index={idx + 1}
                    selection={sel}
                    onRemove={() => removeSelection(sel.id)}
                    showStakeInput={isSingles}
                    stake={singleStakes[sel.id] || ""}
                    onStakeChange={(val) => setSingleStake(sel.id, Number(val) || 0)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer — stake & checkout */}
        <div className="border-t border-border bg-sidebar p-4 space-y-3 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] relative z-20">
          
          {/* Global Stake input for Parlays */}
          <AnimatePresence>
            {isParlay && selections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3 pb-3 border-b border-border/50"
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider">Parlay Odds</span>
                  <span className="font-bold text-chart-2 tabular-nums font-mono text-[14px]">
                    {combinedOdds.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Wager
                  </label>
                  <div className="flex-1 flex items-center bg-input border border-border rounded-lg px-3 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                    <span className="text-[13px] text-muted-foreground/70 mr-1">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={globalStake || ""}
                      onChange={(e) => setGlobalStake(Number(e.target.value) || 0)}
                      className="bg-transparent text-[14px] text-foreground outline-none w-full font-bold tabular-nums font-mono"
                    />
                  </div>
                </div>
                {/* Quick amounts */}
                <div className="flex gap-1.5">
                  {[10, 50, 100, 250].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setGlobalStake(globalStake + amount)}
                      className="flex-1 py-1.5 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors active:scale-95"
                    >
                      +${amount}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Line Shopper Visualization */}
          <AnimatePresence>
            {isParlay && selections.length > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 pb-3 border-b border-border/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-chart-3 uppercase tracking-wider flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63-.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Line Shopper
                  </span>
                  <span className="text-[9px] text-muted-foreground">Best Value Found</span>
                </div>
                
                <div className="space-y-1.5 mt-1">
                  <div className="flex items-center justify-between px-2 py-1.5 bg-chart-3/10 border border-chart-3/20 rounded">
                    <span className="text-[11px] font-semibold text-foreground">DraftKings</span>
                    <span className="text-[12px] font-mono font-bold text-chart-3">{topOpt.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-card border border-border rounded">
                    <span className="text-[11px] text-muted-foreground">FanDuel</span>
                    <span className="text-[12px] font-mono text-muted-foreground">{midOpt.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-card border border-border rounded">
                    <span className="text-[11px] text-muted-foreground opacity-70">BetMGM</span>
                    <span className="text-[12px] font-mono text-muted-foreground opacity-70">{lowOpt.toFixed(2)}x</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Master Checkout Metrics */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider">Total Stake</span>
              <span className="text-[15px] font-bold text-foreground tabular-nums font-mono">${totalWager.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider">To Win</span>
              <span className="text-[16px] font-black text-chart-2 tabular-nums font-mono">${totalPayout.toFixed(2)}</span>
            </div>
          </div>

          {/* Place bet button with glowing pulse if ready */}
          <motion.button
            whileTap={isReadyToPlace ? { scale: 0.95 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            disabled={!isReadyToPlace}
            className={`
              relative w-full py-3.5 rounded-lg text-[13px] font-bold uppercase tracking-widest overflow-hidden transition-all duration-300
              ${isReadyToPlace 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-in border border-transparent shadow-[0_0_20px_rgba(30,58,138,0.4)] hover:shadow-[0_0_30px_rgba(30,58,138,0.8)]" 
                  : "bg-input text-muted-foreground opacity-50 cursor-not-allowed border border-border"
              }
            `}
          >
            {isReadyToPlace && (
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] animate-[shimmer_2s_infinite]" />
            )}
            <span className="relative z-10">
              {isParlay 
                ? `Place ${selections.length}-Leg Parlay` 
                : isSingles && selections.length > 1 
                  ? `Place ${selections.length} Singles`
                  : "Place Bet"}
            </span>
          </motion.button>

          {/* Social Share / Tail My Slip (Engine 4.2) */}
          <AnimatePresence>
            {selections.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => {
                   const shareLink = `https://oddsedge.app/tail/${Math.random().toString(36).substring(7)}`;
                   navigator.clipboard.writeText(shareLink);
                   alert("Tail Link Copied to Clipboard!");
                }}
                className="w-full mt-2 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] bg-secondary text-secondary-foreground border border-border/50 hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Tail My Slip
              </motion.button>
            )}
          </AnimatePresence>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Summary Cell ────────────────────────────────────────────────────

function SummaryCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red" | "primary";
}) {
  const color =
    accent === "green"
      ? "text-chart-2"
      : accent === "red"
        ? "text-destructive"
        : accent === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-[14px] font-black tabular-nums font-mono ${color}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Selection Card ──────────────────────────────────────────────────

function SelectionCard({
  index,
  selection,
  onRemove,
  showStakeInput = false,
  stake = "",
  onStakeChange,
}: {
  index: number;
  selection: BetSelection;
  onRemove: () => void;
  showStakeInput?: boolean;
  stake?: number | string;
  onStakeChange?: (val: string) => void;
}) {
  const impliedProb = 1 / selection.outcomePrice;
  const probPct = Math.round(impliedProb * 100);

  return (
    <motion.div 
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-card border border-border shadow-md hover:shadow-lg rounded-lg p-3 relative overflow-hidden group hover:border-primary/30 transition-colors"
    >
      {/* Accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-chart-2/50" />
      
      <div className="flex items-start justify-between pl-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest truncate font-semibold">
              {selection.homeTeam} vs {selection.awayTeam}
            </p>
            <button
              onClick={onRemove}
              className="p-1 -mt-1 -mr-1 rounded text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Remove leg"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[14px] font-bold text-foreground">
                {selection.outcomeName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block px-1.5 py-0.5 rounded-sm bg-secondary text-[9px] font-bold text-secondary-foreground uppercase tracking-widest">
                  {selection.market}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {selection.bookmaker}
                </span>
              </div>
            </div>
            <span className="text-[16px] font-black text-chart-2 tabular-nums font-mono">
              {selection.outcomePrice.toFixed(2)}
            </span>
          </div>

          <AnimatePresence>
            {showStakeInput && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-input/50 rounded-md p-2 flex items-center justify-between border border-border">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Wager</span>
                  <div className="flex items-center">
                    <span className="text-[12px] text-muted-foreground mr-1">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={stake}
                      onChange={(e) => onStakeChange?.(e.target.value)}
                      className="bg-transparent w-20 text-right text-[13px] font-bold text-foreground outline-none tabular-nums font-mono"
                    />
                  </div>
                </div>
                {Number(stake) > 0 && (
                  <div className="flex justify-between items-center mt-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">To win</span>
                    <span className="text-[11px] font-bold text-chart-2 tabular-nums font-mono">
                      ${(Number(stake) * selection.outcomePrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
}
