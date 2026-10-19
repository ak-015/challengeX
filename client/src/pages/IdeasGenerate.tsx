import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Sparkles, Save } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { ideasService } from '@/services/ideas';
import { Button } from '@/components/ui/Button';
import { Textarea, Input } from '@/components/ui/Form';
import { Embers } from '@/components/animations/Atmosphere';
import type { GenerateIdeasResponse } from '@/types/api';

const INTERESTS = [
  'Technology', 'Sustainability', 'Education', 'Health', 'Biology',
  'Business', 'Creative', 'Research', 'Other',
];

const PROBLEM_AREAS = [
  'Real World Problems', 'Student Challenges', 'Industry Problems',
  'Community Impact', 'Future Opportunities', 'Open Innovation',
];

const MAX_EXTRA = 500;

export function IdeasGeneratePage() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [interests, setInterests] = useState<string[]>([]);
  const [problemArea, setProblemArea] = useState('');
  const [extra, setExtra] = useState('');
  const [field, setField] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateIdeasResponse | null>(null);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const generate = async () => {
    if (interests.length === 0 && !problemArea.trim() && !field.trim()) {
      setError('Pick at least one interest, or describe a field.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Backend schema: at least one of hobbies/interests/skills/field; always returns 3 ideas.
      const res = await ideasService.generate({
        interests,
        problemArea: problemArea || undefined,
        field: field || undefined,
        extra: extra.trim() || undefined,
      });
      setResult(res);
      push('success', 'Three ideas forged.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // "Save" persists nothing new — ideas are already stored by the backend as a session;
  // this navigates to history where they are listed.
  const viewSaved = () => navigate('/history?kind=ideas');

  return (
    <div className="relative mx-auto max-w-3xl">
      <Embers count={8} />
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment">Generate a New Idea</h1>
        <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
          Feed the forge. It will return three distinct concepts shaped by your inputs.
        </p>
      </header>

      <div className="gothic-panel p-6 sm:p-8 space-y-7">
        <fieldset>
          <legend className="text-sm font-heading text-parchment-dim mb-3">Interests <span className="text-crimson-glow">*</span></legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Interest categories">
            {INTERESTS.map((it) => {
              const active = interests.includes(it);
              return (
                <button
                  key={it}
                  type="button"
                  onClick={() => toggle(interests, it, setInterests)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-sm font-heading tracking-wide transition-all ${
                    active
                      ? 'border-[var(--border-visible)] bg-crimson-soft text-parchment shadow-crimson-sm'
                      : 'border-[var(--border-subtle)] text-parchment-dim hover:border-[var(--border-visible)] hover:text-parchment'
                  }`}
                >
                  {active && <span className="mr-1 text-crimson-glow" aria-hidden>✓</span>}
                  {it}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-heading text-parchment-dim mb-3">Problem Focus</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Problem focus categories">
            {PROBLEM_AREAS.map((pa) => {
              const active = problemArea === pa;
              return (
                <button
                  key={pa}
                  type="button"
                  onClick={() => setProblemArea(active ? '' : pa)}
                  role="radio"
                  aria-checked={active}
                  className={`rounded-full border px-4 py-2 text-sm font-heading tracking-wide transition-all ${
                    active
                      ? 'border-[var(--border-visible)] bg-crimson-soft text-parchment shadow-crimson-sm'
                      : 'border-[var(--border-subtle)] text-parchment-dim hover:border-[var(--border-visible)] hover:text-parchment'
                  }`}
                >
                  {pa}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Input
          label="Field / Domain (optional)"
          value={field}
          onChange={(e) => setField(e.target.value)}
          maxLength={100}
          placeholder="e.g. fintech, urban gardening, developer tools"
        />

        <Textarea
          label="Additional Context"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          maxLength={MAX_EXTRA}
          hint={`${extra.length}/${MAX_EXTRA} characters`}
          placeholder="Constraints, audience, budget, anything else the forge should know…"
        />

        {/* The PDF offers idea counts (3/5/10/20) but the backend schema fixes the
            result at exactly 3 ideas. The UI documents that honestly. */}
        <p className="text-xs text-parchment-faint border border-dashed border-[var(--border-subtle)] rounded-md px-3 py-2">
          The backend currently returns exactly <span className="text-parchment-dim">3 ideas</span> per generation
          (its validation schema is fixed at three). Count selection (5 / 10 / 20) is not supported yet — see
          docs/backend-capability-report.md.
        </p>

        {error && (
          <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={generate} loading={busy} className="w-full sm:w-auto">
            <Sparkles className="h-4 w-4" aria-hidden />
            Generate Ideas
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <section className="mt-8 space-y-4" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-parchment">{result.title}</h2>
            <Button variant="ghost" onClick={viewSaved}>
              <Save className="h-4 w-4" aria-hidden /> View Saved
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.ideas.map((idea, i) => (
              <article key={`${result.id}-${i}`} className="gothic-panel p-5 flex flex-col gap-3 hover:shadow-crimson-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base text-parchment leading-snug">{idea.title}</h3>
                  <span className="shrink-0 rounded bg-crimson-soft p-1.5 text-crimson-glow">
                    <Lightbulb className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <p className="font-narrative text-sm text-parchment-dim italic">{idea.oneLiner}</p>
                <dl className="mt-auto space-y-2 text-xs">
                  <div><dt className="font-heading uppercase tracking-widest text-parchment-faint">Problem</dt><dd className="text-parchment-dim mt-0.5">{idea.problem}</dd></div>
                  <div><dt className="font-heading uppercase tracking-widest text-parchment-faint">Target Users</dt><dd className="text-parchment-dim mt-0.5">{idea.targetUsers}</dd></div>
                  <div><dt className="font-heading uppercase tracking-widest text-parchment-faint">Why You Fit</dt><dd className="text-parchment-dim mt-0.5">{idea.whyYouFit}</dd></div>
                  <div><dt className="font-heading uppercase tracking-widest text-parchment-faint">First Step</dt><dd className="text-parchment-dim mt-0.5">{idea.firstStep}</dd></div>
                  <div><dt className="font-heading uppercase tracking-widest text-crimson-glow">Main Risk</dt><dd className="text-parchment-dim mt-0.5">{idea.mainRisk}</dd></div>
                </dl>
                <Button
                  variant="ghost"
                  className="text-xs py-2 mt-2"
                  onClick={() =>
                    navigate('/challenge/new', { state: { idea: idea.title + ' — ' + idea.oneLiner } })
                  }
                >
                  Challenge This Idea
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
