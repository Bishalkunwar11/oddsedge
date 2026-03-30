"use client";

import { useBetSlipStore } from "@/store/betSlipStore";
import { motion } from "framer-motion";

interface TopBarProps {
  onToggleBetSlip: () => void;
}

export default function TopBar({ onToggleBetSlip }: TopBarProps) {
  const count = useBetSlipStore((s) => s.selections.length);

  return (
    <header className="h-14 bg-background/80 backdrop-blur-xl border-b border-[#ECA022]/50 flex items-center justify-between px-5 shrink-0 shadow-lg relative z-20">
      {/* Left — mobile menu + breadcrumb area */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="md:hidden p-1.5 rounded-lg text-foreground hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </motion.button>
        <motion.div 
          whileTap={{ scale: 0.95 }}
          className="flex flex-row items-center gap-2 cursor-pointer"
        >
          <picture>
            <img src="/logo.png" alt="OddsEdge" className="h-8 sm:h-10 w-auto object-contain drop-shadow-md" />
          </picture>
        </motion.div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-56 shadow-inner transition-all duration-300 focus-within:w-64 focus-within:bg-white/10 focus-within:border-white/20">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search matches..."
            className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>

        {/* Bet Slip toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={onToggleBetSlip}
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-b from-[#F2C051] to-[#ECA022] hover:from-[#F8D272] hover:to-[#F4B23D] text-[#12315A] text-[13px] font-bold shadow-md hover:shadow-lg border border-[#D58C17]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="hidden sm:inline">Bet Slip</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] rounded-full bg-white text-[#12315A] text-[11px] font-black flex items-center justify-center px-1 shadow-md border border-[#ECA022] animate-bounce-short">
              {count}
            </span>
          )}
        </motion.button>
      </div>
    </header>
  );
}
