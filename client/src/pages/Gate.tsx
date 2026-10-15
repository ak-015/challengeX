import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RuneWatermark } from '@/components/art/RuneWatermark';
import { AuthWindow } from '@/components/auth/AuthWindow';
import { Embers } from '@/components/scenes/Embers';
import { GateScene, gateCineClass, type GatePhase } from '@/components/scenes/GateScene';
import { SceneBackdrop } from '@/components/scenes/SceneBackdrop';
import { Icon } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useHealthWake } from '@/hooks/useHealthWake';
import { useMedia, useReducedMotion } from '@/hooks/useMedia';
import { playGateSound, type GateSound } from '@/lib/audio';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';
import { useFx } from '@/store/sceneFxStore';
import { usePrefs } from '@/store/prefsStore';

/* Cinematic timeline (ms from the ENTER click):
   activating 1200 -> opening 2600 (doors swing) -> open 700 (hold) -> transitioning
   (smoke covers the swap, navigate mid-cover). Total ~4.9 s. */
const T_ACTIVATE = 1200;
const T_OPEN = 2600;
const T_HOLD = 700;

export function Component() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuth((s) => s.token);
  const { gateMode, setGateMode, alwaysSkip, setAlwaysSkip, muted, toggleMuted } = usePrefs();
  const reduced = useReducedMotion();
  const portrait = useMedia('(max-width: 639px)');
  const { waking } = useHealthWake();

  const [view, setView] = useState<'gate' | 'auth'>(alwaysSkip && !token ? 'auth' : 'gate');
  const [phase, setPhase] = useState<GatePhase>(reduced ? 'idle' : 'awakening');
  const [flash, setFlash] = useState(false);
  const timers = useRef<number[]>([]);
  const sound = useRef<GateSound | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const goRealm = useCallback(() => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== '/' ? from : '/realm', { replace: true, state: { fromGate: true } });
  }, [navigate, location.state]);

  // "Always skip" + already signed in: straight to the realm.
  useEffect(() => {
    if (alwaysSkip && token) goRealm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      sound.current?.stop();
    },
    [],
  );

  // Phase A: awakening -> idle (the CSS transitions do the ~1.8 s reveal).
  useEffect(() => {
    if (view !== 'gate' || reduced || phase !== 'awakening') return;
    const t = window.setTimeout(() => setPhase('idle'), 80);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, [view, reduced, phase]);

  const reveal = useCallback(() => {
    clearTimers();
    if (useAuth.getState().token) goRealm();
    else {
      setView('auth');
      setPhase('idle');
      setFlash(false);
    }
  }, [goRealm]);

  const enter = () => {
    // single trigger: ignore duplicate clicks once the sequence has started
    if (phase !== 'idle' && phase !== 'awakening') return;
    if (reduced) {
      setFlash(true); // reduced motion: red flash + crossfade
      timers.current.push(window.setTimeout(reveal, 380));
      return;
    }
    setPhase('activating');
    sound.current = playGateSound(gateMode); // created inside the click
    timers.current.push(
      window.setTimeout(() => setPhase('opening'), T_ACTIVATE),
      window.setTimeout(() => setPhase('open'), T_ACTIVATE + T_OPEN),
      window.setTimeout(() => {
        setPhase('transitioning');
        useFx.getState().playSmoke();
      }, T_ACTIVATE + T_OPEN + T_HOLD),
      window.setTimeout(reveal, T_ACTIVATE + T_OPEN + T_HOLD + 400), // next screen mounts mid-cover
      window.setTimeout(() => {
        sound.current?.stop();
        sound.current = null;
      }, T_ACTIVATE + T_OPEN + T_HOLD + 900),
    );
  };

  const skip = () => {
    sound.current?.fadeOut(250);
    sound.current = null;
    clearTimers();
    reveal();
  };

  useEffect(() => {
    if (view !== 'gate') return;
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && phase !== 'idle' && phase !== 'awakening' && skip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, phase]);

  if (view === 'auth') {
    return (
      <div className="relative min-h-[100dvh] overflow-x-clip">
        <SceneBackdrop scene="dim" />
        {/* cinematic gate backdrop for the authentication experience (PDF pp. 2–3) */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
          <div className="cc-hero absolute inset-0 opacity-70" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(110% 90% at 50% 45%, rgba(7,5,6,0.35) 30%, rgba(7,5,6,0.92) 100%)' }} />
        </div>
        <RuneWatermark />
        <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-4">
          <AuthWindow onAuthed={goRealm} />
          {alwaysSkip && (
            <button type="button" className="min-h-[44px] font-label text-sm text-ash-dim underline" onClick={() => (setAlwaysSkip(false), setView('gate'))}>
              Show the gate again
            </button>
          )}
        </main>
      </div>
    );
  }

  const running = phase !== 'idle' && phase !== 'awakening';

  const seg = (value: 'gate' | 'smoke', label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={gateMode === value}
      disabled={running}
      onClick={() => setGateMode(value)}
      className={cn('min-h-[44px] rounded px-3 font-label text-xs font-bold uppercase tracking-wider sm:text-sm', gateMode === value ? 'bg-crimson-btn text-white' : 'text-ash hover:bg-[rgba(229,9,32,0.2)]')}
    >
      {label}
    </button>
  );

  const status = waking && !running
    ? 'The realm is waking…'
    : phase === 'activating'
      ? 'The seal is breaking…'
      : phase === 'opening' || phase === 'open' || phase === 'transitioning'
        ? 'The gates are opening…'
        : 'The realm is awakening…';

  return (
    <div className={cn('fixed inset-0 overflow-hidden bg-void', gateCineClass(phase))}>
      <GateScene layout={portrait ? 'portrait' : 'landscape'} phase={phase} mode={gateMode} />
      <Embers density={portrait ? 0.6 : 1} />

      {/* controls */}
      <div className="safe-pad absolute inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div role="radiogroup" aria-label="Transition style" className="flex gap-1 rounded-md border border-[rgba(229,9,32,0.6)] bg-[rgba(7,5,6,0.85)] p-1">
          {seg('gate', 'Gate Opens')}
          {seg('smoke', 'Smoke Mode')}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[rgba(229,9,32,0.6)] bg-[rgba(7,5,6,0.85)] p-1">
          <button type="button" className="min-h-[44px] rounded px-3 font-label text-xs font-bold uppercase tracking-wider text-ash hover:bg-[rgba(229,9,32,0.2)] sm:text-sm" onClick={skip}>
            Skip intro
          </button>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 px-2 font-label text-xs text-ash sm:text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#c41423]" checked={alwaysSkip} onChange={(e) => setAlwaysSkip(e.target.checked)} />
            Always skip
          </label>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded text-ash hover:bg-[rgba(229,9,32,0.2)]" aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'} onClick={toggleMuted}>
            <Icon name={muted ? 'mute' : 'sound'} />
          </button>
        </div>
      </div>

      {/* entry panel (fades on the scene timeline via .cine-panel) */}
      <div
        className="cine-panel safe-pad absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        aria-hidden={running || flash || undefined}
      >
        <div className="plaque w-full max-w-xl px-5 py-4 text-center sm:px-8 sm:py-5">
          <h1 className="font-display text-2xl font-bold tracking-[0.12em] text-ash sm:text-4xl">
            Challenge<span className="text-crimson-text">X</span>
          </h1>
          <p className="mt-2 font-prose text-sm font-semibold uppercase tracking-[0.14em] text-ash-dim sm:text-lg">Challenge your idea. Prove it. Build it.</p>
          <p className="mt-1 font-label text-xs tracking-[0.25em] text-ash-faint sm:text-sm">Enter the Realm of Ideas</p>
          <button type="button" className="btn mt-4 w-full sm:w-auto sm:px-10" onClick={enter} disabled={running || flash}>
            Enter the Realm
          </button>
          <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] font-label text-xs uppercase tracking-wider text-ash-dim sm:text-sm">
            {status}
          </p>
        </div>
      </div>

      {flash && <div className="gate-flash" aria-hidden="true" />}
    </div>
  );
}