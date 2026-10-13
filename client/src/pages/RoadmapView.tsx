import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Roadmap } from '@/lib/apiTypes';
import { roadmaps } from '@/lib/endpoints';
import { friendlyMessage, isAbort } from '@/lib/errors';

// xyflow + dagre are only loaded here (and on public roadmap shares), never in the initial bundle.
const RoadmapCanvas = lazy(() => import('@/components/roadmap/RoadmapCanvas'));
const RoadmapExportCard = lazy(() => import('@/components/roadmap/RoadmapExportCard'));
const ExportDialog = lazy(() => import('@/components/export/ExportDialog').then((m) => ({ default: m.ExportDialog })));

export function Component() {
  const { id = '' } = useParams();
  const [rm, setRm] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tries, setTries] = useState(0);
  useDocumentTitle(rm?.title ?? 'Your Roadmap');

  useEffect(() => {
    const c = new AbortController();
    setError(null);
    roadmaps
      .get(id, { signal: c.signal })
      .then(setRm)
      .catch((e) => !isAbort(e) && setError(friendlyMessage(e)));
    return () => c.abort();
  }, [id, tries]);

  if (error) {
    return (
      <div className="safe-pad mx-auto max-w-xl py-16">
        <GlassPanel role="alert" className="space-y-4 p-6 text-center">
          <p className="text-ash">{error}</p>
          <Button onClick={() => setTries((t) => t + 1)}><Icon name="retry" size={16} /> Retry</Button>
        </GlassPanel>
      </div>
    );
  }
  if (!rm) {
    return <p role="status" className="flex min-h-[60dvh] items-center justify-center gap-3 font-label text-ash"><Spinner /> Unrolling the map…</p>;
  }

  return (
    <div className="safe-pad mx-auto max-w-[1500px] space-y-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={2}>{rm.title}</Heading>
        <Button variant="ghost" onClick={() => setExporting(true)}>
          <Icon name="share" size={18} /> Export / Share
        </Button>
      </div>
      <Suspense fallback={<p role="status" className="flex h-[50dvh] items-center justify-center gap-3 font-label text-ash"><Spinner /> Loading the flowchart…</p>}>
        <RoadmapCanvas graph={rm.graph} />
      </Suspense>
      {exporting && (
        <Suspense fallback={null}>
          <ExportDialog
            kind="roadmap"
            refId={rm.id}
            filename={`roadmap-${rm.id.slice(0, 8)}`}
            card={<RoadmapExportCard title={rm.title} graph={rm.graph} />}
            build={async (cover) =>
              (await import('@/lib/pdfReport')).roadmapPdf(
                { title: rm.title, graph: rm.graph, input: rm.input, undecided: rm.undecided },
                cover.dataUrl,
                { w: cover.width, h: cover.height },
              )
            }
            onClose={() => setExporting(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
