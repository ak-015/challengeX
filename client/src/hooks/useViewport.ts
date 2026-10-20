import { useEffect, useState } from 'react';

/** True below the Tailwind `md` breakpoint. Used to thin out heavy effects on phones. */
export function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const on = () => setMobile(window.innerWidth < breakpoint);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [breakpoint]);
  return mobile;
}

export interface StageLayout {
  mode: 'cover' | 'fit';
  w: number;
  h: number;
  left: number;
  top: number;
  vw: number;
  vh: number;
}

/** Artwork is 16:9. Landscape → cover the viewport. Portrait → show the central
 *  ~70% of the picture at a readable size, centred slightly above the middle. */
function computeLayout(): StageLayout {
  const vw = window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  if (vw / vh >= 1.15) {
    const w = Math.max(vw, (vh * 16) / 9);
    const h = (w * 9) / 16;
    return { mode: 'cover', w, h, left: (vw - w) / 2, top: (vh - h) / 2, vw, vh };
  }
  const w = vw * 1.85;
  const h = (w * 9) / 16;
  return { mode: 'fit', w, h, left: (vw - w) / 2, top: Math.max(0, vh * 0.42 - h / 2), vw, vh };
}

export function useStageLayout(): StageLayout {
  const [layout, setLayout] = useState<StageLayout>(computeLayout);
  useEffect(() => {
    const on = () => setLayout(computeLayout());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return layout;
}
