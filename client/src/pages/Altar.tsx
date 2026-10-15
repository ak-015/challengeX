import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useMedia';
import { DEFAULT_MODE, MAX_IDEA_CHARS, MIN_IDEA_CHARS, MODES, MODE_KEYS, type ModeKey } from '@/lib/constants';
import { trials } from '@/lib/endpoints';
import { cn } from '@/lib/cn';
import { friendlyMessage, isAbort, isRetryable } from '@/lib/errors';
import { useFx, type AltarPhase } from '@/store/sceneFxStore';

/** Optional idea categories (purely descriptive — folded into the idea text sent to the API). */
const IDEA_CATEGORIES = ['Business', 'Technology', 'Education', 'Health', 'Sustainability', 'Agriculture', 'Finance', 'E-commerce', 'Social Impact', 'Other'] as const;

interface AltarState {
  intro?: boolean;
  idea?: string;
  mode?: ModeKey;
}

const SEQUENCE: Array<[number, AltarPhase]> = [
  [0, 'rising'],
  [500, 'steps'],
  [1100, 'ignite'],
  [1300, 'beam'],
  [1600, 'done'],
];

/** "Challenge This" passes one text blob (title: oneLiner Problem: … Target users: …). Split it back apart. */
function splitIdea(text: string): { title: string; description: string } {
  const idx = text.indexOf(': ');
  if (idx > 0 && idx < 80) return { title: text.slice(0, idx), description: text.slice(idx + 2) };
  return { title: '', description: text };
}

export function Component() {
  useDocumentTitle('The Altar');
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as AltarState | null) ?? {};
  const reduced = useReducedMotion();

  const prefill = state.idea ? splitIdea(state.idea) : { title: '', description: '' };
  const [intro, setIntro] = useState(!!state.intro && !reduced);
  const [title, setTitle] = useState(prefill.title);
  const [idea, setIdea] = useState(prefill.description);
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [mode, setMode] = useState<ModeKey>(state.mode && MODE_KEYS.includes(state.mode) ? state.mode : DEFAULT_MODE);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  const busyRef = useRef(false);
  const ctrl = useRef<AbortController | null>(null);

  const finishIntro = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    useFx.getState().setAltarPhase('done');
    setIntro(false);
  }, []);

  useEffect(() => {
    const fx = useFx.getState();
    if (!state.intro || reduced) {
      fx.setAltarPhase('done');
      setIntro(false);
      return;
    }
    // ~1.6 s: dais rises, steps light one by one, the crystal ignites, its beam shoots up, then the panel appears.
    for (const [t, phase] of SEQUENCE) {
      timers.current.push(
        window.setTimeout(() => {
          fx.setAltarPhase(phase);
          if (phase === 'done') setIntro(false);
        }, t + 30),
      );
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      useFx.getState().setAltarPhase('done');
      ctrl.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!intro) return;
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && finishIntro();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [intro, finishIntro]);

  // The API takes ONE idea string (20..2000 chars). Compose the structured fields into it.
  const composed = [title.trim(), idea.trim(), category && `Category: ${category}.`, details.trim() && `Additional details: ${details.trim()}.`].filter(Boolean).join('\n\n');
  const trimmed = composed;
  const tooShort = trimmed.length < MIN_IDEA_CHARS;
  const tooLong = composed.length > MAX_IDEA_CHARS;
  const validation = tooLong
    ? `Keep it under ${MAX_IDEA_CHARS} characters.`
    : tooShort && touched
      ? `Describe your idea in at least ${MIN_IDEA_CHARS} characters (${MIN_IDEA_CHARS - trimmed.length} more).`
      : null;

  const submit = async () => {
    setTouched(true);
    if (busyRef.current || tooShort || tooLong) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    ctrl.current = new AbortController();
    try {
      const t = await trials.create({ idea: trimmed, mode }, { signal: ctrl.current.signal });
      navigate(`/trial/${t.id}`);
    } catch (e) {
      if (!isAbort(e)) setError({ msg: friendlyMessage(e), retry: isRetryable(e) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="safe-pad mx-auto flex min-h-[calc(100dvh-56px)] max-w-3xl flex-col items-center justify-center py-6" onClick={intro ? finishIntro : undefined}>
      {intro && (
        <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center">
          <Button variant="quiet" size="sm" onClick={finishIntro}>
            Skip intro
          </Button>
        </div>
      )}
      {!intro && (
        <m.div className="w-full" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          {/* scroll: rolled rods top and bottom */}
          <div aria-hidden="true" className="mx-auto h-4 w-[96%] rounded-full border border-[#6b4a3a] bg-gradient-to-b from-[#6b4f3f] via-[#2b1d17] to-[#120a08]" />
          <GlassPanel className="-my-1 w-full space-y-5 rounded-none p-5 sm:p-8" aria-labelledby="altar-h">
            <div className="text-center">
              <p className="eyebrow mb-2">The Trial</p>
              <Heading level={2} id="altar-h">
                Challenge My <span className="text-crimson-text">Idea</span>
              </Heading>
              <div className="rune-divider mt-3" aria-hidden="true">
                <span />
              </div>
              <p className="mx-auto mt-3 max-w-lg font-prose text-lg text-ash-dim">
                Put your idea to the test. Face questions, explore risks, and strengthen it before you move forward.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              noValidate
              className="space-y-5"
            >
              <fieldset className="space-y-4" disabled={busy}>
                <legend className="sr-only">Your idea</legend>
                <TextField
                  label="Idea Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched(true)}
                  maxLength={120}
                  placeholder="Give your idea a short and clear title…"
                  autoComplete="off"
                />
                <TextAreaField
                  label="Idea Description"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onBlur={() => setTouched(true)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  rows={6}
                  placeholder="Explain your idea in detail. What problem does it solve? Who is it for? What makes it unique?"
                  counter={{ value: idea.length, max: 1000 }}
                  error={validation}
                  hint="Be concrete: who is it for, and what problem does it solve?"
                />
                <SelectField label="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select a category</option>
                  {IDEA_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectField>
                <TextAreaField
                  label="Additional Details (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Add any extra context, goals, or specific questions you want feedback on…"
                  counter={{ value: details.length, max: 500 }}
                />
              </fieldset>

              <fieldset className="space-y-2" disabled={busy}>
                <legend className="mb-1 font-label text-sm font-semibold tracking-wide text-ash">Intensity</legend>
                <div role="radiogroup" aria-label="Intensity" className="grid gap-2 sm:grid-cols-2">
                  {MODE_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={mode === k}
                      onClick={() => setMode(k)}
                      className={cn(
                        'flex min-h-[64px] items-start gap-3 rounded-md border p-3 text-left',
                        mode === k ? 'border-crimson-text bg-[rgba(142,24,36,0.28)]' : 'border-[rgba(73,32,36,0.9)] bg-[rgba(0,0,0,0.35)] hover:border-crimson',
                        k === 'failure' && 'sm:col-span-2',
                      )}
                    >
                      <span aria-hidden="true" className={cn('mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', mode === k ? 'border-crimson-text bg-crimson-btn text-white' : 'border-ash-mute')}>
                        {mode === k && <Icon name="check" size={12} />}
                      </span>
                      <span>
                        <span className="block font-label text-base font-bold text-ash">{MODES[k].label}</span>
                        <span className="block font-prose text-sm text-ash-dim">{MODES[k].blurb}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div aria-live="polite">
                {busy && <p role="status" className="text-center font-label text-ash">The Challenger is reading your idea…</p>}
                {error && (
                  <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
                    <span>{error.msg}</span>
                    {error.retry && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => void submit()}>
                        <Icon name="retry" size={16} /> Retry
                      </Button>
                    )}
                  </p>
                )}
              </div>

              <div className="text-center">
                <Button type="submit" loading={busy} className="w-full sm:w-auto sm:px-12" disabled={tooLong}>
                  Challenge My Idea <Icon name="chevronRight" size={16} />
                </Button>
              </div>
            </form>
          </GlassPanel>
          <div aria-hidden="true" className="mx-auto h-4 w-[96%] rounded-full border border-[#6b4a3a] bg-gradient-to-b from-[#6b4f3f] via-[#2b1d17] to-[#120a08]" />
        </m.div>
      )}
    </div>
  );
}
