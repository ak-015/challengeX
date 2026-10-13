import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/store/authStore';

export function Component() {
  useDocumentTitle('Lost in the fog');
  const token = useAuth((s) => s.token);
  return (
    <div className="safe-pad mx-auto flex min-h-[70dvh] max-w-xl items-center justify-center py-10">
      <GlassPanel className="w-full p-6 text-center sm:p-8">
        <p className="font-label text-sm tracking-[0.3em] text-crimson-text">404</p>
        <Heading level={2}>Lost in the fog</Heading>
        <p className="mt-3 font-prose text-ash-dim">There is nothing at this path. The realm does not know it.</p>
        <div className="mt-6">
          <ButtonLink to={token ? '/realm' : '/'}>{token ? 'Back to the realm' : 'Back to the gate'}</ButtonLink>
        </div>
      </GlassPanel>
    </div>
  );
}
