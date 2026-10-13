export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  tip: string;
}

/** Simple, honest strength hint (length + character variety). Not a security guarantee. */
export function passwordStrength(pw: string): Strength {
  if (pw.length < 8) return { score: 0, label: 'Too short', tip: 'Use at least 8 characters.' };
  let s = 0;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, Math.max(1, s)) as 1 | 2 | 3 | 4;
  const label = (['Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const)[score];
  const tip = score >= 3 ? 'Nice and sturdy.' : 'Add length, mixed case, numbers or symbols.';
  return { score, label, tip };
}
