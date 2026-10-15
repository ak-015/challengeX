import type { SVGProps } from 'react';

// Inline line-art icons (no icon pack). All are 24x24, stroke = currentColor.
const PATHS = {
  back: 'M15 5l-7 7 7 7M8 12h12',
  sound: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  mute: 'M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  history: 'M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 4v4h4M12 7v5l3 2',
  logout: 'M9 4H5v16h4M16 8l5 4-5 4M21 12H9',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A9.7 9.7 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.4 6.4A17 17 0 002 12s4 7 10 7a9.8 9.8 0 004.2-.9M9.9 9.9a3 3 0 004.2 4.2',
  check: 'M5 12.5l4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
  warning: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.5',
  retry: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  sword: 'M14.5 4.5L20 4l-.5 5.5L9 20l-5-5L14.5 4.5zM4 20l3-3M9 15l-2 2',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14',
  scroll: 'M7 4h11a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6M7 4a2 2 0 00-2 2v1h3M10 9h7M10 13h7M10 17h5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  skull: 'M12 3a8 8 0 00-5 14v3h3v-2h4v2h3v-3a8 8 0 00-5-14zM9 12h.01M15 12h.01M11 16h2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 11a3 3 0 100-6M18 14c2.5.5 4 2.5 4 5',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v2M12 16v2',
  scale: 'M12 3v18M6 21h12M5 7h14M5 7l-3 8a3.5 3.5 0 006 0L5 7zM19 7l-3 8a3.5 3.5 0 006 0l-3-8z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 9L4 4M15 9l5-5M9 15l-5 5M15 15l5 5',
  swords: 'M4 4l7 7M20 4l-7 7M9 15l-5 5M15 15l5 5M11 11l-2 4 4 2 2-4',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  hammer: 'M14 7l3 3M3 21l9-9M12 12l-2-2 6-6 4 4-6 6-2-2z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  image: 'M4 5h16v14H4zM8 10a1.5 1.5 0 100-3M4 17l5-5 4 4 3-3 4 4',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  zoomIn: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M11 8v6M8 11h6',
  zoomOut: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6',
  fit: 'M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
} as const;

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 22, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
