import { cn } from '@/lib/cn';
import { SceneStage } from './SceneStage';

export type GateLayout = 'landscape' | 'portrait';
export type GatePhase = 'awakening' | 'idle' | 'activating' | 'opening' | 'open' | 'transitioning';

const CLOSED_ART = '/assets/hellfire-fortress-gate.webp';
const OPEN_ART = '/assets/gate-open-reveal.jpg';

/**
 * Phase classes shared by the scene and the page (the entry panel fades on the
 * same timeline, so Gate.tsx applies these to its root as well).
 */
export function gateCineClass(phase: GatePhase): string {
  return cn(`cine-${phase}`, phase !== 'awakening' && 'cine-in');
}

interface Props {
  /** Kept for SceneBackdrop; both regimes cover-fit the artwork. */
  layout?: GateLayout;
  /** Animation phase. 'idle' renders the fully lit sealed gate (backdrops). */
  phase?: GatePhase;
  /** Smoke Mode thickens the persistent fog. */
  mode?: 'gate' | 'smoke';
}

/**
 * Cinematic fortress gate built from the two supplied artworks (identical 16:9 framing):
 * - base layer: the CLOSED-gate artwork (the sealed fortress environment)
 * - reveal layer: the OPEN-gate artwork clipped to the arch opening (inner castle)
 * - two hinged leaves cut from the sealed artwork (clip-path) that pivot inward
 *   with CSS 3D transforms, revealing the clipped open scene behind them
 * - doorbox fx: crimson energy seam, one-pass seal pulse, inner light bloom
 */
export function GateScene({ layout = 'landscape', phase = 'idle', mode = 'gate' }: Props) {
  const portrait = layout === 'portrait';
  return (
    <div className={cn('gate-root', gateCineClass(phase), mode === 'smoke' && 'cine-smoke', portrait && 'cine-portrait')} aria-hidden="true">
      <div className="cine-push">
        <SceneStage portrait={portrait}>
          {/* fortress while sealed (full stage) */}
          <div className="cine-bg" style={{ backgroundImage: `url(${CLOSED_ART})` }} />
          {/* inner castle — visible only through the arch, under the leaves */}
          <div className="cine-reveal" style={{ backgroundImage: `url(${OPEN_ART})` }} />
          {/* hinged leaves cut from the sealed artwork */}
          <div className="cine-persp">
            <div className="cine-leaf cine-leaf-l" style={{ backgroundImage: `url(${CLOSED_ART})` }} />
            <div className="cine-leaf cine-leaf-r" style={{ backgroundImage: `url(${CLOSED_ART})` }} />
          </div>
          {/* seal fx over the doorway */}
          <div className="cine-doorbox">
            <div className="cine-light" />
            <div className="cine-seam" />
            <div className="cine-pulse" />
          </div>
          <div className="cine-archglow" />
          <div className="cine-fog" />
          <div className="cine-fog cine-fog-b" />
        </SceneStage>
        <div className="cine-vignette" />
      </div>
      <div className="cine-veil" />
    </div>
  );
}