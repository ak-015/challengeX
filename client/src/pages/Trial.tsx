import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, SkipForward, Gavel, ChevronRight } from 'lucide-react';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { Spinner, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { ProgressBar } from '@/components/ui/Badge';
import { RISK_CATEGORIES, MODES, isDone, isExtension, isQuestion } from '@/types/api';
import type { Assumption, Competitor, ModeKey, NextQuestionResponse, Progress, TrialExtension } from '@/types/api';

const categoryLabel: Record<string, string> = Object.fromEntries(RISK_CATEGORIES.map((c) => [c, c]));

export function TrialPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'question' | 'done' | 'extension'>('loading');
  const [question, setQuestion] = useState<{ id: string; index: number; category: string; text: string } | null>(null);
  const [progress, setProgress] = useState<Progress>({ asked: 0, plannedTotal: 0 });
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [extension, setExtension] = useState<TrialExtension | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const initRef = useRef<string | null>(null);

  // Load the trial once for title/mode context.
  const { data: session, error: loadError } = useQuery({
    queryKey: ['trial', id],
    queryFn: () => trialsService.get(id),
    enabled: !!id,
    retry: false,
  });

  const handleNext = useCallback(
    async (currentId: string) => {
      setBusy(true);
      setFatal(null);
      try {
        const res: NextQuestionResponse = await trialsService.next(currentId);
        if (isQuestion(res)) {
          setQuestion(res.question);
          setProgress(res.progress);
          setAssumptions(res.assumptions);
          if (res.competitors) setCompetitors(res.competitors);
          setPhase('question');
        } else if (isExtension(res)) {
          setExtension(res.extension);
          setProgress(res.progress);
          setAssumptions(res.assumptions);
          setPhase('extension');
        } else if (isDone(res)) {
          setProgress(res.progress);
          setAssumptions(res.assumptions);
          setPhase('done');
        }
      } catch (err) {
        setFatal(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Kick off / advance on mount.
  // (guarded so React StrictMode's double-mount cannot fire two /next calls)
  useEffect(() => {
    if (!id || initRef.current === id) return;
    initRef.current = id;
    void handleNext(id);
  }, [id, handleNext]);

  const sendAnswer = async (skipped: boolean) => {
    if (!question) return;
    if (!skipped && !answer.trim()) return;
    setBusy(true);
    setFatal(null);
    try {
      await trialsService.answer(id, question.id, skipped ? undefined : answer.trim(), skipped);
      setAnswer('');
      await handleNext(id);
    } catch (err) {
      setFatal(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /** Generates the verdict and opens it. Used by both "done" and "render now". */
  const renderVerdict = async () => {
    setJudging(true);
    setFatal(null);
    try {
      const v = await trialsService.verdict(id);
      navigate(`/challenge/${id}/verdict`, { state: { verdict: v }, replace: true });
    } catch (err) {
      setJudging(false);
      setFatal(errorMessage(err));
    }
  };

  const resolveExt = async (action: 'continue' | 'verdict') => {
    setBusy(true);
    setFatal(null);
    try {
      await trialsService.resolveExtension(id, action);
      if (action === 'verdict') {
        // The extend endpoint only records the choice — the verdict itself must still be generated.
        await renderVerdict();
      } else {
        await handleNext(id);
      }
    } catch (err) {
      setFatal(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const requestVerdict = renderVerdict;

  if (loadError) return <ErrorState message={errorMessage(loadError)} />;
  if (judging) return <Spinner label="The court deliberates…" />;
  // A failed request must be retryable even before the first question has loaded.
  if (fatal) {
    return (
      <ErrorState
        message={fatal}
        onRetry={() => {
          setFatal(null);
          void handleNext(id);
        }}
      />
    );
  }
  if (phase === 'loading') return <Spinner label="Consulting the oracle…" />;

  const modeKey = (session?.mode ?? 'stress_test') as ModeKey;
  const modeLabel = MODES[modeKey]?.label ?? session?.mode ?? 'Stress Test';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">{modeLabel} Trial</p>
          <h1 className="font-display text-2xl sm:text-3xl text-parchment">{session?.title ?? 'Trial'}</h1>
        </div>
        <div className="w-full sm:w-56">
          <ProgressBar value={progress.asked} max={progress.plannedTotal} label="Progress" />
        </div>
      </header>

      {phase === 'question' && question && (
        <div className="gothic-panel p-6 sm:p-8 space-y-5" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading uppercase tracking-[0.2em] text-parchment-dim">
              Question {question.index} of {progress.plannedTotal}
            </span>
            <span className="rounded border border-[var(--border-visible)] bg-crimson-soft px-2.5 py-0.5 text-xs font-heading uppercase tracking-widest text-crimson-glow">
              {categoryLabel[question.category] ?? question.category}
            </span>
          </div>
          <p className="font-narrative text-xl sm:text-2xl leading-relaxed text-parchment">{question.text}</p>
          <Textarea
            label="Your Answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={1500}
            placeholder="Defend your idea — specifics beat optimism…"
            hint={`${answer.length}/1500 characters`}
            id="answer-box"
          />
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="ghost" onClick={() => sendAnswer(true)} loading={busy}>
              <SkipForward className="h-4 w-4" aria-hidden />
              Skip
            </Button>
            <Button onClick={() => sendAnswer(false)} loading={busy} disabled={!answer.trim()}>
              <Send className="h-4 w-4" aria-hidden />
              Send
            </Button>
          </div>
          {busy && (
            <p className="text-right text-xs italic text-parchment-faint" role="status">
              The oracle weighs your answer…
            </p>
          )}
        </div>
      )}

      {phase === 'extension' && extension && (
        <div className="gothic-panel p-6 sm:p-8 space-y-5 border border-[var(--border-visible)]" aria-live="polite">
          <h2 className="font-heading text-xl text-parchment">The Interrogation Could Go Deeper</h2>
          <p className="font-narrative text-lg text-parchment-dim italic leading-relaxed">{extension.reason}</p>
          <p className="text-sm text-parchment-faint">
            Add {extension.additionalQuestions} more question{extension.additionalQuestions > 1 ? 's' : ''} for a sharper
            verdict — or render the verdict now with lower confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="ghost" onClick={() => resolveExt('verdict')} loading={busy}>Render Verdict Now</Button>
            <Button onClick={() => resolveExt('continue')} loading={busy}>Continue the Trial</Button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="gothic-panel p-6 sm:p-8 text-center space-y-5">
          <h2 className="font-heading text-xl text-parchment">Interrogation Complete</h2>
          <p className="font-narrative text-lg text-parchment-dim italic">
            {progress.asked} questions answered. The court is ready to render its judgment.
          </p>
          <Button onClick={requestVerdict} loading={busy} className="w-full sm:w-auto">
            <Gavel className="h-4 w-4" aria-hidden />
            Render the Verdict
          </Button>
        </div>
      )}

      {assumptions.length > 0 && (
        <section className="gothic-panel p-6">
          <h2 className="font-heading text-sm uppercase tracking-[0.2em] text-crimson-glow mb-3">
            Assumptions on Record ({assumptions.length})
          </h2>
          <ul className="space-y-2">
            {assumptions.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.risk === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}
                  aria-label={`${a.risk} risk`}
                />
                <span className="text-parchment-dim">
                  <span className="font-heading uppercase text-xs tracking-widest text-parchment-faint mr-2">{a.category}</span>
                  {a.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {competitors.length > 0 && (
        <section className="gothic-panel p-6">
          <h2 className="font-heading text-sm uppercase tracking-[0.2em] text-crimson-glow mb-3">Rivals in the Field</h2>
          <ul className="space-y-3">
            {competitors.map((c) => (
              <li key={c.name} className="text-sm">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-crimson-glow" aria-hidden />
                  <span className="font-heading text-parchment">{c.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-parchment-faint">{c.source}</span>
                </div>
                <p className="mt-1 pl-5 text-parchment-dim">{c.whatTheyDo}</p>
                <p className="mt-0.5 pl-5 text-parchment-faint italic">{c.whyItMatters}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
