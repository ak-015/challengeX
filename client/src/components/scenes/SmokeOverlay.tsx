import { useEffect, useState } from 'react';
import { useFx } from '@/store/sceneFxStore';

/** Thick red smoke covering the screen swap. Global so it survives the route change underneath it. */
export function SmokeOverlay() {
  const key = useFx((s) => s.smokeKey);
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (!key) return;
    setVisible(key);
    const t = setTimeout(() => setVisible(0), 1150);
    return () => clearTimeout(t);
  }, [key]);
  if (!visible) return null;
  return (
    <div key={visible} className="smoke-overlay" aria-hidden="true">
      <div className="sb sb1" />
      <div className="sb sb2" />
      <div className="sb sb3" />
      <div className="sb sb4" />
      <div className="sb sb5" />
    </div>
  );
}
