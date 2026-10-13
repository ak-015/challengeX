import { useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { Gauge } from './Gauge';
import { Radar } from './Radar';
import { VerdictBadge } from './VerdictBadge';
import { radarScores, type VerdictData } from './verdictData';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { useSequence } from '@/hooks/useSequence';
import { CATEGORIES, CATEGORY_LABEL, MODES, VERDICT_STYLE } from '@/lib/constants';
import { cn } from '@/lib/cn';

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <m.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
      {children}
    </m.div>
  );
}

function EffortBadge({ effort }: { effort: 'low' | 'medium' | 'high' }) {
  const n = effort === 'low' ? 1 : effort === 'medium' ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(185,176,168,0.6)] px-2.5 py-0.5 font-label text-xs font-semibold uppercase tracking-wider text-ash">
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={i * 6} y={10 - (i + 1) * 3.3} width="4" height={(i + 1) * 3.3} fill={i < n ? '#ff8a93' : '#4a3a3c'} />
        ))}
      </svg>
      {effort} effort
    </span>
  );
}

const H2 = ({ children }: { children: ReactNode }) => (
  <div className="mb-4">
    <Heading level={2}>{children}</Heading>
  </div>
);

export function VerdictView({ data, actions, animate = true }: { data: VerdictData; actions?: ReactNode; animate?: boolean }) {
  const { count, showAll } = useSequence([0, 1900, 2600, 3300, 4000, 4700, 5400, 6100], !animate);
  const [open, setOpen] = useState<string | null>(null);
  const style = VERDICT_STYLE[data.verdict];
  const scores = radarScores(data);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2">
      {count < 8 && (
        <div className="flex justify-end">
          <button type="button" className="min-h-[44px] px-2 font-label text-xs text-ash-dim underline" onClick={showAll}>
            Skip animation
          </button>
        </div>
      )}

      {/* (a) gauge + (b) badge and summary */}
      <GlassPanel className="p-5 sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <Gauge score={data.totalScore} verdict={data.verdict} animate={animate} size={230} />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="font-label text-xs uppercase tracking-[0.25em] text-ash-dim">{data.mode ? MODES[data.mode].label : 'Trial'} · Market readiness</p>
            <h1 className="font-display text-2xl font-bold text-ash sm:text-3xl">{data.title}</h1>
            {count >= 2 && (
              <>
                <VerdictBadge verdict={data.verdict} stamp={animate} />
                <p className="font-label text-sm" style={{ color: style.text }}>
                  {style.blurb}
                </p>
                <p className="font-prose text-base leading-relaxed text-ash">{data.summary}</p>
              </>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* (c) low confidence */}
      <Reveal show={count >= 2 && data.lowConfidence}>
        <div role="note" className="flex items-start gap-3 rounded-md border border-[#f2b84a] bg-[#2a1d05] p-4 text-ash">
          <Icon name="warning" size={22} className="mt-0.5 shrink-0 text-[#ffd27a]" />
          <p className="font-prose">
            <strong className="font-label">Low confidence:</strong>{' '}
            {data.skippedCount !== undefined ? `you skipped ${data.skippedCount} questions` : 'several questions were skipped'}, so this verdict rests on less evidence. Answer them next time for a sharper result.
          </p>
        </div>
      </Reveal>

      {/* (d) radar */}
      <Reveal show={count >= 3}>
        <GlassPanel className="p-5 sm:p-8">
          <H2>The seven risk areas</H2>
          <Radar scores={scores} animate={animate} />
          <ul className="mt-4 divide-y divide-[rgba(185,176,168,0.2)]">
            {CATEGORIES.map((c) => {
              const cs = data.categoryScores[c];
              const isOpen = open === c;
              return (
                <li key={c}>
                  <button type="button" aria-expanded={isOpen} aria-controls={`why-${c}`} onClick={() => setOpen(isOpen ? null : c)} className="flex min-h-[48px] w-full items-center justify-between gap-3 py-2 text-left">
                    <span className="font-label text-base font-semibold text-ash">{CATEGORY_LABEL[c]}</span>
                    <span className="flex items-center gap-2 font-label text-sm text-ash">
                      {cs?.finalScore.toFixed(1)} / 10
                      <Icon name="chevronDown" size={18} className={cn('transition-transform', isOpen && 'rotate-180')} />
                    </span>
                  </button>
                  {isOpen && cs && (
                    <p id={`why-${c}`} className="pb-3 font-prose text-ash-dim">
                      {cs.rationale}
                      {cs.penalty > 0 && <span className="mt-1 block text-sm text-[#ffd27a]">−{cs.penalty.toFixed(1)} for skipped questions in this area.</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </GlassPanel>
      </Reveal>

      {/* (e) struggles */}
      <Reveal show={count >= 4}>
        <section aria-labelledby="struggle-h">
          <div id="struggle-h"><H2>Where you’ll struggle</H2></div>
          <ul className="grid gap-4 md:grid-cols-2">
            {data.struggles.map((s, i) => (
              <li key={i}>
                <GlassPanel className="h-full space-y-3 p-5">
                  <CategoryTag category={s.category} />
                  <h3 className="font-label text-lg font-bold text-ash">{s.title}</h3>
                  <p className="font-prose text-ash-dim">{s.why}</p>
                  <p className="rounded border border-[rgba(185,176,168,0.3)] bg-black/40 p-2.5 font-prose text-sm text-ash">
                    {s.answerExcerpt === 'skipped' ? <em>You skipped this</em> : <>You said: “{s.answerExcerpt}”</>}
                  </p>
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* (f) fixes */}
      <Reveal show={count >= 5}>
        <section aria-labelledby="fix-h">
          <div id="fix-h"><H2>How to overcome them</H2></div>
          <ol className="space-y-3">
            {data.fixes.map((f, i) => (
              <li key={i}>
                <GlassPanel className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-label text-sm font-bold uppercase tracking-wider text-crimson-text">For: {data.struggles[f.struggleIndex]?.title ?? `struggle ${f.struggleIndex + 1}`}</p>
                    <EffortBadge effort={f.effort} />
                  </div>
                  <p className="font-prose text-ash">{f.action}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* (g) alternatives */}
      <Reveal show={count >= 6}>
        <section aria-labelledby="alt-h">
          <div id="alt-h"><H2>Alternative directions</H2></div>
          <ul className="grid gap-4 md:grid-cols-3">
            {data.alternatives.map((a, i) => (
              <li key={i}>
                <GlassPanel className="h-full space-y-2 p-5">
                  <h3 className="font-label text-lg font-bold text-ash">{a.title}</h3>
                  <p className="font-prose text-ash">{a.pitch}</p>
                  <p className="font-prose text-sm text-ash-dim"><strong className="text-ash">What changes:</strong> {a.whatChanges}</p>
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* (h) experiment */}
      <Reveal show={count >= 7 && !!data.validationExperiment}>
        {data.validationExperiment && (
          <section aria-labelledby="exp-h">
            <div id="exp-h"><H2>Cheapest validation experiment</H2></div>
            <GlassPanel className="space-y-4 p-5 sm:p-7">
              <p className="font-prose text-lg text-ash">{data.validationExperiment.description}</p>
              <dl className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Metric', data.validationExperiment.metric],
                  ['Sample size', data.validationExperiment.sampleSize],
                  ['Duration', `${data.validationExperiment.durationDays} days`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded border border-[rgba(185,176,168,0.3)] bg-black/40 p-3">
                    <dt className="font-label text-xs uppercase tracking-wider text-ash-dim">{k}</dt>
                    <dd className="mt-1 font-prose text-ash">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2">
                {([
                  ['Build if…', data.validationExperiment.buildIf, 'BUILD'],
                  ['Pivot if…', data.validationExperiment.pivotIf, 'PIVOT'],
                  ['Kill if…', data.validationExperiment.killIf, 'KILL'],
                ] as const).map(([label, text, v]) => (
                  <div key={label} className="flex gap-3 rounded border-l-4 bg-black/40 p-3" style={{ borderColor: VERDICT_STYLE[v].ring }}>
                    <span className="w-20 shrink-0 font-label text-sm font-bold" style={{ color: VERDICT_STYLE[v].text }}>{label}</span>
                    <span className="font-prose text-ash">{text}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </section>
        )}
      </Reveal>

      {/* (i) competitors */}
      <Reveal show={count >= 8 && data.competitors.length > 0}>
        <section aria-labelledby="comp-h">
          <div id="comp-h"><H2>The rivals</H2></div>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.competitors.map((c) => (
              <li key={c.name}>
                <GlassPanel className="h-full space-y-1 p-4" corners={false}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-label font-bold text-ash">{c.name}</p>
                    <span className="rounded-full border border-[rgba(185,176,168,0.6)] px-2 py-0.5 font-label text-[11px] uppercase tracking-wider text-ash">{c.source === 'search' ? 'From search' : 'AI estimate, verify'}</span>
                  </div>
                  <p className="font-prose text-sm text-ash">{c.whatTheyDo}</p>
                  <p className="font-prose text-sm text-ash-dim">{c.whyItMatters}</p>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 break-all font-label text-sm text-crimson-text underline">
                      <Icon name="link" size={14} /> {c.url.replace(/^https?:\/\//, '').slice(0, 50)}
                    </a>
                  )}
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {actions && count >= 3 && <div className="flex flex-wrap items-center justify-center gap-3 pb-6">{actions}</div>}
    </div>
  );
}
