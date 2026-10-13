import { useEffect, useState } from 'react';
import { ArtDefs } from './art';
import { AltarScene } from './AltarScene';
import { Embers } from './Embers';
import { GateScene } from './GateScene';
import { ValleyScene } from './ValleyScene';

export type Scene = 'gate' | 'valley' | 'altar' | 'dim';

/** Opacity of each layer for a requested scene. "dim" = the valley at 35%. */
function opacities(scene: Scene, dimmed?: boolean): Record<'gate' | 'valley' | 'altar', number> {
  return {
    gate: scene === 'gate' ? 1 : 0,
    valley: scene === 'valley' ? 1 : scene === 'dim' ? 0.35 : 0,
    altar: scene === 'altar' ? (dimmed ? 0.42 : 1) : 0,
  };
}

/**
 * Crossfading scene backdrop built from SVG components. Layers that are fully hidden are unmounted after the
 * fade so only the visible scenes cost anything.
 */
export function SceneBackdrop({ scene, dimmed, embers = true }: { scene: Scene; dimmed?: boolean; embers?: boolean }) {
  const op = opacities(scene, dimmed);
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([scene === 'dim' ? 'valley' : scene]));

  useEffect(() => {
    const wanted = (Object.keys(op) as Array<keyof typeof op>).filter((k) => op[k] > 0);
    setMounted((prev) => new Set([...prev, ...wanted]));
    const t = setTimeout(() => setMounted(new Set(wanted)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, dimmed]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void">
      <ArtDefs />
      {mounted.has('valley') && (
        <div className="scene-layer" style={{ opacity: op.valley }}>
          <ValleyScene />
        </div>
      )}
      {mounted.has('altar') && (
        <div className="scene-layer" style={{ opacity: op.altar }}>
          <AltarScene />
        </div>
      )}
      {mounted.has('gate') && (
        <div className="scene-layer" style={{ opacity: op.gate }}>
          <GateScene layout={window.innerWidth < 640 ? 'portrait' : 'landscape'} />
        </div>
      )}
      {embers && <Embers density={scene === 'dim' ? 0.5 : 1} />}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 95% at 50% 45%, transparent 50%, rgba(0,0,0,0.88) 100%)' }} />
    </div>
  );
}
