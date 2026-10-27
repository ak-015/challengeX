/** Centralized asset manifest. Originals live in frontend/ root; copies in public/assets/. */
export const assets = {
  /** Wide red-moon castle + hooded knight statue — atmospheric background */
  realmBackground: '/assets/realm-background.webp',
  /** Closed ChallengeX gate — entrance starting state */
  gateClosed: '/assets/gate-closed.webp',
  /** Open ChallengeX gate — entrance ending state */
  gateOpen: '/assets/gate-open.webp',
  /** Empty red-glowing stone frame — feature and Paths cards */
  stoneCardFrame: '/assets/stone-card-frame.webp',
  /** Gothic ritual chamber + magical circle — Paths screen */
  ritualChamber: '/assets/ritual-chamber.webp',
  /** Secondary gothic realm scene — application backgrounds and supporting sections */
  realmSecondary: '/assets/realm-secondary.webp',
} as const;
