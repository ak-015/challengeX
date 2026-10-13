import { RuneLogo } from '@/components/art/RuneLogo';

export function Splash({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-void text-ash">
      <div className="spin-slow">
        <RuneLogo size={72} />
      </div>
      <p className="font-label text-sm tracking-[0.2em] text-ash-dim">{label}</p>
    </div>
  );
}
