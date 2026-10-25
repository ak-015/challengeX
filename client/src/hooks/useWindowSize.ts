import { useEffect, useState } from 'react';

/** Current viewport size, updated on resize / mobile toolbar changes. */
export function useWindowSize() {
  const read = () => ({ w: window.innerWidth, h: window.visualViewport?.height ?? window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return size;
}
