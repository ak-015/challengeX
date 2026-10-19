import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { Spinner, ErrorState } from '@/components/ui/States';
import type { CreateTrialResponse, Understanding } from '@/types/api';

export function ClarifyPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();

  // Freshly created trial arrives via router state; otherwise reload from backend.
  const seeded = (location.state as { trial?: CreateTrialResponse } | null)?.trial;

  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['trial', id],
    queryFn: () => trialsService.get(id),
    enabled: !!id && !seeded,
    retry: false,
  });

  const understanding: Understanding | null = seeded
    ? (seeded.understanding as Understanding)
    : ((session?.understanding as Understanding | null) ?? null);

  const [editing, setEditing] = useState(!seeded);
  const [problem, setProblem] = useState(understanding?.problem ?? '');
  const [targetUsers, setTargetUsers] = useState(understanding?.targetUsers ?? '');
  const [solution, setSolution] = useState(understanding?.proposedSolution ?? '');
  const [busy, setBusy] = useState(false);

  // Sync fields once when backend data arrives.
  const loadedKey = `${understanding?.problem ?? ''}|${understanding?.targetUsers ?? ''}`;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (understanding && syncedKey !== loadedKey) {
    setProblem(understanding.problem);
    setTargetUsers(understanding.targetUsers);
    setSolution(understanding.proposedSolution);
    setSyncedKey(loadedKey);
  }

  if (!seeded && isLoading) return <Spinner label="Loading your clarification…" />;
  if (!seeded && error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (!understanding && !editing) return <ErrorState message="No clarification data is available for this trial." />;

  const saveAndBegin = async () => {
    setBusy(true);
    try {
      await trialsService.patchUnderstanding(id, {
        problem: problem.trim(),
        targetUsers: targetUsers.trim(),
        proposedSolution: solution.trim(),
      });
      push('success', 'Understanding confirmed. The trial begins.');
      navigate(`/challenge/${id}/trial`, { replace: true });
    } catch (err) {
      push('error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canConfirm = problem.trim() && targetUsers.trim() && solution.trim();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-parchment">Idea Clarification</h1>
          <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
            The engine distilled your idea. Confirm its reading before the questions begin.
          </p>
        </div>
        {!editing && understanding && (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Button>
        )}
      </header>

      <div className="gothic-panel p-6 sm:p-8 space-y-6">
        <div>
          <label htmlFor="f-problem" className="block text-sm font-heading text-parchment-dim mb-1.5">
            Problem <span className="text-crimson-glow" aria-hidden>*</span>
          </label>
          {editing ? (
            <Textarea id="f-problem" value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={600} placeholder="What problem does it solve?" />
          ) : (
            <p className="gothic-input font-narrative text-lg text-parchment min-h-[64px]">{understanding?.problem}</p>
          )}
        </div>

        <div>
          <label htmlFor="f-users" className="block text-sm font-heading text-parchment-dim mb-1.5">
            Target Users <span className="text-crimson-glow" aria-hidden>*</span>
          </label>
          {editing ? (
            <Textarea id="f-users" value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} maxLength={400} placeholder="Who is this for?" className="min-h-[90px]" />
          ) : (
            <p className="gothic-input font-narrative text-lg text-parchment min-h-[64px]">{understanding?.targetUsers}</p>
          )}
        </div>

        <div>
          <label htmlFor="f-solution" className="block text-sm font-heading text-parchment-dim mb-1.5">
            Proposed Solution <span className="text-crimson-glow" aria-hidden>*</span>
          </label>
          {editing ? (
            <Textarea id="f-solution" value={solution} onChange={(e) => setSolution(e.target.value)} maxLength={600} placeholder="How does your idea solve it?" />
          ) : (
            <p className="gothic-input font-narrative text-lg text-parchment min-h-[64px]">{understanding?.proposedSolution}</p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end border-t border-[var(--border-subtle)] pt-6">
          {editing && (
            <Button variant="ghost" onClick={() => (understanding ? setEditing(false) : navigate(-1))}>Cancel</Button>
          )}
          <Button onClick={saveAndBegin} loading={busy} disabled={!canConfirm} className="w-full sm:w-auto">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            This Is Right, Begin
          </Button>
        </div>
      </div>
    </div>
  );
}
