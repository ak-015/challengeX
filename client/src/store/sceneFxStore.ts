import { create } from 'zustand';

export type AltarPhase = 'idle' | 'rising' | 'steps' | 'ignite' | 'beam' | 'done';

interface FxState {
  /** Altar intro phase (read by the altar scene via a data attribute). Default 'done' = fully lit. */
  altarPhase: AltarPhase;
  setAltarPhase: (p: AltarPhase) => void;
  /** Incremented to play the global smoke overlay. */
  smokeKey: number;
  playSmoke: () => void;
  /** Incremented to flare the magic circle. */
  flareKey: number;
  flare: () => void;
}

export const useFx = create<FxState>((set) => ({
  altarPhase: 'done',
  setAltarPhase: (altarPhase) => set({ altarPhase }),
  smokeKey: 0,
  playSmoke: () => set((s) => ({ smokeKey: s.smokeKey + 1 })),
  flareKey: 0,
  flare: () => set((s) => ({ flareKey: s.flareKey + 1 })),
}));
