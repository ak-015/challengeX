import { create } from 'zustand';
import { safeStorage } from '@/lib/storage';

export type GateMode = 'gate' | 'smoke';
const KEY = 'cc.prefs.v1';

interface Persisted {
  gateMode: GateMode;
  alwaysSkip: boolean;
  muted: boolean;
}
const DEFAULTS: Persisted = { gateMode: 'gate', alwaysSkip: false, muted: false };

function load(): Persisted {
  try {
    const raw = safeStorage.get(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      gateMode: p.gateMode === 'smoke' ? 'smoke' : 'gate',
      alwaysSkip: p.alwaysSkip === true,
      muted: p.muted === true,
    };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsState extends Persisted {
  setGateMode: (m: GateMode) => void;
  setAlwaysSkip: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  toggleMuted: () => void;
}

export const usePrefs = create<PrefsState>((set, get) => {
  const save = () => {
    const { gateMode, alwaysSkip, muted } = get();
    safeStorage.set(KEY, JSON.stringify({ gateMode, alwaysSkip, muted }));
  };
  return {
    ...load(),
    setGateMode: (gateMode) => (set({ gateMode }), save()),
    setAlwaysSkip: (alwaysSkip) => (set({ alwaysSkip }), save()),
    setMuted: (muted) => (set({ muted }), save()),
    toggleMuted: () => (set({ muted: !get().muted }), save()),
  };
});
