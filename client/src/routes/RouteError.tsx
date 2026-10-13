import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorPanel } from '@/components/ui/ErrorBoundary';

/** Per-route error element: render errors AND failed lazy-chunk loads (e.g. after a deploy). */
export function RouteError() {
  const err = useRouteError();
  const msg = isRouteErrorResponse(err)
    ? `${err.status} ${err.statusText}`
    : err instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(err.message)
      ? 'A piece of the realm failed to load (a new version may have been deployed). Reload the page.'
      : 'Something broke on this screen. Your progress is saved on the server.';
  return (
    <div className="min-h-[100dvh] bg-void pt-10">
      <ErrorPanel message={msg} onRetry={() => window.location.reload()} />
    </div>
  );
}
