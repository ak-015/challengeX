import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { RoadmapInput, RoadmapSource } from '@/lib/apiTypes';
import { MAX_IDEA_CHARS, MIN_IDEA_CHARS } from '@/lib/constants';
import { roadmaps } from '@/lib/endpoints';
import { friendlyMessage, isAbort, isRetryable } from '@/lib/errors';
import { cn } from '@/lib/cn';

const STEPS = ['Your idea', 'Tech stack', 'Marketing', 'Team & skills', 'Timeline & budget', 'Platform', 'Anything else'] as const;
const HINT: Record<number, string> = {
  1: 'e.g. React + Supabase, or no-code. Not sure? Let the roadmap decide.',
  2: 'e.g. cold outreach, a launch on Product Hunt, partnerships.',
  3: 'Who is on the team and what can they do?',
  5: 'e.g. web app, Android, WhatsApp bot.',
};

export function Component() {
  useDocumentTitle('Get Roadmap');
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as { trialId?: string } | null)?.trialId;

  const [step, setStep] = useState(0);
  const [sources, setSources] = useState<RoadmapSource[] | null>(null);
  const [trialId, setTrialId] = useState<string | undefined>(preselected);
  const [ideaText, setIdeaText] = useState('');
  const [f, setF] = useState({ techStack: '', marketing: '', team: '', timeline: '', budget: '', platform: '', extra: '' });
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
  const ideaOk = !!trialId || (ideaText.trim().length >= MIN_IDEA_CHARS && ideaText.length <= MAX_IDEA_CHARS);

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
    const body: RoadmapInput = { ...(trialId ? { trialId } : { ideaText: ideaText.trim() }) };
    for (const [k, v] of Object.entries(f)) if (v.trim()) (body as Record<string, string>)[k] = v.trim(); // empty = "undecided"
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
    <Button type="button" variant="quiet" onClick={() => (keys.forEach((k) => set(k, '')), setStep((s) => s + 1))}>
      I haven’t decided
    </Button>
  );

  const body = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            {sources === null ? (
              <p role="status" className="flex items-center gap-2 text-ash-dim"><Spinner size={16} /> Looking for your surviving ideas…</p>
            ) : sources.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="mb-1 font-label text-sm font-semibold text-ash">Pick a trial that survived (BUILD or PIVOT)</legend>
                <div role="radiogroup" className="space-y-2">
                  {sources.map((s) => (
                    <button key={s.id} type="button" role="radio" aria-checked={trialId === s.id} onClick={() => setTrialId(trialId === s.id ? undefined : s.id)} className={cn('flex min-h-[56px] w-full items-center justify-between gap-3 rounded-md border p-3 text-left', trialId === s.id ? 'border-crimson-text bg-[rgba(196,20,35,0.3)]' : 'border-[rgba(185,176,168,0.4)] bg-black/35')}>
                      <span className="min-w-0 truncate font-label text-ash">{s.title}</span>
                      <span className="flex shrink-0 items-center gap-2 font-label text-xs text-ash"><VerdictBadge verdict={s.verdict} size="sm" /> {s.totalScore}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="font-prose text-ash-dim">No surviving trials yet. Describe an idea below, or challenge one first.</p>
            )}
            {!trialId && (
              <TextAreaField label="…or describe an idea" rows={4} value={ideaText} onChange={(e) => setIdeaText(e.target.value)} counter={{ value: ideaText.length, max: MAX_IDEA_CHARS }} error={touched && !ideaOk ? `Describe it in at least ${MIN_IDEA_CHARS} characters.` : null} />
            )}
          </div>
        );
      case 1:
        return <TextField label="Tech stack" value={f.techStack} onChange={(e) => set('techStack', e.target.value)} maxLength={200} hint={HINT[1]} />;
      case 2:
        return <TextField label="Marketing technique" value={f.marketing} onChange={(e) => set('marketing', e.target.value)} maxLength={200} hint={HINT[2]} />;
      case 3:
        return <TextField label="Team and skills" value={f.team} onChange={(e) => set('team', e.target.value)} maxLength={200} hint={HINT[3]} />;
      case 4:
        return (
          <div className="space-y-4">
            <TextField label="Timeline" value={f.timeline} onChange={(e) => set('timeline', e.target.value)} maxLength={200} placeholder="e.g. a prototype in 6 weeks" />
            <TextField label="Budget" value={f.budget} onChange={(e) => set('budget', e.target.value)} maxLength={200} placeholder="e.g. under $200" />
          </div>
        );
      case 5:
        return <TextField label="Platform" value={f.platform} onChange={(e) => set('platform', e.target.value)} maxLength={200} hint={HINT[5]} />;
      default:
        return <TextAreaField label="Anything else the roadmap should know?" rows={4} value={f.extra} onChange={(e) => set('extra', e.target.value)} maxLength={600} />;
    }
  };

  const last = step === STEPS.length - 1;
  return (
    <div className="safe-pad mx-auto flex min-h-[calc(100dvh-56px)] max-w-2xl flex-col justify-center py-6">
      <GlassPanel className="space-y-5 p-5 sm:p-8">
        <div className="text-center">
          <Heading level={2}>{STEPS[step] ?? ''}</Heading>
          <p className="mt-1 font-label text-xs text-ash-dim">Step {step + 1} of {STEPS.length}. Every choice you skip becomes a decision on the map.</p>
          <ol className="mt-3 flex justify-center gap-2" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined}>
                <span className={cn('block h-2.5 rounded-full transition-all', i === step ? 'w-8 bg-crimson-text' : i < step ? 'w-2.5 bg-crimson' : 'w-2.5 bg-[#4a3a3c]')} />
                <span className="sr-only">{s}</span>
              </li>
            ))}
          </ol>
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
                <p className="flex items-center justify-center gap-3 font-label text-ash"><Spinner /> Forging your roadmap… this can take up to a minute.</p>
                <div role="progressbar" aria-label="Generating roadmap" aria-valuetext="In progress" className="forge-progress">
                  <span className="forge-progress-active" />
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
                {error.msg}
                {error.retry && <Button type="button" size="sm" variant="ghost" onClick={() => void submit()}><Icon name="retry" size={16} /> Retry</Button>}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="quiet" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>Back</Button>
            <div className="flex flex-wrap justify-end gap-2">
              {step === 1 && undecided('techStack')}
              {step === 2 && undecided('marketing')}
              {step === 3 && undecided('team')}
              {step === 4 && undecided('timeline', 'budget')}
              {step === 5 && undecided('platform')}
              {last ? (
                <Button type="submit" loading={busy}>Forge the Roadmap</Button>
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
