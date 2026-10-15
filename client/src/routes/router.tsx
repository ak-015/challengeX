import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell, type RouteHandle } from '@/components/shell/AppShell';
import { Splash } from '@/components/ui/Splash';
import { RouteError } from './RouteError';
import { RequireAuth, Root } from './Root';

const h = (handle: RouteHandle) => ({ handle });

// Every page is a lazy route (its own chunk). Pages export `Component`.
const protectedRoutes: RouteObject[] = [
  { path: 'realm', lazy: () => import('@/pages/Realm'), ...h({ scene: 'valley', circle: 'floor', ground: true, rail: false }) },
  { path: 'altar', lazy: () => import('@/pages/Altar'), ...h({ scene: 'altar', circle: 'dais' }) },
  { path: 'trial/:id', lazy: () => import('@/pages/Trial'), ...h({ scene: 'altar', dimmed: true, circle: 'dais-dim' }) },
  { path: 'verdict/:id', lazy: () => import('@/pages/Verdict'), ...h({ scene: 'dim' }) },
  { path: 'ideas', lazy: () => import('@/pages/Ideas'), ...h({ scene: 'dim' }) },
  { path: 'roadmap', lazy: () => import('@/pages/RoadmapIntake'), ...h({ scene: 'dim' }) },
  { path: 'roadmap/:id', lazy: () => import('@/pages/RoadmapView'), ...h({ scene: 'dim' }) },
  { path: 'history', lazy: () => import('@/pages/History'), ...h({ scene: 'dim' }) },
  { path: 'profile', lazy: () => import('@/pages/Profile'), ...h({ scene: 'dim' }) },
];

const shellChildren: RouteObject[] = [
  { path: 's/:slug', lazy: () => import('@/pages/PublicShare'), ...h({ scene: 'dim' }) },
  { element: <RequireAuth />, children: protectedRoutes, errorElement: <RouteError /> },
  ...(import.meta.env.DEV ? [{ path: 'dev/kitchen-sink', lazy: () => import('@/pages/KitchenSink'), ...h({ scene: 'dim' as const }) } satisfies RouteObject] : []),
  { path: '*', lazy: () => import('@/pages/NotFound'), ...h({ scene: 'dim' }) },
];

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    // react-router v7: the initial-load splash is the root route's HydrateFallback
    // (v6's <RouterProvider fallbackElement> no longer exists).
    HydrateFallback: Splash,
    children: [
      { path: '/', lazy: () => import('@/pages/Landing') }, // public marketing page (no TopBar)
      { path: '/gate', lazy: () => import('@/pages/Gate') }, // the Gate owns its scene and has no TopBar
      { path: '/:doc(privacy|terms)', lazy: () => import('@/pages/Legal') }, // placeholder legal pages
      { element: <AppShell />, errorElement: <RouteError />, children: shellChildren },
    ],
  },
]);
