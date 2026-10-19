import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Map, Rocket, Hammer, Briefcase, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { roadmapsService } from '@/services/roadmaps';
import { Button } from '@/components/ui/Button';
import { Textarea, Select } from '@/components/ui/Form';
import { ErrorState } from '@/components/ui/States';
import type { GenerateRoadmapResponse, RoadmapSource } from '@/types/api';

const MAX_IDEA = 1000;

// The PDF lists 4 roadmap types; the backend has a single graph generator,
// so "type" is sent as free-text `extra` context to steer the engine.
const ROADMAP_TYPES = ['Startup Roadmap', 'Technical Roadmap', 'Business Roadmap', 'Learning Roadmap'] as const;
type RoadmapType = (typeof ROADMAP_TYPES)[number];

const TIMELINES = ['1 month', '3 months', '6 months', '12 months'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const BUDGETS = ['<$1k', '$1k–$10k', '$10k–$50k', '$50k+'];
const TEAM_SIZES = ['Solo', '2–5', '6–12', '12+'];

export function RoadmapNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();

  const prefillTrialId = (location.state as { trialId?: string } | null)?.trialId ?? '';

  const { data: sources, error: sourcesError } = useQuery({
    queryKey: ['roadmap-sources'],
    queryFn: () => roadmapsService.sources(),
    retry: false,
  });

  const [ideaText, setIdeaText] = useState('');
  const [trialId, setTrialId] = useState(prefillTrialId);
  const [type, setType] = useState<RoadmapType>('Startup Roadmap');
  const [timeline, setTimeline] = useState(TIMELINES[1]);
  const [experience, setExperience] = useState(EXPERIENCE[1]);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [teamSize, setTeamSize] = useState(TEAM_SIZES[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateRoadmapResponse | null>(null);

  const items: RoadmapSource[] = sources?.items ?? [];

  useEffect(() => {
    if (prefillTrialId) setTrialId(prefillTrialId);
  }, [prefillTrialId]);

  const canSubmit = trialId || ideaText.trim().length >= 20;

  const generate = async () => {
    if (!canSubmit) {
      setError('Provide at least 20 characters of idea text, or select a completed trial.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await roadmapsService.generate({
        trialId: trialId || undefined,
        ideaText: trialId ? undefined : ideaText.trim(),
        // PDF options folded into backend free-text context fields:
        timeline,
        team: `${type} · ${teamSize} team`,
        budget: `${budget} budget · ${experience} experience`,
        extra: `Roadmap type: ${type}`,
      });
      setResult(res);
      push('success', 'Roadmap generated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment">Get Roadmap</h1>
        <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
          Shape the raw idea into a phased plan with milestones and deliverables.
        </p>
      </header>

      <div className="gothic-panel p-6 sm:p-8 space-y-6">
        {items.length > 0 && (
          <Select label="Source: Completed Trial (optional)" value={trialId} onChange={(e) => setTrialId(e.target.value)}>
            <option value="">— Write idea text instead —</option>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.verdict}{s.totalScore !== null ? ` · ${s.totalScore}` : ''})
              </option>
            ))}
          </Select>
        )}
        {sourcesError && <ErrorState message={errorMessage(sourcesError)} />}

        {!trialId && (
          <Textarea
            label="Idea Description"
            required
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            maxLength={MAX_IDEA}
            hint={`${ideaText.length}/${MAX_IDEA} characters (minimum 20)`}
            placeholder="Describe the idea you want a roadmap for…"
          />
        )}

        <fieldset>
          <legend className="text-sm font-heading text-parchment-dim mb-3">Roadmap Type</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Roadmap type">
            {ROADMAP_TYPES.map((t) => {
              const Icon = t === 'Startup Roadmap' ? Rocket : t === 'Technical Roadmap' ? Hammer : t === 'Business Roadmap' ? Briefcase : GraduationCap;
              const active = type === t;
              return (
                <label
                  key={t}
                  className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer text-sm font-heading transition-all ${
                    active ? 'border-[var(--border-visible)] bg-crimson-soft text-parchment' : 'border-[var(--border-subtle)] text-parchment-dim hover:bg-surface-hover'
                  }`}
                >
                  <input type="radio" name="rtype" className="sr-only" checked={active} onChange={() => setType(t)} />
                  <Icon className={`h-4 w-4 ${active ? 'text-crimson-glow' : ''}`} aria-hidden />
                  {t}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Target Timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)}>
            {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Experience Level" value={experience} onChange={(e) => setExperience(e.target.value)}>
            {EXPERIENCE.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Budget Range" value={budget} onChange={(e) => setBudget(e.target.value)}>
            {BUDGETS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Team Size" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
            {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        <p className="text-xs text-parchment-faint border border-dashed border-[var(--border-subtle)] rounded-md px-3 py-2">
          Leave tech stack, marketing and platform undecided if you want the engine to branch the plan with explicit
          decision nodes — the backend models each undecided field as a fork in the graph.
        </p>

        {error && (
          <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={generate} loading={busy} disabled={!canSubmit} className="w-full sm:w-auto">
            <Map className="h-4 w-4" aria-hidden />
            Generate Roadmap
          </Button>
        </div>
      </div>

      {result && (
        <section className="mt-8 gothic-panel p-6 sm:p-8 space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">Roadmap Ready</p>
              <h2 className="font-heading text-xl text-parchment">{result.title}</h2>
            </div>
            <Button onClick={() => navigate(`/roadmaps/${result.id}`)}>View Full Roadmap</Button>
          </div>
          <p className="text-sm text-parchment-dim">
            {result.graph.nodes.length} nodes across 6 stages.{' '}
            {result.undecided.length > 0 && (
              <>Decision forks: <span className="text-parchment">{result.undecided.join(', ')}</span>.</>
            )}
          </p>
        </section>
      )}
    </div>
  );
}
