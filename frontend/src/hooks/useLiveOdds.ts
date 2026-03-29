"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Match, MatchOdds } from "@/lib/api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

interface UseLiveOddsReturn {
  /** Latest odds data grouped by match */
  matches: Match[];
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Last error message, if any */
  error: string | null;
}

/**
 * Custom hook that connects to the `/ws/live-odds` WebSocket and
 * provides real-time match/odds updates.
 *
 * Features:
 * - Auto-reconnect with exponential backoff (1s → 2s → 4s → … max 30s)
 * - Parses "snapshot" (initial) and "update" (periodic) messages
 * - Returns grouped Match[] in the same shape as the REST API
 */
export function useLiveOdds(): UseLiveOddsReturn {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const processOddsData = useCallback((oddsRows: Record<string, unknown>[]) => {
    // Group flat odds rows into Match objects (same logic as matches router)
    const map = new Map<string, Match>();
    for (const row of oddsRows) {
      const mid = row.match_id as string;
      if (!map.has(mid)) {
        map.set(mid, {
          match_id: mid,
          sport_key: row.sport_key as string,
          league: row.league as string,
          home_team: row.home_team as string,
          away_team: row.away_team as string,
          commence_time: row.commence_time as string,
          odds: [],
        });
      }
      map.get(mid)!.odds.push({
        bookmaker: row.bookmaker as string,
        market: row.market as string,
        outcome_name: row.outcome_name as string,
        outcome_price: row.outcome_price as number,
        point: (row.point as number) ?? null,
        timestamp: row.timestamp as string,
      });
    }
    return Array.from(map.values());
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/live-odds`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "snapshot" || msg.type === "update") {
            const grouped = processOddsData(msg.data ?? []);
            if (grouped.length > 0) {
              setMatches(grouped);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError("WebSocket connection error");
        ws.close();
      };
    } catch {
      setError("Failed to create WebSocket");
      scheduleReconnect();
    }
  }, [processOddsData]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { matches, isConnected, error };
}
