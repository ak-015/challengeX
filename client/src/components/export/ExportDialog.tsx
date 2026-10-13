import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, ButtonAnchor } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { shares, uploads } from '@/lib/endpoints';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { friendlyMessage } from '@/lib/errors';

type Stage = 'render' | 'upload' | 'share' | 'done';

interface Result {
  slug: string;
  pdfLocal: string;
  pdfUrl: string;
}

/**
 * Export / Share: renders the off-screen branded card to a cover image, builds a complete multi-page
 * PDF (cover + every generated detail) with the caller's `build`, uploads the single PDF to Cloudinary
 * with a server signature, then creates the public share link.
 */
export function ExportDialog({ kind, refId, filename, card, build, onClose }: { kind: 'verdict' | 'roadmap'; refId: string; card: ReactNode; build: (cover: { dataUrl: string; width: number; height: number }) => Promise<Blob>; filename: string; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pdf = useRef<Blob | null>(null);
  const url = useRef<string | undefined>(undefined);
  const [stage, setStage] = useState<Stage>('render');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const running = useRef(false);
  const localUrls = useRef<string[]>([]);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setError(null);
    try {
      if (!pdf.current) {
        setStage('render');
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => setTimeout(r, 120)); // let the card lay out
        if (!cardRef.current) throw new Error('The export card is not ready.');
        const { renderCoverPng } = await import('@/lib/exporter'); // html-to-image loads here, only now
        const cover = await renderCoverPng(cardRef.current);
        pdf.current = await build(cover); // jspdf loads inside build
      }
      if (!url.current) {
        setStage('upload');
        setProgress(0);
        const signed = await uploads.sign({ purpose: 'export' });
        url.current = (await uploadToCloudinary(signed, pdf.current as Blob, `${filename}.pdf`, (f) => setProgress(f))).secureUrl;
      }
      setStage('share');
      const { slug } = await shares.create({ kind, refId, pdfUrl: url.current });
      const pdfLocal = URL.createObjectURL(pdf.current as Blob);
      localUrls.current.push(pdfLocal);
      setResult({ slug, pdfLocal, pdfUrl: url.current as string });
      setStage('done');
    } catch (e) {
      setError(e instanceof Error && !('code' in e) ? e.message : friendlyMessage(e));
    } finally {
      running.current = false;
    }
  }, [build, filename, kind, refId]);

  useEffect(() => {
    void run();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      localUrls.current.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = result ? `${window.location.origin}/s/${result.slug}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link stays selectable */
    }
  };

  const label = stage === 'render' ? 'Forging your PDF report…' : stage === 'upload' ? `Uploading… ${Math.round(progress * 100)}%` : stage === 'share' ? 'Creating your share link…' : 'Ready';


  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="export-h">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/80" onClick={onClose} />
      <GlassPanel className="relative z-10 w-full max-w-lg space-y-4 p-6">
        <Heading level={3} id="export-h">
          Export / Share
        </Heading>

        {!error && stage !== 'done' && (
          <div role="status" aria-live="polite" className="space-y-3">
            <p className="flex items-center gap-3 font-label text-ash">
              <Spinner /> {label}
            </p>
            <div className="h-2 overflow-hidden rounded bg-[#2a1214]" aria-hidden="true">
              <div className="h-full origin-left bg-crimson-text transition-transform" style={{ transform: `scaleX(${stage === 'render' ? 0.1 : stage === 'upload' ? 0.2 + progress * 0.7 : 0.95})` }} />
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-3 rounded border border-[#ff6b76] bg-[#2a0408] p-4">
            <p className="text-ash">{error}</p>
            <Button size="sm" variant="ghost" onClick={() => void run()}>
              <Icon name="retry" size={16} /> Try again
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div>
              <label htmlFor="share-link" className="mb-1 block font-label text-sm font-semibold text-ash">
                Public link (anyone can view)
              </label>
              <div className="flex gap-2">
                <input id="share-link" readOnly className="field" value={link} onFocus={(e) => e.target.select()} />
                <Button onClick={() => void copy()} aria-live="polite">
                  <Icon name="copy" size={16} /> {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonAnchor href={result.pdfLocal} download={`${filename}.pdf`} variant="ghost">
                <Icon name="download" size={16} /> Download PDF
              </ButtonAnchor>
              <ButtonAnchor href={link} target="_blank" rel="noopener noreferrer" variant="quiet">
                Open page
              </ButtonAnchor>
            </div>
          </div>
        )}

        <div className="text-right">
          <Button variant="quiet" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </GlassPanel>

      {/* off-screen export card (rendered, never visible) */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -12000, top: 0, width: 1080, height: 1350, pointerEvents: 'none' }}>
        <div ref={cardRef}>{card}</div>
      </div>
    </div>
  );
}
