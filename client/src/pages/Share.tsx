import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Share2,
  Compass,
  Trophy,
  AlertOctagon,
  Download,
} from 'lucide-react';
import { sharesService } from '@/services/shares';
import { errorMessage } from '@/services/api';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { VerdictBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RoadmapGraph } from '@/components/roadmap/RoadmapGraph';
import {
  type Verdict,
  type RiskCategory,
  type Graph,
  RISK_CATEGORIES,
} from '@/types/api';

const effortLabel = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' } as const;

interface CategoryScoreDetail {
  score: number;
  penalty: number;
  finalScore: number;
  rationale: string;
}

interface Struggle {
  title: string;
  category: RiskCategory;
  why: string;
  questionId: string;
  questionIndex: number;
  questionText: string;
  answerExcerpt?: string;
}

interface Fix {
  struggleIndex: number;
  action: string;
  effort: 'low' | 'medium' | 'high';
}

interface Alternative {
  title: string;
  pitch: string;
  whatChanges: string;
}

interface ValidationExperiment {
  description: string;
  metric: string;
  sampleSize: string;
  durationDays: number;
  buildIf: string;
  pivotIf: string;
  killIf: string;
}

interface VerdictSnapshot {
  kind: 'verdict';
  title: string;
  mode: string | null;
  understanding: { problem: string; targetUsers: string; proposedSolution: string };
  totalScore: number | null;
  verdict: Verdict | null;
  lowConfidence: boolean;
  skippedCount: number;
  summary: string;
  categoryScores: Partial<Record<RiskCategory, CategoryScoreDetail>>;
  struggles: Struggle[];
  fixes: Fix[];
  alternatives: Alternative[];
  validationExperiment: ValidationExperiment;
  competitors: Array<{
    name: string;
    url: string | null;
    whatTheyDo: string;
    whyItMatters: string;
    source: string;
  }>;
}

interface RoadmapSnapshot {
  kind: 'roadmap';
  title: string;
  graph: Graph;
}

function VerdictView({ snapshot }: { snapshot: VerdictSnapshot }) {
  const score = snapshot.totalScore ?? 0;
  const fixesByStruggle = new Map<number, Fix>(snapshot.fixes.map((f) => [f.struggleIndex, f]));

  return (
    <>
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1a0d0d" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#e50920'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl text-parchment">{score}</span>
            <span className="text-[10px] font-heading uppercase tracking-widest text-parchment-faint">/ 100</span>
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-narrative text-lg text-parchment-dim italic leading-relaxed">{snapshot.summary}</p>
          {snapshot.lowConfidence && (
            <p className="mt-2 text-xs text-amber-400">
              ⚠ Low confidence — {snapshot.skippedCount} question(s) were skipped, which lowered the score.
            </p>
          )}
        </div>
      </div>

      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-5">Risk Category Scores</h2>
        <div className="space-y-4">
          {RISK_CATEGORIES.map((cat) => {
            const detail = snapshot.categoryScores?.[cat];
            const final = detail?.finalScore ?? 0;
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
                    className={`h-full ${final >= 7 ? 'bg-emerald-600' : final >= 4 ? 'bg-amber-600' : 'bg-crimson'}`}
                    style={{ width: `${Math.max(0, Math.min(100, final * 10))}%` }}
                  />
                </div>
                {detail?.rationale && <p className="mt-1 text-xs text-parchment-faint italic">{detail.rationale}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-1 flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-crimson-glow" aria-hidden />
          Struggles &amp; Failure Risks
        </h2>
        <p className="text-xs text-parchment-faint mb-5">Critical assumptions the trial could not defend.</p>
        <ul className="space-y-5">
          {snapshot.struggles.map((s, i) => {
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
                      <span className="text-xs font-heading uppercase tracking-widest text-crimson-glow">
                        Recommended Fix
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-parchment-faint">
                        {effortLabel[fix.effort]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-parchment">{fix.action}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {snapshot.alternatives.length > 0 && (
        <section className="gothic-panel p-6 sm:p-8">
          <h2 className="font-heading text-lg text-parchment mb-5 flex items-center gap-2">
            <Compass className="h-5 w-5 text-crimson-glow" aria-hidden />
            Alternative Directions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.alternatives.map((alt) => (
              <div key={alt.title} className="rounded-md border border-[var(--border-subtle)] bg-surface-elevated p-4">
                <h3 className="font-heading text-sm text-parchment">{alt.title}</h3>
                <p className="mt-2 text-sm text-parchment-dim">{alt.pitch}</p>
                <p className="mt-2 text-xs text-parchment-faint italic">Change: {alt.whatChanges}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="gothic-panel p-6 sm:p-8 border border-[var(--border-visible)]">
        <h2 className="font-heading text-lg text-parchment mb-1 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-crimson-glow" aria-hidden />
          Cheapest Validation Experiment
        </h2>
        <p className="text-xs text-parchment-faint mb-4">
          Run this before writing a single line of production code.
        </p>
        <p className="font-narrative text-lg text-parchment leading-relaxed">
          {snapshot.validationExperiment.description}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Metric</dt>
            <dd className="mt-1 text-parchment">{snapshot.validationExperiment.metric}</dd>
          </div>
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Sample Size</dt>
            <dd className="mt-1 text-parchment">{snapshot.validationExperiment.sampleSize}</dd>
          </div>
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Duration</dt>
            <dd className="mt-1 text-parchment">{snapshot.validationExperiment.durationDays} days</dd>
          </div>
          <div className="rounded-md bg-surface-elevated p-3">
            <dt className="text-xs font-heading uppercase tracking-widest text-parchment-faint">Decision Rule</dt>
            <dd className="mt-1 text-xs text-parchment-dim">
              <span className="text-emerald-400">Build:</span> {snapshot.validationExperiment.buildIf}<br />
              <span className="text-amber-400">Pivot:</span> {snapshot.validationExperiment.pivotIf}<br />
              <span className="text-red-400">Kill:</span> {snapshot.validationExperiment.killIf}
            </dd>
          </div>
        </dl>
      </section>

      <section className="gothic-panel p-6 sm:p-8">
        <h2 className="font-heading text-lg text-parchment mb-4">Next Steps</h2>
        <ol className="space-y-3 list-decimal list-inside text-sm text-parchment-dim">
          <li>Run the validation experiment above and record the metric.</li>
          <li>Apply every recommended fix, cheapest effort first.</li>
          <li>Re-run the trial in a harsher mode once your assumptions harden.</li>
          {snapshot.verdict !== 'KILL' && <li>Forge your roadmap with decision-aware phases.</li>}
        </ol>
      </section>
    </>
  );
}

function RoadmapView({ snapshot }: { snapshot: RoadmapSnapshot }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">Roadmap</p>
        <h1 className="font-display text-2xl sm:text-4xl text-parchment">{snapshot.title}</h1>
        <p className="mt-1 text-xs text-parchment-faint font-heading uppercase tracking-widest">
          {snapshot.graph.nodes.length} steps · {snapshot.graph.edges.length} connections
        </p>
      </div>
      <RoadmapGraph graph={snapshot.graph} />
    </>
  );
}

/** Public snapshot viewer — GET /shares/:slug requires no authentication. */
export function SharePage() {
  const { slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['share', slug],
    queryFn: () => sharesService.get(slug),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <Spinner label="Opening shared record…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="Share not found" message="This link may have been revoked." />;

  const snapshot = data.snapshot as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="gothic-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Share2 className="h-5 w-5 text-crimson-glow" aria-hidden />
          <div>
            <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">
              Public {data.kind} share
            </p>
            <h1 className="font-display text-2xl sm:text-4xl text-parchment">
              {(snapshot['title'] as string) ?? `${data.kind} snapshot`}
            </h1>
          </div>
          {typeof snapshot['verdict'] === 'string' && <VerdictBadge verdict={snapshot['verdict'] as Verdict} />}
        </div>

        <div className="flex items-center gap-3 text-sm text-parchment-dim border-t border-[var(--border-subtle)] pt-4 mb-6">
          {data.owner.avatarUrl && <img src={data.owner.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />}
          <span>
            Shared by <span className="text-parchment font-heading">{data.owner.displayName}</span> on{' '}
            {new Date(data.createdAt).toLocaleDateString()}
          </span>
        </div>

        {data.pngUrl && (
          <div className="mb-6">
            <img src={data.pngUrl} alt="Shared report export" className="w-full rounded-md border border-[var(--border-subtle)]" />
          </div>
        )}

        {data.kind === 'verdict' ? (
          <VerdictView snapshot={snapshot as unknown as VerdictSnapshot} />
        ) : (
          <RoadmapView snapshot={snapshot as unknown as RoadmapSnapshot} />
        )}

        <div className="mt-8 flex flex-wrap gap-3 justify-end border-t border-[var(--border-subtle)] pt-5">
          <Button variant="ghost" onClick={() => window.print()}>
            <Download className="h-4 w-4" aria-hidden /> Export / Print
          </Button>
        </div>
      </div>
    </div>
  );
}
