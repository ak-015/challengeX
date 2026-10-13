import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ApiError, friendlyMessage } from '@/lib/errors';

/** Themed error with Retry. A 403 is shown as "access denied" (the server is the authority) and cannot be retried. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const denied = error instanceof ApiError && (error.status === 403 || error.code === 'FORBIDDEN');
  return (
    <GlassPanel role="alert" corners={false} className="flex flex-col items-center gap-3 p-8 text-center">
      <Icon name={denied ? 'skull' : 'warning'} size={36} className="text-crimson-text" />
      <p className="font-display text-lg font-bold text-ash">{denied ? 'Access denied (403)' : 'The archive did not answer'}</p>
      <p className="max-w-md font-prose text-ash-dim">{denied ? 'The server says this account is not an administrator. Nothing here is available to you.' : friendlyMessage(error)}</p>
      {!denied && onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          <Icon name="retry" size={16} /> Retry
        </Button>
      )}
    </GlassPanel>
  );
}

export function EmptyState({ title, text, icon = 'scroll' }: { title: string; text?: string; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <Icon name={icon} size={34} className="text-crimson-text" />
      <p className="font-label text-lg font-bold text-ash">{title}</p>
      {text && <p className="max-w-md font-prose text-ash-dim">{text}</p>}
    </div>
  );
}
