"use client";

import { useEffect, useState } from "react";
import { fetchMatches, type Match } from "@/lib/api";
import { useLiveOdds } from "@/hooks/useLiveOdds";
import MatchCard from "@/components/odds/MatchCard";
import { motion, Variants } from "framer-motion";

const LEAGUE_FILTERS = [
  { label: "All Leagues", key: null },
  { label: "EPL", key: "soccer_epl" },
  { label: "La Liga", key: "soccer_spain_la_liga" },
  { label: "Serie A", key: "soccer_italy_serie_a" },
  { label: "Bundesliga", key: "soccer_germany_bundesliga" },
  { label: "Ligue 1", key: "soccer_france_ligue_one" },
];

export default function MatchesPage() {
  const [restMatches, setRestMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // WebSocket live data
  const { matches: wsMatches, isConnected } = useLiveOdds();

  // Decide data source: WS if connected + has data, else REST
  const liveData = isConnected && wsMatches.length > 0 ? wsMatches : restMatches;

  // Filter by league if active
  const displayMatches = activeFilter
    ? liveData.filter((m) => m.sport_key === activeFilter)
    : liveData;

  // REST fallback fetch
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMatches();
        if (!cancelled) setRestMatches(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load matches"
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matches</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Upcoming fixtures with the latest odds from top bookmakers.
          </p>
        </div>
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-chart-2 animate-live-pulse"
                : "bg-text-dim"
            }`}
          />
          <span className="text-[11px] font-semibold text-muted-foreground/70">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* League filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {LEAGUE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f.key)}
            className={`
              px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
              ${
                activeFilter === f.key
                  ? "bg-chart-2/10 text-chart-2"
                  : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border"
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && !isConnected && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-3 w-28 bg-border-subtle rounded" />
                <div className="h-3 w-20 bg-border-subtle rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-40 bg-border-subtle rounded" />
                <div className="h-4 w-36 bg-border-subtle rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !isConnected && displayMatches.length === 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 text-center">
          <p className="text-[13px] font-semibold text-destructive">{error}</p>
          <p className="text-[12px] text-muted-foreground/70 mt-1">
            Make sure the backend is running at{" "}
            <code className="text-muted-foreground">localhost:8000</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-1.5 rounded-lg bg-card border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && displayMatches.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-input flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-muted-foreground">
            No matches found
          </p>
          <p className="text-[12px] text-muted-foreground/70 mt-1">
            Try a different league filter or check back later.
          </p>
        </div>
      )}

      {displayMatches.length > 0 && (
        <motion.div 
          className="space-y-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {displayMatches.map((match) => (
            <motion.div key={match.match_id} variants={item}>
              <MatchCard match={match} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
