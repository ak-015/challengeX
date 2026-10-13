import { useOnline } from '@/hooks/useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 z-40 border-y border-crimson bg-[#2a0408] px-4 py-2 text-center font-label text-sm text-ash" style={{ top: 'calc(56px + var(--safe-top))' }}>
      You are offline. The realm will reconnect when your connection returns. Nothing you typed is lost.
    </div>
  );
}
