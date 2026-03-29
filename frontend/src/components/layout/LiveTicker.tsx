"use client";

import { useEffect, useState } from "react";

// Mock Data for Phase 4 implementation until Database Proxy seeding is complete
const MOCK_LIVE_MATCHES = [
  { id: "1", clock: "41'", home: "Arsenal", away: "Chelsea", score: "2 - 1" },
  { id: "2", clock: "68'", home: "Real Madrid", away: "Barcelona", score: "0 - 0" },
  { id: "3", clock: "12'", home: "Bayern Munich", away: "Dortmund", score: "1 - 0" },
  { id: "4", clock: "HT", home: "Juventus", away: "AC Milan", score: "1 - 1" },
  { id: "5", clock: "89'", home: "PSG", away: "Marseille", score: "3 - 0" },
];

export default function LiveTicker() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid Hydration Mismatch on dates or dynamic random loops

  return (
    <div 
      className="w-full bg-sidebar border-b border-border h-[40px] flex items-center overflow-hidden relative shadow-sm"
      aria-live="polite"
      role="region"
      aria-label="Live Match Scores Ticker"
    >
      {/* Absolute gradient masks for smooth fade-in/fade-out on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-sidebar to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-sidebar to-transparent z-10" />

      {/* 
        Marquee track container 
        We render the list TWICE inside the same flowing div so that `--animate-marquee` 
        (which loops from 0 to -50%) will loop seamlessly without a visual jump.
      */}
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] whitespace-nowrap">
        <TickerContent items={MOCK_LIVE_MATCHES} />
        <TickerContent items={MOCK_LIVE_MATCHES} />
      </div>
    </div>
  );
}

function TickerContent({ items }: { items: typeof MOCK_LIVE_MATCHES }) {
  return (
    <div className="flex items-center">
      {items.map((match) => (
        <div 
          key={match.id} 
          className="flex items-center gap-2 px-6 border-r border-border/50 text-[12px] tabular-nums font-mono"
        >
          {/* Live pulsing dot indicator */}
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-live-pulse" />
          
          <span className="text-destructive font-black w-[24px]">{match.clock}</span>
          <span className="text-muted-foreground font-semibold">{match.home}</span>
          <span className="text-foreground font-bold px-1">{match.score}</span>
          <span className="text-muted-foreground font-semibold">{match.away}</span>
        </div>
      ))}
    </div>
  );
}
