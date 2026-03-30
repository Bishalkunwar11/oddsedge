"use client";

import { motion, Variants } from "framer-motion";

export default function ValueBetsPage() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Page header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Value Bets</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Bets where the bookmaker&apos;s odds exceed the consensus fair
          probability — your edge over the market.
        </p>
      </motion.div>

      {/* Threshold control */}
      <motion.div variants={item} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
        <label className="text-[12px] font-semibold text-muted-foreground whitespace-nowrap">
          Min Edge
        </label>
        <input
          type="range"
          min={1}
          max={20}
          defaultValue={5}
          className="flex-1 accent-chart-2"
        />
        <span className="text-[14px] font-bold text-chart-2 tabular-nums font-mono w-12 text-right">
          5.0%
        </span>
      </motion.div>

      {/* Stats bar */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Value Bets Found", value: "—", accent: "text-chart-2" },
          { label: "Avg Edge", value: "—", accent: "text-chart-2" },
          { label: "Best Edge", value: "—", accent: "text-chart-3" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-black mt-1 tabular-nums font-mono ${stat.accent}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Value bets list placeholder */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-muted-foreground">
            Detected Value Bets
          </h2>
          <span className="text-[11px] text-muted-foreground/70">
            Sorted by edge ↓
          </span>
        </div>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-input flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-7 h-7 text-muted-foreground/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-muted-foreground">
            Scanning for value…
          </p>
          <p className="text-[12px] text-muted-foreground/70 mt-1">
            Connect to the API to start finding edges against the sharp
            consensus line.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
