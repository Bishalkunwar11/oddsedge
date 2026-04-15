import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────

export interface BetSelection {
  /** Unique key: `${matchId}::${market}::${outcomeName}` */
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  outcomeName: string;
  outcomePrice: number;
  bookmaker: string;
  propType?: string;
  playerName?: string;
}

export type TabType = "Singles" | "Parlays" | "Round Robins";

interface BetSlipState {
  selections: BetSelection[];
  activeTab: TabType;
  globalStake: number; // used for Parlays
  singleStakes: Record<string, number>; // maps selection id -> stake for Singles

  // Computed
  totalGlobalOdds: () => number;
  potentialGlobalPayout: () => number;
  totalSinglesStake: () => number;
  totalSinglesPayout: () => number;

  // Actions
  setActiveTab: (tab: TabType) => void;
  addSelection: (sel: BetSelection) => void;
  removeSelection: (id: string) => void;
  toggleSelection: (sel: BetSelection) => void;
  clearSlip: () => void;
  setGlobalStake: (amount: number) => void;
  setSingleStake: (id: string, amount: number) => void;
  isSelected: (id: string) => boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function makeSelectionId(
  matchId: string,
  market: string,
  outcomeName: string
): string {
  return `${matchId}::${market}::${outcomeName}`;
}

// ─── Store ───────────────────────────────────────────────────────────

export const useBetSlipStore = create<BetSlipState>((set, get) => ({
  selections: [],
  activeTab: "Singles",
  globalStake: 0,
  singleStakes: {},

  // -- Computed Math --

  totalGlobalOdds: () => {
    const sels = get().selections;
    if (sels.length === 0) return 0;
    return sels.reduce((acc, s) => acc * s.outcomePrice, 1);
  },

  potentialGlobalPayout: () => {
    const { globalStake } = get();
    const total = get().totalGlobalOdds();
    return Math.round(globalStake * total * 100) / 100;
  },

  totalSinglesStake: () => {
    const stakes = get().singleStakes;
    return Object.values(stakes).reduce((acc, val) => acc + (val || 0), 0);
  },

  totalSinglesPayout: () => {
    const { selections, singleStakes } = get();
    return selections.reduce((acc, s) => {
      const stake = singleStakes[s.id] || 0;
      return acc + stake * s.outcomePrice;
    }, 0);
  },

  // -- Actions --

  setActiveTab: (tab) => set({ activeTab: tab }),

  addSelection: (sel) =>
    set((state) => {
      // If adding a selection but we have 1 and it's Singles, auto-switch to Parlays when hitting 2? 
      // Sportsbooks often do this automatically, but let's keep it manual per explicit constraint.
      const filtered = state.selections.filter(
        (s) => !(s.matchId === sel.matchId && s.market === sel.market)
      );
      return { selections: [...filtered, sel] };
    }),

  removeSelection: (id) =>
    set((state) => {
      // clean up local stake mapping when item is removed
      const newStakes = { ...state.singleStakes };
      delete newStakes[id];
      return {
        selections: state.selections.filter((s) => s.id !== id),
        singleStakes: newStakes,
      };
    }),

  toggleSelection: (sel) => {
    const exists = get().selections.find((s) => s.id === sel.id);
    if (exists) {
      get().removeSelection(sel.id);
    } else {
      get().addSelection(sel);
    }
  },

  clearSlip: () =>
    set({
      selections: [],
      globalStake: 0,
      singleStakes: {},
    }),

  setGlobalStake: (amount) => set({ globalStake: amount }),

  setSingleStake: (id, amount) =>
    set((state) => ({
      singleStakes: { ...state.singleStakes, [id]: amount },
    })),

  isSelected: (id) => get().selections.some((s) => s.id === id),
}));
