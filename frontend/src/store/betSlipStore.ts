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
}

interface BetSlipState {
  selections: BetSelection[];
  stake: number;

  // Computed
  totalOdds: () => number;
  potentialPayout: () => number;

  // Actions
  addSelection: (sel: BetSelection) => void;
  removeSelection: (id: string) => void;
  toggleSelection: (sel: BetSelection) => void;
  clearSlip: () => void;
  setStake: (amount: number) => void;
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
  stake: 0,

  totalOdds: () => {
    const sels = get().selections;
    if (sels.length === 0) return 0;
    return sels.reduce((acc, s) => acc * s.outcomePrice, 1);
  },

  potentialPayout: () => {
    const { stake } = get();
    const total = get().totalOdds();
    return Math.round(stake * total * 100) / 100;
  },

  addSelection: (sel) =>
    set((state) => {
      // Replace if same match+market already exists (switch outcome)
      const filtered = state.selections.filter(
        (s) => !(s.matchId === sel.matchId && s.market === sel.market)
      );
      return { selections: [...filtered, sel] };
    }),

  removeSelection: (id) =>
    set((state) => ({
      selections: state.selections.filter((s) => s.id !== id),
    })),

  toggleSelection: (sel) => {
    const exists = get().selections.find((s) => s.id === sel.id);
    if (exists) {
      get().removeSelection(sel.id);
    } else {
      get().addSelection(sel);
    }
  },

  clearSlip: () => set({ selections: [], stake: 0 }),

  setStake: (amount) => set({ stake: amount }),

  isSelected: (id) => get().selections.some((s) => s.id === id),
}));
