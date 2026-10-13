import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { RuneWatermark } from '@/components/art/RuneWatermark';
import { AuthWindow } from '@/components/auth/AuthWindow';
import { ArtDefs } from '@/components/scenes/art';
import { Embers } from '@/components/scenes/Embers';
import { GateScene } from '@/components/scenes/GateScene';
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
  const [go, setGo] = useState(false);
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

  const reveal = useCallback(() => {
    clearTimers();
    if (useAuth.getState().token) goRealm();
    else {
      setView('auth');
      setGo(false);
      setFlash(false);
    }
  }, [goRealm]);

  const enter = () => {
    if (go || flash) return;
    if (reduced) {
      setFlash(true); // reduced motion: red flash + crossfade
      timers.current.push(window.setTimeout(reveal, 380));
      return;
    }
    setGo(true);
    sound.current = playGateSound(gateMode); // created inside the click
    timers.current.push(
      window.setTimeout(() => useFx.getState().playSmoke(), 1400), // smoke thickens 1.4 -> 2.0 s, fades 2.0 -> 2.5 s
      window.setTimeout(reveal, 2000), // next screen mounts underneath at ~2.0 s
      window.setTimeout(() => {
        sound.current?.stop();
        sound.current = null;
      }, 2900),
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && go && skip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, go]);

  if (view === 'auth') {
    return (
      <div className="relative min-h-[100dvh] overflow-x-clip">
        <SceneBackdrop scene="dim" />
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

  const seg = (value: 'gate' | 'smoke', label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={gateMode === value}
      disabled={go}
      onClick={() => setGateMode(value)}
      className={cn('min-h-[44px] rounded px-3 font-label text-xs font-bold uppercase tracking-wider sm:text-sm', gateMode === value ? 'bg-crimson-btn text-white' : 'text-ash hover:bg-[rgba(225,29,46,0.2)]')}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <ArtDefs />
      <GateScene layout={portrait ? 'portrait' : 'landscape'} go={go} mode={gateMode} />
      <Embers density={1} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 95% at 50% 45%, transparent 52%, rgba(0,0,0,0.85) 100%)' }} />

      {/* controls */}
      <div className="safe-pad absolute inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div role="radiogroup" aria-label="Transition style" className="flex gap-1 rounded-md border border-[rgba(225,29,46,0.6)] bg-[rgba(5,5,5,0.85)] p-1">
          {seg('gate', 'Gate Opens')}
          {seg('smoke', 'Smoke Mode')}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[rgba(225,29,46,0.6)] bg-[rgba(5,5,5,0.85)] p-1">
          <button type="button" className="min-h-[44px] rounded px-3 font-label text-xs font-bold uppercase tracking-wider text-ash hover:bg-[rgba(225,29,46,0.2)] sm:text-sm" onClick={skip}>
            Skip intro
          </button>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 px-2 font-label text-xs text-ash sm:text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#c41423]" checked={alwaysSkip} onChange={(e) => setAlwaysSkip(e.target.checked)} />
            Always skip
          </label>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded text-ash hover:bg-[rgba(225,29,46,0.2)]" aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'} onClick={toggleMuted}>
            <Icon name={muted ? 'mute' : 'sound'} />
          </button>
        </div>
      </div>

      {/* engraved plaque */}
      <m.div
        className="safe-pad absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        animate={{ opacity: go || flash ? 0 : 1, y: go ? 24 : 0 }}
        transition={{ duration: 0.4 }}
        aria-hidden={go || undefined}
      >
        <div className="plaque w-full max-w-xl px-5 py-4 text-center sm:px-8 sm:py-5">
          <h1 className="font-display text-2xl font-bold tracking-[0.12em] engraved sm:text-4xl">ChallengeX</h1>
          <p className="engraved mt-2 font-label text-sm font-semibold tracking-wide sm:text-lg">Challenge your idea. Prove it. Build it.</p>
          <p className="engraved mt-1 font-label text-xs tracking-[0.25em] sm:text-sm">Enter the Realm of Ideas</p>
          <button type="button" className="btn mt-4 w-full sm:w-auto sm:px-10" onClick={enter} disabled={go || flash}>
            Enter the Realm
          </button>
          <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] font-label text-xs text-ash-dim sm:text-sm">
            {waking ? 'The realm is waking…' : ''}
          </p>
        </div>
      </m.div>

      {flash && <div className="gate-flash" aria-hidden="true" />}
    </div>
  );
}
