// Ornate corner flourishes for panels. Decorative only.
const FLOURISH = 'M2 26V10Q2 2 10 2H26M8 8Q8 5.5 10.5 5.5H17M5.5 17V10.5Q5.5 8 8 8M13 13l3 3-3 3-3-3z';

function Corner({ className, rotate }: { className: string; rotate: number }) {
  return (
    <svg
      viewBox="0 0 30 30"
      width={30}
      height={30}
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute ${className}`}
      style={{ transform: `rotate(${rotate}deg)`, color: 'var(--crimson-text)' }}
    >
      <path d={FLOURISH} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Corners() {
  return (
    <>
      <Corner className="-left-px -top-px" rotate={0} />
      <Corner className="-right-px -top-px" rotate={90} />
      <Corner className="-bottom-px -right-px" rotate={180} />
      <Corner className="-bottom-px -left-px" rotate={270} />
    </>
  );
}
