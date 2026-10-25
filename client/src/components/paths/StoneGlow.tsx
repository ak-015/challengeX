import { assets } from '@/utils/assets';
import { STONE_GEMS } from './stoneFrameGems';

/**
 * Makes the stones of the frame glow: a contrast-isolated copy of the frame art (only the
 * red-lit pixels survive) breathes over the original, and every ruby gets its own pulsing
 * halo + twinkling cross-flare, each on a different phase so the frame shimmers rather than
 * blinks. Pure CSS — see `.stone-glow` in styles/index.css.
 */
export function StoneGlow({ seed = 0 }: { seed?: number }) {
  return (
    <div className="stone-glow" aria-hidden>
      <img src={assets.stoneCardFrame} alt="" className="stone-glow-iso" draggable={false} style={{ animationDelay: `${-seed * 0.9}s` }} />
      {STONE_GEMS.map((g, i) => (
        <span
          key={i}
          className="gem"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${g.r * 2.6}%`,
            animationDuration: `${2.7 + ((i * 7 + seed * 3) % 5) * 0.45}s`,
            animationDelay: `${-((i * 0.37 + seed * 0.61) % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}
