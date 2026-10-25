import type { ReactNode } from 'react';
import { RealmScene } from '@/components/realm/RealmScene';
import { useWindowSize } from '@/hooks/useWindowSize';

/**
 * Sign-in / sign-up window: the realm gate is the backdrop and the form panel is set over
 * its door, with the dragon looking down from above. The panel is laid out at a fixed design
 * size and scaled with the artwork (same `cover` math the live scene uses), so it always
 * lines up with the door; on small screens it scales down to fit instead of reflowing.
 */

const ART_W = 1672;
const ART_H = 941;
const DOOR_X = 883; // door centre in the artwork
const PANEL_W = 440; // design width of the panel (px, before scaling)
const PANEL_TOP = 196; // top edge of the panel in the artwork: just under the dragon's eyes

function geometry(W: number, H: number, panelH: number) {
  const s = Math.max(W / ART_W, H / ART_H);
  const overflowX = ART_W * s - W;
  // keep the door centred whenever the artwork is cropped sideways
  const ox = Math.min(0, Math.max(-overflowX, W / 2 - DOOR_X * s));
  const oy = (H - ART_H * s) / 2;
  const objX = overflowX > 0.5 ? -ox / overflowX : 0.5;
  const doorX = ox + DOOR_X * s;
  const top = Math.max(oy + PANEL_TOP * s, 8);
  let p = Math.min(s, (W - 24) / PANEL_W, (H - 14 - top) / panelH);
  p = Math.max(p, 0.7); // below this, let the page scroll instead of shrinking further
  const left = Math.min(Math.max(doorX - (PANEL_W * p) / 2, 12), Math.max(12, W - 12 - PANEL_W * p));
  return { objX, left, top, p, needed: top + panelH * p + 20 };
}

/** The ornate frame: jagged outer silhouette with corner spikes, a raised crest where the
    dragon sits, an inner rule with notched corners and small diamond ornaments. */
function Frame({ h }: { h: number }) {
  const W = PANEL_W;
  const c = W / 2;
  const outer =
    `M30 16 L${c - 92} 16 L${c - 72} 6 L${c + 72} 6 L${c + 92} 16 L${W - 30} 16 L${W - 8} 0 L${W - 3} 30 L${W - 10} 46 ` +
    `L${W - 10} ${h - 46} L${W - 3} ${h - 30} L${W - 8} ${h} L${W - 30} ${h - 16} L${c + 92} ${h - 16} L${c + 72} ${h - 6} ` +
    `L${c - 72} ${h - 6} L${c - 92} ${h - 16} L30 ${h - 16} L8 ${h} L3 ${h - 30} L10 ${h - 46} L10 46 L3 30 L8 0 Z`;
  const inner =
    `M36 30 H${W - 36} L${W - 24} 42 V${h - 42} L${W - 36} ${h - 30} H36 L24 ${h - 42} V42 Z`;
  const diamond = (x: number, y: number, r = 5) => `M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`;
  return (
    <svg className="absolute inset-0 overflow-visible" width={W} height={h} viewBox={`0 0 ${W} ${h}`} aria-hidden>
      <defs>
        <radialGradient id="ag-fill" cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#170709" />
          <stop offset="1" stopColor="#060203" />
        </radialGradient>
        <filter id="ag-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={outer} fill="url(#ag-fill)" fillOpacity="0.97" stroke="#d40a26" strokeWidth="1.7" strokeLinejoin="miter" filter="url(#ag-glow)" />
      <path d={inner} fill="none" stroke="#a30a1e" strokeOpacity="0.75" strokeWidth="1" />
      <path d={`${diamond(c, 30, 6)} ${diamond(c, h - 30, 6)}`} fill="#e50920" opacity="0.95" />
      <path d={`${diamond(46, 40, 3.2)} ${diamond(W - 46, 40, 3.2)} ${diamond(46, h - 40, 3.2)} ${diamond(W - 46, h - 40, 3.2)}`} fill="#e50920" opacity="0.8" />
    </svg>
  );
}

export function AuthGate({ children, height = 712 }: { children: ReactNode; /** design height of the panel */ height?: number }) {
  const { w, h } = useWindowSize();
  const g = geometry(w, h, height);

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-background">
      <RealmScene scene="gate" fixed objectPosition={[g.objX, 0.5]} scrim="linear-gradient(rgba(5,3,4,0.10), rgba(5,3,4,0.30))" />
      <div className="relative z-10" style={{ minHeight: Math.max(h, g.needed) }}>
        <main
          className="absolute"
          style={{ left: g.left, top: g.top, width: PANEL_W, height, transform: `scale(${g.p})`, transformOrigin: 'top left' }}
        >
          <Frame h={height} />
          <div className="auth-scroll relative h-full overflow-y-auto" style={{ padding: '58px 44px 50px' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
