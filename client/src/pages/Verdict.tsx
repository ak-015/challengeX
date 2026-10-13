import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ForgeAnimation } from '@/components/verdict/ForgeAnimation';
import { VerdictView } from '@/components/verdict/VerdictView';
import { fromVerdictResponse, type VerdictData } from '@/components/verdict/verdictData';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Icon } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Competitor, SessionDto, Understanding } from '@/lib/apiTypes';
import { trials } from '@/lib/endpoints';
import { friendlyMessage, isAbort } from '@/lib/errors';

const ExportDialog = lazy(() => import('@/components/export/ExportDialog').then((m) => ({ default: m.ExportDialog })));
const ExportCard = lazy(() => import('@/components/verdict/ExportCard').then((m) => ({ default: m.ExportCard })));

const MIN_FORGE_MS = 3000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Component() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [data, setData] = useState<VerdictData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const started = useRef(false);
  useDocumentTitle(data?.title ?? 'The Verdict');

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await trials.get(id);
      if (s.kind !== 'trial') return navigate('/history', { replace: true });
      setSession(s);
      setSaved(s.saved);
      const comp: Competitor[] = s.competitors ?? [];
      const u = (s.understanding ?? undefined) as Understanding | undefined;
      if (s.status === 'complete' && s.verdictPayload && s.verdict && s.totalScore !== null && s.scores) {
        const p = s.verdictPayload;
        setFresh(false);
        setData(fromVerdictResponse({ sessionId: s.id, title: s.title, mode: s.mode as never, totalScore: s.totalScore, verdict: s.verdict, scores: s.scores, ...p } as never, comp, u));
        return;
      }
      if (!s.interrogationDone) return navigate(`/trial/${id}`, { replace: true });
      // Generate the verdict, with a minimum forging time so the moment feels earned.
      setFresh(true);
      const [v] = await Promise.all([trials.verdict(id), sleep(MIN_FORGE_MS)]);
      setData(fromVerdictResponse(v, comp, u));
    } catch (e) {
      if (!isAbort(e)) setError(friendlyMessage(e));
    }
  }, [id, navigate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const toggleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const r = await trials.save(id, !saved);
      setSaved(r.saved);
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) {
    return (
      <div className="safe-pad mx-auto max-w-xl py-16">
        <GlassPanel role="alert" className="space-y-4 p-6 text-center">
          <p className="font-prose text-ash">{error}</p>
          <Button
            onClick={() => {
              started.current = false;
              setData(null);
              void load();
            }}
          >
            <Icon name="retry" size={16} /> Retry
          </Button>
        </GlassPanel>
      </div>
    );
  }

  if (!data || !session) {
    return (
      <div className="safe-pad flex min-h-[70dvh] items-center justify-center">
        <ForgeAnimation />
      </div>
    );
  }

  const canRoadmap = data.verdict !== 'KILL';
  const actions = (
    <>
      <Button disabled={!canRoadmap} onClick={() => navigate('/roadmap', { state: { trialId: id } })} aria-describedby={canRoadmap ? undefined : 'kill-note'}>
        <Icon name="map" size={18} /> Get Roadmap
      </Button>
      <Button variant="ghost" onClick={() => void toggleSave()} loading={saving} aria-pressed={saved}>
        {saved ? 'Saved ✓' : 'Save to History'}
      </Button>
      <Button variant="ghost" onClick={() => navigate('/altar', { state: { idea: session.ideaText ?? '', mode: session.mode ?? undefined } })}>
        <Icon name="retry" size={18} /> Challenge Again
      </Button>
      <Button variant="ghost" onClick={() => setExporting(true)}>
        <Icon name="share" size={18} /> Export / Share
      </Button>
      {!canRoadmap && (
        <p id="kill-note" className="basis-full text-center font-prose text-sm text-ash-dim">
          Roadmaps are only forged for ideas that survive (BUILD or PIVOT).
        </p>
      )}
    </>
  );

  return (
    <div className="safe-pad py-4">
      {error && (
        <p role="alert" className="mx-auto mb-3 max-w-4xl rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
          {error}
        </p>
      )}
      <VerdictView data={data} actions={actions} animate={fresh || true} />
      {exporting && (
        <Suspense fallback={null}>
          <ExportDialog
            kind="verdict"
            refId={id}
            filename={`verdict-${id.slice(0, 8)}`}
            card={<ExportCard data={data} />}
            build={async (cover) => (await import('@/lib/pdfReport')).verdictPdf(data, cover.dataUrl, { w: cover.width, h: cover.height })}
            onClose={() => setExporting(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
