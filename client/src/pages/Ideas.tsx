import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { m } from 'framer-motion';
import { ChipInput } from '@/components/ideas/ChipInput';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Fields';
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

/** Interest chips from the design reference. */
const INTEREST_CHIPS = ['Technology', 'Sustainability', 'Education', 'Health', 'Biology', 'Business', 'Creative', 'Research', 'Other'] as const;
/** Problem-focus chips from the design reference. */
const FOCUS_CHIPS = ['Real World Problems', 'Student Challenges', 'Industry Problems', 'Community Impact', 'Future Opportunities', 'Open Innovation'] as const;
/** Displayed-idea counts. The server forges exactly 3 ideas per summon (see backend schemas.ts),
 *  so these options only offer honest slices of the real result. */
const COUNTS = [1, 2, 3] as const;

function loadForm(): IdeasForm {
  try {
    const raw = sessionStorage.getItem(KEY) ?? safeStorage.get(KEY);
    return raw ? { ...emptyIdeasForm, ...(JSON.parse(raw) as Partial<IdeasForm>) } : emptyIdeasForm;
  } catch {
    return emptyIdeasForm;
  }
}

/** Toggle an item in a string array. */
function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className="chip" aria-pressed={selected} data-selected={selected || undefined} onClick={onClick}>
      {selected && <Icon name="check" size={13} />}
      {label}
    </button>
  );
}

function SectionHead({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-crimson bg-[rgba(142,24,36,0.45)] font-display text-sm font-bold text-crimson-text">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ash">{title}</h2>
        <p className="mt-0.5 font-prose text-base text-ash-dim">{hint}</p>
      </div>
    </div>
  );
}

export function Component() {
  useDocumentTitle('Generate a New Idea');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const stored = (location.state as { ideas?: Idea[] } | null)?.ideas;

  const [form, setForm] = useState<IdeasForm>(loadForm);
  const [showRefine, setShowRefine] = useState(false);
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

  // ---------------------------------------------------------------- results
  if (results) {
    const shown = results.slice(0, Math.max(1, form.count));
    return (
      <div className="safe-pad mx-auto max-w-5xl space-y-6 py-6">
        <div className="text-center">
          <p className="eyebrow mb-2">The Sparks</p>
          <Heading level={1}>
            Your Idea <span className="text-crimson-text">Concepts</span>
          </Heading>
          <div className="rune-divider mt-3" aria-hidden="true">
            <span />
          </div>
          <p className="mx-auto mt-3 max-w-xl font-prose text-lg text-ash-dim">Saved to your history. Challenge the one that calls to you.</p>
        </div>
        <ul className="grid gap-4 lg:grid-cols-3" aria-busy={busy}>
          {shown.map((idea, i) => (
            <m.li key={`${idea.title}-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: busy ? 0.55 : 1, y: 0 }} transition={{ delay: i * 0.12 }}>
              <GlassPanel className="flex h-full flex-col gap-3 p-5">
                <p aria-hidden="true" className="font-fell text-sm text-ash-faint">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="font-display text-xl font-bold text-ash">{idea.title}</h2>
                <p className="font-label text-sm text-crimson-text">{idea.oneLiner}</p>
                {([['Problem', idea.problem], ['Target users', idea.targetUsers], ['Why you fit', idea.whyYouFit], ['First step', idea.firstStep], ['Main risk', idea.mainRisk]] as const).map(([k, v]) => (
                  <div key={k}>
                    <p className="font-label text-xs uppercase tracking-wider text-ash-faint">{k}</p>
                    <p className="font-prose text-base text-ash">{v}</p>
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
          <Button variant="quiet" onClick={() => setResults(null)}>
            Edit my answers
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- form
  return (
    <div className="safe-pad mx-auto max-w-2xl py-6">
      <GlassPanel className="space-y-6 p-5 sm:p-8">
        <div className="text-center">
          <p className="eyebrow mb-2">The Forge</p>
          <Heading level={1}>
            Generate a New <span className="text-crimson-text">Idea</span>
          </Heading>
          <div className="rune-divider mt-3" aria-hidden="true">
            <span />
          </div>
          <p className="mx-auto mt-3 max-w-md font-prose text-lg text-ash-dim">Get fresh, unique, and meaningful idea concepts tailored to your interests.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void generate(); }} className="space-y-7" noValidate>
          {/* 1 — interests */}
          <section aria-labelledby="ideas-s1" className="space-y-3">
            <div id="ideas-s1">
              <SectionHead n={1} title="Your Interests" hint="Select the areas you are interested in (choose multiple)." />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
              {INTEREST_CHIPS.map((c) => (
                <Chip key={c} label={c} selected={form.interests.includes(c)} onClick={() => set('interests', toggle(form.interests, c))} />
              ))}
            </div>
            <ChipInput
              label="More interests (optional)"
              values={form.interests.filter((v) => !(INTEREST_CHIPS as readonly string[]).includes(v))}
              onChange={(v) => set('interests', v)}
              suggestions={SUGGESTIONS.interests}
              hint="Type your own and press Enter."
            />
          </section>

          {/* 2 — problem focus */}
          <section aria-labelledby="ideas-s2" className="space-y-3">
            <div id="ideas-s2">
              <SectionHead n={2} title="Problem Focus" hint="Select what type of problems you want to solve." />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Problem focus">
              {FOCUS_CHIPS.map((c) => (
                <Chip key={c} label={c} selected={form.focus.includes(c)} onClick={() => set('focus', toggle(form.focus, c))} />
              ))}
            </div>
          </section>

          {/* 3 — additional context */}
          <section aria-labelledby="ideas-s3" className="space-y-3">
            <div id="ideas-s3">
              <SectionHead n={3} title="Additional Context (optional)" hint="Add any specific interests, skills, location, or constraints." />
            </div>
            <TextAreaField
              label="Your context"
              value={form.extra}
              onChange={(e) => set('extra', e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. I am a college student, interested in web development and environmental issues…"
              counter={{ value: form.extra.length, max: 500 }}
            />
          </section>

          {/* 4 — number of ideas */}
          <section aria-labelledby="ideas-s4" className="space-y-3">
            <div id="ideas-s4">
              <SectionHead n={4} title="Number of Ideas" hint="How many of the forged ideas would you like to see? The realm creates three per summon." />
            </div>
            <div role="radiogroup" aria-label="Number of ideas" className="flex flex-wrap gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.count === c}
                  onClick={() => set('count', c)}
                  className={cn(
                    'min-h-[44px] min-w-[64px] rounded-md border px-5 font-display text-base font-bold',
                    form.count === c ? 'border-crimson-text bg-[rgba(142,24,36,0.35)] text-white shadow-glow' : 'border-[rgba(73,32,36,0.9)] bg-black/40 text-ash-dim hover:border-crimson',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
          {/* optional refine — every field from the old wizard stays available */}
          <details
            open={showRefine}
            onToggle={(e) => setShowRefine((e.currentTarget as HTMLDetailsElement).open)}
            className="rounded-md border border-[var(--edge)] bg-black/30 p-4"
          >
            <summary className="min-h-[44px] cursor-pointer font-label text-sm font-bold uppercase tracking-wide text-ash-dim marker:content-none hover:text-ash">
              Refine further (optional)
            </summary>
            <div className="mt-4 space-y-4">
              <ChipInput label="Hobbies" values={form.hobbies} onChange={(v) => set('hobbies', v)} suggestions={SUGGESTIONS.hobbies} />
              <ChipInput label="Skills" values={form.skills} onChange={(v) => set('skills', v)} suggestions={SUGGESTIONS.skills} />
              <div role="radiogroup" aria-label="Experience level" className="space-y-1">
                <p className="font-label text-sm font-semibold text-ash">Experience level</p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={form.experience === l}
                      onClick={() => set('experience', form.experience === l ? '' : l)}
                      className={cn('min-h-[44px] rounded-md border px-4 font-label text-sm', form.experience === l ? 'border-crimson-text bg-[rgba(142,24,36,0.35)] text-white' : 'border-[rgba(73,32,36,0.9)] text-ash')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <ChipInput label="Field / industry" values={form.field ? [form.field] : []} onChange={(v) => set('field', v[v.length - 1] ?? '')} suggestions={SUGGESTIONS.field} max={1} hint="Pick one." />
              <TextField label="Problem area (free text)" value={form.problemArea} maxLength={200} onChange={(e) => set('problemArea', e.target.value)} placeholder="e.g. small farmers losing crops to disease" />
              <TextField label="Who do you want to help?" value={form.audience} maxLength={200} onChange={(e) => set('audience', e.target.value)} placeholder="e.g. first-year college students" />
              <TextField label="Region" value={form.region} maxLength={80} onChange={(e) => set('region', e.target.value)} placeholder="e.g. India, rural areas" />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Team size" value={form.teamSize} maxLength={40} onChange={(e) => set('teamSize', e.target.value)} placeholder="e.g. just me" />
                <TextField label="Hours per week" value={form.hoursPerWeek} maxLength={40} onChange={(e) => set('hoursPerWeek', e.target.value)} placeholder="e.g. 10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Budget" value={form.budget} maxLength={80} onChange={(e) => set('budget', e.target.value)} placeholder="e.g. under $100" />
                <SelectField label="Platform" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                  <option value="">No preference</option>
                  {SUGGESTIONS.platform.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </SelectField>
              </div>
              <TextField label="Your goal" value={form.goal} maxLength={200} onChange={(e) => set('goal', e.target.value)} placeholder="e.g. earn side income, win a hackathon" />
              <TextField label="Things to avoid" value={form.avoid} maxLength={300} onChange={(e) => set('avoid', e.target.value)} placeholder="e.g. anything needing a license" />
            </div>
          </details>

          {needReq && !hasRequired(form) && (
            <p role="alert" className="rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
              Add at least one interest (or a hobby, skill or field under “Refine further”) so the Challenger has something to work with.
            </p>
          )}

          <div aria-live="polite">
            {busy && (
              <p role="status" className="flex items-center justify-center gap-3 font-label text-ash">
                <Spinner /> Sparking ideas…
              </p>
            )}
            {error && (
              <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
                {error.msg}
                {error.retry && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void generate()}>
                    Retry
                  </Button>
                )}
              </p>
            )}
          </div>

          <Button type="submit" loading={busy} className="w-full">
            Generate New Ideas <Icon name="chevronRight" size={16} />
          </Button>
        </form>
      </GlassPanel>
    </div>
  );
}


