import { Outlet, useMatches } from 'react-router-dom';
import { RuneWatermark } from '@/components/art/RuneWatermark';
import { MagicCircleLayer, type CirclePose } from '@/components/scenes/MagicCircle';
import { SceneBackdrop, type Scene } from '@/components/scenes/SceneBackdrop';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { TopBar } from './TopBar';

export interface RouteHandle {
  scene?: Scene;
  dimmed?: boolean;
  circle?: CirclePose;
}

export function AppShell() {
  const matches = useMatches();
  const handle = [...matches].reverse().find((m) => m.handle)?.handle as RouteHandle | undefined;
  return (
    <div className="relative min-h-[100dvh] overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-black focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SceneBackdrop scene={handle?.scene ?? 'dim'} dimmed={handle?.dimmed} />
      <MagicCircleLayer pose={handle?.circle ?? 'none'} />
      <RuneWatermark />
      <TopBar />
      <OfflineBanner />
      <main id="main" className="relative z-10 min-h-[100dvh]" style={{ paddingTop: 'calc(56px + var(--safe-top))' }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
