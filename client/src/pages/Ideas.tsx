import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { m } from 'framer-motion';
import { ChipInput } from '@/components/ideas/ChipInput';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Idea } from '@/lib/apiTypes';
import { ideas as ideasApi, trials } from '@/lib/endpoints';
import { friendlyMessage, isAbort, isRetryable } from '@/lib/errors';
import { EXPERIENCE_LEVELS, SUGGESTIONS, buildIdeasPayload, emptyIdeasForm, hasRequired, ideaToChallengeText, type IdeasForm } from '@/lib/ideasForm';
import { safeStorage } from '@/lib/storage';
import { cn } from '@/lib/cn';

const KEY = 'cc.ideas.form.v1';
const STEPS = ['Hobbies & interests', 'Skills', 'Field & problem', 'Who to help', 'Your constraints', 'Goal & extras'] as const;

function loadForm(): IdeasForm {
  try {
    const raw = sessionStorage.getItem(KEY) ?? safeStorage.get(KEY);
    return raw ? { ...emptyIdeasForm, ...(JSON.parse(raw) as Partial<IdeasForm>) } : emptyIdeasForm;
  } catch {
    return emptyIdeasForm;
  }
}

export function Component() {
  useDocumentTitle('Generate a New Idea');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const stored = (location.state as { ideas?: Idea[] } | null)?.ideas;

  const [form, setForm] = useState<IdeasForm>(loadForm);
  const [step, setStep] = useState(0); // 0..5 = steps, 6 = review
  const [results, setResults] = useState<Idea[] | null>(stored ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const [needReq, setNeedReq] = useState(false);
  const busyRef = useRef(false);
  const ctrl = useRef<AbortController | null>(null);

  const set = <K extends keyof IdeasForm>(k: K, v: IdeasForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  // Reopen stored ideas from History: /ideas?id=<sessionId>
  useEffect(() => {
    const id = params.get('id');
    if (!id || stored) return;
    const c = new AbortController();
    trials
      .get(id, { signal: c.signal })
      .then((s) => setResults(s.verdictPayload?.ideas ?? null))
      .catch((e) => !isAbort(e) && setError({ msg: friendlyMessage(e), retry: false }));
    return () => c.abort();
  }, [params, stored]);

  useEffect(() => () => ctrl.current?.abort(), []);

  const generate = async () => {
    if (busyRef.current) return;
    if (!hasRequired(form)) {
      setNeedReq(true);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    ctrl.current = new AbortController();
    try {
      const r = await ideasApi.generate(buildIdeasPayload(form), { signal: ctrl.current.signal });
      setResults(r.ideas); // the old cards stay on screen until this moment
    } catch (e) {
      if (!isAbort(e)) setError({ msg: friendlyMessage(e), retry: isRetryable(e) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const optionalSkip = step < 6 && (
    <Button variant="quiet" onClick={() => setStep((s) => s + 1)}>
      Skip
    </Button>
  );

  const stepBody = () => {
    switch (step) {
      case 0:
        return (
          <>
            <ChipInput label="Hobbies" values={form.hobbies} onChange={(v) => set('hobbies', v)} suggestions={SUGGESTIONS.hobbies} />
            <ChipInput label="Interests" values={form.interests} onChange={(v) => set('interests', v)} suggestions={SUGGESTIONS.interests} />
          </>
        );
      case 1:
        return (
          <>
            <ChipInput label="Skills" values={form.skills} onChange={(v) => set('skills', v)} suggestions={SUGGESTIONS.skills} />
            <div role="radiogroup" aria-label="Experience level" className="space-y-1">
              <p className="font-label text-sm font-semibold text-ash">Experience level</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={form.experience === l} onClick={() => set('experience', form.experience === l ? '' : l)} className={cn('min-h-[44px] rounded-md border px-4 font-label text-sm', form.experience === l ? 'border-crimson-text bg-[rgba(196,20,35,0.35)] text-white' : 'border-[rgba(185,176,168,0.45)] text-ash')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <ChipInput label="Field / industry" values={form.field ? [form.field] : []} onChange={(v) => set('field', v[v.length - 1] ?? '')} suggestions={SUGGESTIONS.field} max={1} hint="Pick one." />
            <TextField label="Problem area (optional)" value={form.problemArea} maxLength={200} onChange={(e) => set('problemArea', e.target.value)} placeholder="e.g. small farmers losing crops to disease" />
          </>
        );
      case 3:
        return (
          <>
            <TextField label="Who do you want to help?" value={form.audience} maxLength={200} onChange={(e) => set('audience', e.target.value)} placeholder="e.g. first-year college students" />
            <TextField label="Region" value={form.region} maxLength={80} onChange={(e) => set('region', e.target.value)} placeholder="e.g. India, rural areas" />
          </>
        );
      case 4:
        return (
          <>
            <TextField label="Team size" value={form.teamSize} maxLength={40} onChange={(e) => set('teamSize', e.target.value)} placeholder="e.g. just me" />
            <TextField label="Hours per week" value={form.hoursPerWeek} maxLength={40} onChange={(e) => set('hoursPerWeek', e.target.value)} placeholder="e.g. 10" />
            <TextField label="Budget" value={form.budget} maxLength={80} onChange={(e) => set('budget', e.target.value)} placeholder="e.g. under $100" />
            <ChipInput label="Platform" values={form.platform ? [form.platform] : []} onChange={(v) => set('platform', v[v.length - 1] ?? '')} suggestions={SUGGESTIONS.platform} max={1} />
          </>
        );
      case 5:
        return (
          <>
            <TextField label="Your goal" value={form.goal} maxLength={200} onChange={(e) => set('goal', e.target.value)} placeholder="e.g. earn side income, win a hackathon" />
            <TextField label="Things to avoid" value={form.avoid} maxLength={300} onChange={(e) => set('avoid', e.target.value)} placeholder="e.g. anything needing a license" />
            <TextField label="Anything else" value={form.extra} maxLength={500} onChange={(e) => set('extra', e.target.value)} />
          </>
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------- results
  if (results) {
    return (
      <div className="safe-pad mx-auto max-w-5xl space-y-6 py-6">
        <div className="text-center">
          <Heading level={1}>Three sparks</Heading>
          <p className="mt-2 font-prose text-ash-dim">Saved to your history. Challenge the one that calls to you.</p>
        </div>
        <ul className="grid gap-4 lg:grid-cols-3" aria-busy={busy}>
          {results.map((idea, i) => (
            <m.li key={`${idea.title}-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: busy ? 0.55 : 1, y: 0 }} transition={{ delay: i * 0.12 }}>
              <GlassPanel className="flex h-full flex-col gap-3 p-5">
                <h2 className="font-display text-xl font-bold text-ash">{idea.title}</h2>
                <p className="font-label text-sm text-crimson-text">{idea.oneLiner}</p>
                {([['Problem', idea.problem], ['Target users', idea.targetUsers], ['Why you fit', idea.whyYouFit], ['First step', idea.firstStep], ['Main risk', idea.mainRisk]] as const).map(([k, v]) => (
                  <div key={k}>
                    <p className="font-label text-xs uppercase tracking-wider text-ash-dim">{k}</p>
                    <p className="font-prose text-sm text-ash">{v}</p>
                  </div>
                ))}
                <div className="mt-auto pt-2">
                  <Button className="w-full" onClick={() => navigate('/altar', { state: { idea: ideaToChallengeText(idea) } })}>
                    <Icon name="sword" size={16} /> Challenge This
                  </Button>
                </div>
              </GlassPanel>
            </m.li>
          ))}
        </ul>
        <div aria-live="polite" className="text-center">
          {busy && <p role="status" className="inline-flex items-center gap-3 font-label text-ash"><Spinner /> Sparking ideas…</p>}
          {error && (
            <p role="alert" className="inline-flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
              {error.msg}
              {error.retry && <Button size="sm" variant="ghost" onClick={() => void generate()}>Retry</Button>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="ghost" onClick={() => void generate()} loading={busy}>
            <Icon name="retry" size={16} /> Regenerate
          </Button>
          <Button variant="quiet" onClick={() => (setResults(null), setStep(6))}>
            Edit my answers
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- form
  const review = step === 6;
  const summary: [string, string, number][] = [
    ['Hobbies', form.hobbies.join(', '), 0], ['Interests', form.interests.join(', '), 0], ['Skills', form.skills.join(', '), 1], ['Experience', form.experience, 1],
    ['Field', form.field, 2], ['Problem area', form.problemArea, 2], ['Audience', form.audience, 3], ['Region', form.region, 3],
    ['Team size', form.teamSize, 4], ['Hours / week', form.hoursPerWeek, 4], ['Budget', form.budget, 4], ['Platform', form.platform, 4],
    ['Goal', form.goal, 5], ['Avoid', form.avoid, 5], ['Extra', form.extra, 5],
  ];

  return (
    <div className="safe-pad mx-auto flex min-h-[calc(100dvh-56px)] max-w-2xl flex-col justify-center py-6">
      <GlassPanel className="space-y-5 p-5 sm:p-8">
        <div className="text-center">
          <Heading level={2}>{review ? 'Review your answers' : STEPS[step] ?? ''}</Heading>
          <ol className="mt-3 flex justify-center gap-2" aria-label="Progress">
            {[...STEPS, 'Review'].map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined}>
                <span className={cn('block h-2.5 rounded-full transition-all', i === step ? 'w-8 bg-crimson-text' : i < step ? 'w-2.5 bg-crimson' : 'w-2.5 bg-[#4a3a3c]')} />
                <span className="sr-only">
                  Step {i + 1}: {s}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (review) void generate();
            else setStep((s) => s + 1);
          }}
          className="space-y-5"
          noValidate
        >
          {review ? (
            <div className="space-y-2">
              {summary.map(([k, v, s]) =>
                v ? (
                  <div key={k} className="flex items-start justify-between gap-3 border-b border-[rgba(185,176,168,0.2)] pb-2">
                    <div className="min-w-0">
                      <p className="font-label text-xs uppercase tracking-wider text-ash-dim">{k}</p>
                      <p className="break-words font-prose text-ash">{v}</p>
                    </div>
                    <button type="button" className="min-h-[44px] shrink-0 px-2 font-label text-xs text-crimson-text underline" onClick={() => setStep(s)} aria-label={`Edit ${k}`}>
                      Edit
                    </button>
                  </div>
                ) : null,
              )}
              {needReq && !hasRequired(form) && (
                <p role="alert" className="rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
                  Add at least one hobby, interest, skill or a field so the Challenger has something to work with.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">{stepBody()}</div>
          )}

          <div aria-live="polite">
            {busy && <p role="status" className="flex items-center justify-center gap-3 font-label text-ash"><Spinner /> Sparking ideas…</p>}
            {error && (
              <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
                {error.msg}
                {error.retry && <Button type="button" size="sm" variant="ghost" onClick={() => void generate()}>Retry</Button>}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="quiet" disabled={step === 0 || busy} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
            <div className="flex gap-2">
              {optionalSkip}
              {review ? (
                <Button type="submit" loading={busy}>
                  Awaken the Mind
                </Button>
              ) : (
                <Button type="submit">Next</Button>
              )}
            </div>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
