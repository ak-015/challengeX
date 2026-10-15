import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { RoadmapInput, RoadmapSource } from '@/lib/apiTypes';
import { MAX_IDEA_CHARS, MIN_IDEA_CHARS } from '@/lib/constants';
import { roadmaps } from '@/lib/endpoints';
import { friendlyMessage, isAbort, isRetryable } from '@/lib/errors';
import { cn } from '@/lib/cn';

/** Steps from the design reference. Step 4 ("Your Roadmap") is the generated view. */
const STEPS = ['Idea Details', 'Roadmap Settings', 'Generate'] as const;

const ROADMAP_TYPES = [
  { id: 'startup', label: 'Startup Roadmap', blurb: 'From idea to MVP and launch', icon: 'flame' as IconName },
  { id: 'technical', label: 'Technical Roadmap', blurb: 'Development focused', icon: 'gear' as IconName },
  { id: 'business', label: 'Business Roadmap', blurb: 'Market, growth and revenue', icon: 'chart' as IconName },
  { id: 'learning', label: 'Learning Roadmap', blurb: 'Skills and knowledge path', icon: 'bulb' as IconName },
];

const TIMELINES = ['1 Month', '3 Months', '6 Months', '12 Months'];
const EXPERIENCES = ['Beginner', 'Intermediate', 'Advanced'];
const BUDGETS = ['Under $100', '$100 – $1,000', '$1,000 – $10,000', 'Over $10,000'];
const TEAM_SIZES = ['Solo', '2 – 5', '6 – 12', '12+'];

export function Component() {
  useDocumentTitle('Get Roadmap');
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as { trialId?: string } | null)?.trialId;

  const [step, setStep] = useState(0);
  const [sources, setSources] = useState<RoadmapSource[] | null>(null);
  const [trialId, setTrialId] = useState<string | undefined>(preselected);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [type, setType] = useState<string>('startup');
  const [f, setF] = useState({ timeline: '', experience: '', budget: '', team: '', techStack: '', marketing: '', platform: '', extra: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const busyRef = useRef(false);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController();
    roadmaps
      .sources({ signal: c.signal })
      .then((r) => setSources(r.items))
      .catch((e) => !isAbort(e) && setSources([]));
    return () => c.abort();
  }, []);
  useEffect(() => () => ctrl.current?.abort(), []);

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  // Compose title + description into the single ideaText the API expects.
  const ideaText = [ideaTitle.trim(), ideaDesc.trim()].filter(Boolean).join('\n\n');
  const ideaOk = !!trialId || (ideaText.length >= MIN_IDEA_CHARS && ideaText.length <= MAX_IDEA_CHARS);

  const submit = async () => {
    if (busyRef.current) return;
    if (!ideaOk) {
      setStep(0);
      setTouched(true);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    ctrl.current = new AbortController();
    const body: RoadmapInput = { ...(trialId ? { trialId } : { ideaText }) };
    // Roadmap type + experience level have no dedicated server fields; they travel inside `extra`.
    const notes = [`Roadmap type: ${ROADMAP_TYPES.find((t) => t.id === type)?.label ?? 'Startup'}.`, f.experience && `Experience level: ${f.experience}.`, f.extra.trim()].filter(Boolean).join(' ');
    for (const [k, v] of Object.entries({ ...f, experience: '', extra: notes.slice(0, 600) })) if (v.trim()) (body as Record<string, string>)[k] = v.trim(); // empty = "undecided"
    try {
      const r = await roadmaps.create(body, { signal: ctrl.current.signal });
      navigate(`/roadmap/${r.id}`);
    } catch (e) {
      if (!isAbort(e)) setError({ msg: friendlyMessage(e), retry: isRetryable(e) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const undecided = (...keys: (keyof typeof f)[]) => (
    <Button type="button" variant="quiet" onClick={() => keys.forEach((k) => set(k, ''))}>
      I haven’t decided
    </Button>
  );

  const SectionHead = ({ n, title, hint }: { n: number; title: string; hint?: string }) => (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-crimson bg-[rgba(142,24,36,0.45)] font-display text-sm font-bold text-crimson-text">{n}</span>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ash">{title}</h2>
        {hint && <p className="mt-0.5 font-prose text-base text-ash-dim">{hint}</p>}
      </div>
    </div>
  );

  const body = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <section aria-labelledby="rm-s1" className="space-y-3">
              <div id="rm-s1">
                <SectionHead n={1} title="Your Idea" hint="Enter the core details of your vision." />
              </div>
              {sources === null ? (
                <p role="status" className="flex items-center gap-2 text-ash-dim">
                  <Spinner size={16} /> Looking for your surviving ideas…
                </p>
              ) : sources.length > 0 ? (
                <fieldset className="space-y-2">
                  <legend className="mb-1 font-label text-sm font-semibold text-ash">Pick a trial that survived (BUILD or PIVOT)</legend>
                  <div role="radiogroup" className="space-y-2">
                    {sources.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={trialId === s.id}
                        onClick={() => setTrialId(trialId === s.id ? undefined : s.id)}
                        className={cn('flex min-h-[56px] w-full items-center justify-between gap-3 rounded-md border p-3 text-left', trialId === s.id ? 'border-crimson-text bg-[rgba(142,24,36,0.3)]' : 'border-[rgba(73,32,36,0.9)] bg-black/35')}
                      >
                        <span className="min-w-0 truncate font-label text-ash">{s.title}</span>
                        <span className="flex shrink-0 items-center gap-2 font-label text-xs text-ash">
                          <VerdictBadge verdict={s.verdict} size="sm" /> {s.totalScore}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p className="font-prose text-ash-dim">No surviving trials yet. Describe an idea below, or challenge one first.</p>
              )}
              {!trialId && (
                <div className="space-y-4">
                  <TextField
                    label="Idea Title"
                    value={ideaTitle}
                    onChange={(e) => setIdeaTitle(e.target.value)}
                    onBlur={() => setTouched(true)}
                    maxLength={120}
                    placeholder="Give your idea a short and clear title…"
                  />
                  <TextAreaField
                    label="Idea Description"
                    rows={5}
                    value={ideaDesc}
                    onChange={(e) => setIdeaDesc(e.target.value)}
                    onBlur={() => setTouched(true)}
                    counter={{ value: ideaDesc.length, max: MAX_IDEA_CHARS }}
                    error={touched && !ideaOk ? `Describe it in at least ${MIN_IDEA_CHARS} characters.` : null}
                    placeholder="Explain your idea in detail. What problem does it solve? Who is it for? What makes it unique?"
                  />
                </div>
              )}
            </section>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <section aria-labelledby="rm-s2" className="space-y-3">
              <div id="rm-s2">
                <SectionHead n={2} title="Select Roadmap Type" hint="Choose the type of roadmap you need." />
              </div>
              <div role="radiogroup" aria-label="Roadmap type" className="grid gap-2 sm:grid-cols-2">
                {ROADMAP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={type === t.id}
                    onClick={() => setType(t.id)}
                    className={cn(
                      'relative flex min-h-[88px] items-start gap-3 rounded-md border p-3 text-left',
                      type === t.id ? 'border-crimson-text bg-[rgba(142,24,36,0.28)] shadow-glow' : 'border-[rgba(73,32,36,0.9)] bg-black/35 hover:border-crimson',
                    )}
                  >
                    {type === t.id && (
                      <span aria-hidden="true" className="absolute right-2 top-2 text-crimson-text">
                        <Icon name="check" size={16} />
                      </span>
                    )}
                    <Icon name={t.icon} size={22} className="mt-0.5 shrink-0 text-crimson-text" />
                    <span>
                      <span className="block font-display text-sm font-bold uppercase tracking-wide text-ash">{t.label}</span>
                      <span className="mt-0.5 block font-prose text-base text-ash-dim">{t.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="rm-s3" className="space-y-4">
              <div id="rm-s3">
                <SectionHead n={3} title="Additional Preferences" hint="Customize your roadmap based on your needs." />
                <p className="ml-11 font-label text-[0.66rem] uppercase tracking-[0.2em] text-ash-faint">Optional</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Target Timeline" value={f.timeline} onChange={(e) => set('timeline', e.target.value)}>
                  <option value="">e.g. 3 Months</option>
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Experience Level" value={f.experience} onChange={(e) => set('experience', e.target.value)}>
                  <option value="">Not sure</option>
                  {EXPERIENCES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Budget Range" value={f.budget} onChange={(e) => set('budget', e.target.value)}>
                  <option value="">Select budget</option>
                  {BUDGETS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Team Size" value={f.team} onChange={(e) => set('team', e.target.value)}>
                  <option value="">Not sure</option>
                  {TEAM_SIZES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectField>
              </div>
              {undecided('timeline', 'experience', 'budget', 'team')}
            </section>
          </div>
        );
      default:
        return (
          <div className="space-y-5">
            <section aria-labelledby="rm-s4" className="space-y-4">
              <div id="rm-s4">
                <SectionHead n={4} title="Anything Else? (optional)" hint="Extra detail the forge should know before it builds your map." />
              </div>
              <TextField label="Tech stack" value={f.techStack} onChange={(e) => set('techStack', e.target.value)} maxLength={200} hint="e.g. React + Supabase, or no-code. Not sure? Let the roadmap decide." />
              <TextField label="Marketing technique" value={f.marketing} onChange={(e) => set('marketing', e.target.value)} maxLength={200} hint="e.g. cold outreach, a launch on Product Hunt, partnerships." />
              <TextField label="Platform" value={f.platform} onChange={(e) => set('platform', e.target.value)} maxLength={200} hint="e.g. web app, Android, WhatsApp bot." />
              <TextAreaField label="Notes" rows={3} value={f.extra} onChange={(e) => set('extra', e.target.value)} maxLength={600} />
            </section>
          </div>
        );
    }
  };

  const last = step === STEPS.length - 1;
  return (
    <div className="safe-pad mx-auto flex min-h-[calc(100dvh-56px)] max-w-2xl flex-col justify-center py-6">
      <GlassPanel className="space-y-5 p-5 sm:p-8">
        <div className="text-center">
          <p className="eyebrow mb-2">The Forge</p>
          <Heading level={1}>
            Get <span className="text-crimson-text">Roadmap</span>
          </Heading>
          <div className="rune-divider mt-3" aria-hidden="true">
            <span />
          </div>
          <p className="mx-auto mt-3 max-w-lg font-prose text-lg text-ash-dim">
            Turn your idea into a step-by-step plan. Get a clear roadmap from problem validation to final launch.
          </p>
          {/* Step indicator — step 4 lights up when the roadmap opens. */}
          <ol className="mt-5 flex items-center justify-center gap-0" aria-label="Progress">
            {[...STEPS, 'Your Roadmap'].map((s, i) => (
              <li key={s} className="flex items-center" aria-current={i === step ? 'step' : undefined}>
                {i > 0 && <span aria-hidden="true" className={cn('h-px w-6 sm:w-10', i <= step ? 'bg-crimson' : 'bg-[#4a3a3c]')} />}
                <span className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full border font-display text-xs font-bold transition-colors',
                      i === step ? 'border-crimson-text bg-[rgba(142,24,36,0.4)] text-white shadow-glow' : i < step ? 'border-crimson text-crimson-text' : 'border-[#4a3a3c] text-ash-faint',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn('hidden font-label text-[0.6rem] uppercase tracking-wider sm:block', i === step ? 'text-ash' : 'text-ash-faint')}>{s}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-1 font-label text-xs text-ash-faint">Every choice you skip becomes a decision on the map.</p>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 0) {
              setTouched(true);
              if (!ideaOk) return;
            }
            if (last) void submit();
            else setStep((s) => s + 1);
          }}
          className="space-y-5"
        >
          {body()}
          <div aria-live="polite">
            {busy && (
              <div role="status" className="mx-auto w-full max-w-sm space-y-3">
                <p className="flex items-center justify-center gap-3 font-label text-ash">
                  <Spinner /> Forging your roadmap… this can take up to a minute.
                </p>
                <div role="progressbar" aria-label="Generating roadmap" aria-valuetext="In progress" className="forge-progress">
                  <span className="forge-progress-active" />
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
                {error.msg}
                {error.retry && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void submit()}>
                    <Icon name="retry" size={16} /> Retry
                  </Button>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="quiet" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              {step === 2 && undecided('techStack', 'marketing', 'platform')}
              {last ? (
                <Button type="submit" loading={busy}>
                  Generate Roadmap <Icon name="chevronRight" size={16} />
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
