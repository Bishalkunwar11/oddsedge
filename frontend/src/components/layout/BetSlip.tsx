"use client";

import {
  useBetSlipStore,
  type BetSelection,
} from "@/store/betSlipStore";

interface BetSlipProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BetSlip({ isOpen, onClose }: BetSlipProps) {
  const selections = useBetSlipStore((s) => s.selections);
  const stake = useBetSlipStore((s) => s.stake);
  const setStake = useBetSlipStore((s) => s.setStake);
  const removeSelection = useBetSlipStore((s) => s.removeSelection);
  const clearSlip = useBetSlipStore((s) => s.clearSlip);
  const totalOdds = useBetSlipStore((s) => s.totalOdds);
  const potentialPayout = useBetSlipStore((s) => s.potentialPayout);

  const combined = totalOdds();
  const payout = potentialPayout();
  const profit = payout - stake;
  const impliedProb = combined > 0 ? (1 / combined) * 100 : 0;
  const isParlay = selections.length >= 2;

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-[340px] bg-bg-raised border-l border-border-subtle
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          lg:relative lg:z-auto
          ${isOpen ? "lg:translate-x-0" : "lg:translate-x-full lg:w-0 lg:border-0 lg:overflow-hidden"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-[15px] font-bold text-text-primary">
              {isParlay ? "Parlay Builder" : "Bet Slip"}
            </h2>
            {selections.length > 0 && (
              <span className="text-[11px] text-text-muted">
                ({selections.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selections.length > 0 && (
              <button
                onClick={clearSlip}
                className="px-2 py-1 text-[11px] font-semibold text-accent-red hover:bg-accent-red/10 rounded transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors"
              aria-label="Close bet slip"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bet type tabs */}
        <div className="flex border-b border-border-subtle shrink-0">
          {["Single", "Parlay", "Round Robin"].map((tab, i) => (
            <button
              key={tab}
              className={`
                flex-1 py-2.5 text-[12px] font-semibold transition-colors
                ${
                  (isParlay ? i === 1 : i === 0)
                    ? "text-accent-green border-b-2 border-accent-green"
                    : "text-text-muted hover:text-text-secondary"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Parlay Summary Banner ── */}
        {isParlay && stake > 0 && (
          <div className="mx-3 mt-3 rounded-xl bg-gradient-to-r from-accent-green/10 to-accent-blue/10 border border-accent-green/20 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold text-accent-green uppercase tracking-wider">
                ⭐ Live Summary
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCell label="Legs" value={String(selections.length)} />
              <SummaryCell label="Combined Odds" value={`${combined.toFixed(2)}x`} accent="green" />
              <SummaryCell label="Total Payout" value={`$${payout.toFixed(2)}`} accent="green" />
              <SummaryCell label="Net Profit" value={`$${profit.toFixed(2)}`} accent={profit > 0 ? "green" : "red"} />
            </div>
            <div className="mt-2 text-center text-[10px] text-text-dim">
              ⚠️ All {selections.length} legs must win · Implied: {impliedProb.toFixed(1)}%
            </div>
          </div>
        )}

        {/* Selections list */}
        <div className="flex-1 overflow-y-auto">
          {selections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg-card flex items-center justify-center mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <p className="text-[13px] font-semibold text-text-secondary mb-1">
                No selections yet
              </p>
              <p className="text-[12px] text-text-dim leading-relaxed">
                Click on any odds button to build your parlay slip.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {selections.map((sel, idx) => (
                <SelectionCard
                  key={sel.id}
                  index={idx + 1}
                  selection={sel}
                  onRemove={() => removeSelection(sel.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer — stake & place bet */}
        <div className="border-t border-border-subtle p-4 space-y-3 shrink-0">
          {/* Single-bet combined odds (when not parlay) */}
          {selections.length === 1 && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-text-muted">Odds</span>
              <span className="font-bold text-accent-green tabular-nums">
                {combined.toFixed(2)}
              </span>
            </div>
          )}

          {/* Stake input */}
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-text-muted">
              Stake
            </label>
            <div className="flex-1 flex items-center bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5">
              <span className="text-[13px] text-text-dim mr-1">$</span>
              <input
                type="number"
                placeholder="0.00"
                value={stake || ""}
                onChange={(e) => setStake(Number(e.target.value) || 0)}
                className="bg-transparent text-[13px] text-text-primary outline-none w-full font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-1.5">
            {[10, 50, 100, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => setStake(stake + amount)}
                className="flex-1 py-1.5 rounded-md bg-bg-card border border-border-subtle text-[11px] font-semibold text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors"
              >
                +${amount}
              </button>
            ))}
          </div>

          {/* Payout preview */}
          {stake > 0 && selections.length > 0 && !isParlay && (
            <div className="flex items-center justify-between text-[12px] pt-1">
              <span className="text-text-muted">Potential Payout</span>
              <span className="font-bold text-accent-green tabular-nums text-[14px]">
                ${payout.toFixed(2)}
              </span>
            </div>
          )}

          {/* Place bet button */}
          <button
            disabled={selections.length === 0 || stake <= 0}
            className="w-full py-3 rounded-lg bg-accent-green/20 text-accent-green text-[13px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-green/30 transition-colors"
          >
            {isParlay
              ? `Place ${selections.length}-Leg Parlay`
              : "Place Bet"}
          </button>
        </div>
      </aside>
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
  accent?: "green" | "red";
}) {
  const color =
    accent === "green"
      ? "text-accent-green"
      : accent === "red"
        ? "text-accent-red"
        : "text-text-primary";
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-[14px] font-black tabular-nums ${color}`}>
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
}: {
  index: number;
  selection: BetSelection;
  onRemove: () => void;
}) {
  const impliedProb = 1 / selection.outcomePrice;
  const probPct = Math.round(impliedProb * 100);

  return (
    <div className="bg-bg-card border border-border-subtle rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Leg number badge */}
          <div className="w-6 h-6 rounded-md bg-accent-green/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-black text-accent-green">
              #{index}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-text-dim uppercase tracking-wider truncate">
              {selection.homeTeam} vs {selection.awayTeam}
            </p>
            <p className="text-[13px] font-semibold text-text-primary mt-0.5">
              {selection.outcomeName}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {selection.bookmaker}
            </p>
            {/* Implied probability bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-text-dim font-semibold uppercase tracking-wider">
                  Implied Prob.
                </span>
                <span className="text-[10px] text-text-muted font-bold tabular-nums">
                  {(impliedProb * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-bg-input overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green/60 transition-all duration-300"
                  style={{ width: `${Math.min(probPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <span className="text-[15px] font-bold text-accent-green tabular-nums">
            {selection.outcomePrice.toFixed(2)}
          </span>
          <button
            onClick={onRemove}
            className="p-1 rounded text-text-dim hover:text-accent-red hover:bg-accent-red/10 transition-colors"
            aria-label="Remove selection"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
