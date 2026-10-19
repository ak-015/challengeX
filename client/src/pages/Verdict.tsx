import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2, RefreshCw, Map as MapIcon, Download, Trophy, AlertOctagon, Compass } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { sharesService } from '@/services/shares';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { VerdictBadge } from '@/components/ui/Badge';
import { RISK_CATEGORIES } from '@/types/api';
import type { Fix, VerdictResponse } from '@/types/api';

const effortLabel = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' } as const;

export function VerdictPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  const [shareBusy, setShareBusy] = useState(false);

  // Verdict arrives from POST /verdict via state; otherwise load the completed session.
  const seeded = (location.state as { verdict?: VerdictResponse } | null)?.verdict;

  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['trial', id],
    queryFn: () => trialsService.get(id),
    enabled: !!id && !seeded,
    retry: false,
  });

  const verdict: VerdictResponse | null = seeded
    ? seeded
    : session && session.status === 'complete' && session.verdictPayload && 'categoryScores' in session.verdictPayload
      ? ({
          sessionId: session.id,
          title: session.title,
          mode: session.mode,
          totalScore: session.totalScore,
          verdict: session.verdict,
          scores: session.scores,
          ...(session.verdictPayload as object),
        } as VerdictResponse)
      : null;

  const share = async () => {
    setShareBusy(true);
    try {
      const r = await sharesService.create({ kind: 'verdict', refId: id });
      const url = `${window.location.origin}/share/${r.slug}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      push('success', `Share link copied: ${url}`);
    } catch (err) {
      push('error', errorMessage(err));
    } finally {
      setShareBusy(false);
    }
  };

  const challengeAgain = () => {
    navigate('/challenge/new');
  };

  if (!seeded && isLoading) return <Spinner label="Fetching the verdict…" />;
  if (!seeded && error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (!verdict || !verdict.verdict) {
    return (
      <EmptyState
        title="No verdict has been rendered"
        message="This trial has not finished its interrogation yet. Complete all questions to receive a report."
        action={<Link to={`/challenge/${id}/trial`} className="gothic-btn-primary text-sm">Return to Trial</Link>}
      />
    );
  }

  const score = verdict.totalScore ?? 0;
  const fixesByStruggle = new Map<number, Fix>(verdict.fixes.map((f) => [f.struggleIndex, f]));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <header className="gothic-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">Analysis Report</p>
            <h1 className="font-display text-2xl sm:text-4xl text-parchment mt-1">{verdict.title}</h1>
          </div>
          <VerdictBadge verdict={verdict.verdict} />
        </div>

        {/* Overall score */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1a0d0d" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#e50920'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl text-parchment">{score}</span>
              <span className="text-[10px] font-heading uppercase tracking-widest text-parchment-faint">/ 100</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-narrative text-lg text-parchment-dim italic leading-relaxed">{verdict.summary}</p>
            {verdict.lowConfidence && (
              <p className="mt-2 text-xs text-amber-400">
                ⚠ Low confidence — {verdict.skippedCount} question(s) were skipped, which lowered the score.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-end border-t border-[var(--border-subtle)] pt-5">
          <Button variant="ghost" onClick={share} loading={shareBusy}>
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            <Download className="h-4 w-4" aria-hidden /> Export
          </Button>
          <Button variant="ghost" onClick={challengeAgain}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Challenge Again
          </Button>
          {verdict.verdict !== 'KILL' && (
            <Link to="/roadmaps/new" state={{ trialId: id }} className="gothic-btn-primary text-sm">
              <MapIcon className="h-4 w-4" aria-hidden /> Build Roadmap
            </Link>
          )}
        </div>
      </header>

      {/* Risk category scores */}
      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-5">Risk Category Scores</h2>
        <div className="space-y-4">
          {RISK_CATEGORIES.map((cat) => {
            const detail = verdict.categoryScores?.[cat];
            const final = detail?.finalScore ?? verdict.scores?.[cat] ?? 0;
            return (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-heading uppercase tracking-widest text-parchment-dim text-xs">{cat}</span>
                  <span className="text-parchment">
                    {final}/10
                    {detail && detail.penalty > 0 && (
                      <span className="ml-1 text-amber-400 text-xs">(−{detail.penalty.toFixed(1)} skip)</span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#1a0d0d] border border-[var(--border-subtle)] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      final >= 7 ? 'bg-emerald-600' : final >= 4 ? 'bg-amber-600' : 'bg-crimson'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, final * 10))}%` }}
                  />
                </div>
                {detail?.rationale && <p className="mt-1 text-xs text-parchment-faint italic">{detail.rationale}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Struggles (weaknesses / failure risks) */}
      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-1 flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-crimson-glow" aria-hidden />
          Struggles &amp; Failure Risks
        </h2>
        <p className="text-xs text-parchment-faint mb-5">Critical assumptions the trial could not defend.</p>
        <ul className="space-y-5">
          {verdict.struggles.map((s, i) => {
            const fix = fixesByStruggle.get(i);
            return (
              <li key={`${s.questionId}-${i}`} className="border-l-2 border-crimson/50 pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-base text-parchment">{s.title}</h3>
                  <span className="rounded border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-heading uppercase tracking-widest text-parchment-faint">
                    {s.category}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-parchment-dim leading-relaxed">{s.why}</p>
                {s.questionText && (
                  <p className="mt-1.5 text-xs text-parchment-faint italic">
                    Q{s.questionIndex}: “{s.questionText}”
                    {s.answerExcerpt && <> — you said: “{s.answerExcerpt}”</>}
                  </p>
                )}
                {fix && (
                  <div className="mt-3 rounded-md bg-surface-elevated border border-[var(--border-subtle)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-heading uppercase tracking-widest text-crimson-glow">Recommended Fix</span>
                      <span className="text-[10px] uppercase tracking-widest text-parchment-faint">{effortLabel[fix.effort]}</span>
                    </div>
                    <p className="mt-1 text-sm text-parchment">{fix.action}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Alternative directions */}
      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-5 flex items-center gap-2">
          <Compass className="h-5 w-5 text-crimson-glow" aria-hidden />
          Alternative Directions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verdict.alternatives.map((alt) => (
            <div key={alt.title} className="rounded-md border border-[var(--border-subtle)] bg-surface-elevated p-4">
              <h3 className="font-heading text-sm text-parchment">{alt.title}</h3>
              <p className="mt-2 text-sm text-parchment-dim">{alt.pitch}</p>
              <p className="mt-2 text-xs text-parchment-faint italic">Change: {alt.whatChanges}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cheapest validation experiment */}
      <section className="gothic-panel p-6 sm:p-8 border border-[var(--border-visible)]">
        <h2 className="font-heading text-lg text-parchment mb-1 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-crimson-glow" aria-hidden />
          Cheapest Validation Experiment
        </h2>
        <p className="text-xs text-parchment-faint mb-4">Run this before writing a single line of production code.</p>
        <p className="font-narrative text-lg text-parchment leading-relaxed">{verdict.validationExperiment.description}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Metric</dt>
            <dd className="mt-1 text-parchment">{verdict.validationExperiment.metric}</dd>
          </div>
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Sample Size</dt>
            <dd className="mt-1 text-parchment">{verdict.validationExperiment.sampleSize}</dd>
          </div>
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Duration</dt>
            <dd className="mt-1 text-parchment">{verdict.validationExperiment.durationDays} days</dd>
          </div>
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Decision Rule</dt>
            <dd className="mt-1 text-xs text-parchment-dim">
              <span className="text-emerald-400">Build:</span> {verdict.validationExperiment.buildIf}
              <br />
              <span className="text-amber-400">Pivot:</span> {verdict.validationExperiment.pivotIf}
              <br />
              <span className="text-red-400">Kill:</span> {verdict.validationExperiment.killIf}
            </dd>
          </div>
        </dl>
      </section>

      {/* Next steps */}
      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-4">Next Steps</h2>
        <ol className="space-y-3 list-decimal list-inside text-sm text-parchment-dim">
          <li>Run the validation experiment above and record the metric.</li>
          <li>Apply every recommended fix, cheapest effort first.</li>
          <li>Re-run the trial in a harsher mode once your assumptions harden.</li>
          {verdict.verdict !== 'KILL' && <li>Forge your roadmap with decision-aware phases.</li>}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <Link to="/history" className="gothic-btn-ghost text-sm">View All Trials</Link>
          <Link to="/dashboard" className="gothic-btn-ghost text-sm">Dashboard</Link>
        </div>
      </section>
    </div>
  );
}
