import { useCallback, useState } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import { RuneWatermark } from '@/components/art/RuneWatermark';
import { MagicCircleLayer, type CirclePose } from '@/components/scenes/MagicCircle';
import { SceneBackdrop, type Scene } from '@/components/scenes/SceneBackdrop';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { cn } from '@/lib/cn';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export interface RouteHandle {
  scene?: Scene;
  dimmed?: boolean;
  circle?: CirclePose;
  /** Render the ritual-ground artwork (public/assets/challengex-ground-background.webp) behind the circle. */
  ground?: boolean;
  /** Show the permanent desktop sidebar rail. Cinematic pages (Paths) opt out and use the drawer instead. */
  rail?: boolean;
}

export function AppShell() {
  const matches = useMatches();
  const handle = [...matches].reverse().find((m) => m.handle)?.handle as RouteHandle | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-black focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SceneBackdrop scene={handle?.scene ?? 'dim'} dimmed={handle?.dimmed} />
      {handle?.ground && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]">
          {/* Cinematic ground artwork: the dominant layer. The wash darkens the header band and the
              deepest floor only, so the red moon, castle silhouettes and glowing details stay visible. */}
          <div className="cc-ground absolute inset-0 opacity-95" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(7,5,6,0.82) 0%, rgba(7,5,6,0.3) 16%, rgba(7,5,6,0.08) 38%, rgba(7,5,6,0.18) 62%, rgba(7,5,6,0.55) 82%, rgba(7,5,6,0.78) 100%)',
            }}
          />
        </div>
      )}
      <MagicCircleLayer pose={handle?.circle ?? 'none'} />
      <RuneWatermark />
      <Sidebar open={menuOpen} onClose={closeMenu} rail={handle?.rail ?? true} />
      <TopBar onOpenMenu={() => setMenuOpen(true)} />
      <OfflineBanner />
      <main
        id="main"
        className={cn('relative z-10 min-h-[100dvh]', (handle?.rail ?? true) && 'lg:pl-64')}
        style={{ paddingTop: 'calc(56px + var(--safe-top))' }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
