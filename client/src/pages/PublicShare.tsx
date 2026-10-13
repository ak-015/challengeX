import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VerdictView } from '@/components/verdict/VerdictView';
import { fromSnapshot } from '@/components/verdict/verdictData';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { PublicShare as Share, RoadmapSnapshot, VerdictSnapshot } from '@/lib/apiTypes';
import { RoadmapDetails } from '@/components/roadmap/RoadmapDetails';
import { shares } from '@/lib/endpoints';
import { ApiError, friendlyMessage } from '@/lib/errors';
import { setSocialMeta } from '@/lib/seo';

const RoadmapCanvas = lazy(() => import('@/components/roadmap/RoadmapCanvas'));

export function Component() {
  const { slug = '' } = useParams();
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState<{ msg: string; notFound: boolean } | null>(null);
  useDocumentTitle(share?.snapshot.title ?? 'Shared result');

  useEffect(() => {
    const ctrl = new AbortController();
    shares
      .get(slug, { signal: ctrl.signal })
      .then(setShare)
      .catch((e) => {
        if (e instanceof ApiError && e.code === 'ABORTED') return;
        setError({ msg: e instanceof ApiError && e.status === 404 ? 'This link does not exist or was revoked.' : friendlyMessage(e), notFound: e instanceof ApiError && e.status === 404 });
      });
    return () => ctrl.abort();
  }, [slug]);

  useEffect(() => {
    if (!share) return;
    const s = share.snapshot;
    const desc = s.kind === 'verdict' ? `${s.verdict ?? ''} · ${s.totalScore ?? ''}/100. ${s.summary.slice(0, 140)}` : 'A build roadmap made with ChallengeX.';
    return setSocialMeta({ title: `${s.title} · ChallengeX`, description: desc, image: share.pngUrl, url: window.location.href });
  }, [share]);

  if (error) {
    return (
      <div className="safe-pad mx-auto max-w-xl py-16">
        <GlassPanel role="alert" className="space-y-4 p-6 text-center">
          <Heading level={2}>{error.notFound ? 'Nothing here' : 'The realm is silent'}</Heading>
          <p className="font-prose text-ash-dim">{error.msg}</p>
          <ButtonLink to="/">Challenge your own idea</ButtonLink>
        </GlassPanel>
      </div>
    );
  }
  if (!share) {
    return (
      <p role="status" className="flex min-h-[60dvh] items-center justify-center gap-3 font-label text-ash">
        <Spinner /> Opening the shared scroll…
      </p>
    );
  }

  const owner = (
    <div className="mx-auto mb-4 flex max-w-4xl items-center gap-3 font-label text-sm text-ash">
      <Avatar name={share.owner.displayName} url={share.owner.avatarUrl} size={36} />
      <span>
        Shared by <strong>{share.owner.displayName}</strong>
      </span>
    </div>
  );
  const cta = (
    <div className="flex flex-wrap items-center justify-center gap-3 pb-8">
      <ButtonLink to="/">
        <Icon name="sword" size={18} /> Challenge your own idea
      </ButtonLink>
      {share.pdfUrl && (
        <ButtonAnchor href={share.pdfUrl} target="_blank" rel="noopener noreferrer" variant="ghost">
          <Icon name="download" size={16} /> PDF
        </ButtonAnchor>
      )}
    </div>
  );

  if (share.snapshot.kind === 'roadmap') {
    const s = share.snapshot as RoadmapSnapshot;
    return (
      <div className="safe-pad py-4">
        {owner}
        <div className="mx-auto mb-4 max-w-4xl">
          <Heading level={1}>{s.title}</Heading>
        </div>
        <Suspense fallback={<p role="status" className="py-10 text-center font-label text-ash"><Spinner /> Loading the roadmap…</p>}>
          <RoadmapCanvas graph={s.graph} readOnly />
        </Suspense>
        <RoadmapDetails title={s.title} graph={s.graph} />
        <div className="mt-6">{cta}</div>
      </div>
    );
  }

  const data = fromSnapshot(share.snapshot as VerdictSnapshot);
  return (
    <div className="safe-pad py-4">
      {owner}
      <VerdictView data={data} animate />
      {cta}
      <p className="pb-6 text-center font-prose text-xs text-ash-mute">
        Read-only view. <Link to="/" className="underline">Create your own</Link>.
      </p>
    </div>
  );
}
