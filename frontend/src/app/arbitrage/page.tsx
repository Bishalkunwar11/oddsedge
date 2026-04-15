"use client";

import { useEffect, useState } from "react";
import { fetchArbitrage, type ArbitrageOpp } from "@/lib/api";

export default function ArbitragePage() {
  const [arbs, setArbs] = useState<ArbitrageOpp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArbitrage()
      .then((data) => {
        // Sort by highest arb percentage first
        const sorted = [...data].sort((a, b) => b.arb_pct - a.arb_pct);
        setArbs(sorted);
      })
      .catch((err) => console.error("Arbitrage fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const bestArb = arbs.length > 0 ? arbs[0].arb_pct : 0;
  const marketsScanned = new Set(arbs.map((a) => `${a.match_id}:${a.market}`)).size;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Arbitrage Scanner
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Risk-free opportunities where combined implied probabilities fall
          below 100%.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Opportunities
          </p>
          <p className="text-2xl font-black mt-1 tabular-nums font-mono text-chart-2">
            {loading ? "—" : arbs.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Best Arb %
          </p>
          <p className="text-2xl font-black mt-1 tabular-nums font-mono text-chart-2">
            {loading ? "—" : `${bestArb.toFixed(2)}%`}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Markets Scanned
          </p>
          <p className="text-2xl font-black mt-1 tabular-nums font-mono text-foreground">
            {loading ? "—" : marketsScanned}
          </p>
        </div>
      </div>

      {/* Arb table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold text-muted-foreground">
            Active Opportunities
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-input flex items-center justify-center mx-auto mb-3 animate-pulse">
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground">
              Scanning for arbitrage…
            </p>
          </div>
        ) : arbs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              No arbitrage opportunities found at this time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {arbs.slice(0, 50).map((arb, i) => {
              const outcomes = Object.entries(arb.best_odds);
              const kickoff = new Date(arb.commence_time);
              const dateStr = kickoff.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              const timeStr = kickoff.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={`${arb.match_id}-${arb.market}-${i}`}
                  className="px-5 py-4 hover:bg-accent/5 transition-colors"
                >
                  {/* Match header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                          arb.arb_pct >= 5
                            ? "bg-emerald-500/15 text-emerald-400"
                            : arb.arb_pct >= 2
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-sky-500/15 text-sky-400"
                        }`}
                      >
                        {arb.arb_pct.toFixed(2)}% arb
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                        {arb.market.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/50">
                      {dateStr} · {timeStr}
                    </span>
                  </div>

                  {/* Teams */}
                  <p className="text-[14px] font-semibold text-foreground mb-2">
                    {arb.home_team}{" "}
                    <span className="text-muted-foreground/50 font-normal">
                      vs
                    </span>{" "}
                    {arb.away_team}
                  </p>

                  {/* Outcomes / best odds */}
                  <div className="flex flex-wrap gap-2">
                    {outcomes.map(([name, price]) => (
                      <div
                        key={name}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input/50 border border-border/50"
                      >
                        <span className="text-[12px] text-muted-foreground">
                          {name}
                        </span>
                        <span className="text-[13px] font-bold text-foreground tabular-nums">
                          {Number(price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
