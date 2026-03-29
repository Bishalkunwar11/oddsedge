"use client";

import { useBetSlipStore } from "@/store/betSlipStore";

interface TopBarProps {
  onToggleBetSlip: () => void;
}

export default function TopBar({ onToggleBetSlip }: TopBarProps) {
  const count = useBetSlipStore((s) => s.selections.length);

  return (
    <header className="h-14 bg-bg-raised border-b border-border-subtle flex items-center justify-between px-5 shrink-0">
      {/* Left — mobile menu + breadcrumb area */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-[13px] font-semibold text-text-secondary hidden sm:block">
          Football Odds Analysis
        </h1>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden lg:flex items-center gap-2 bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 w-56">
          <svg className="w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search matches..."
            className="bg-transparent text-[13px] text-text-primary placeholder:text-text-dim outline-none w-full"
          />
        </div>

        {/* Bet Slip toggle */}
        <button
          onClick={onToggleBetSlip}
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/10 hover:bg-accent-green/20 text-accent-green text-[13px] font-semibold transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="hidden sm:inline">Bet Slip</span>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-accent-green text-bg-base text-[10px] font-black flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
