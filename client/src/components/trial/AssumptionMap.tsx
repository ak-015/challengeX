import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { Icon } from '@/components/ui/Icon';
import type { Assumption, Competitor } from '@/lib/apiTypes';
import { cn } from '@/lib/cn';

function RiskHeader({ risk, count }: { risk: 'high' | 'medium'; count: number }) {
  return (
    <h4 className="mb-2 flex items-center gap-2 font-label text-sm font-bold uppercase tracking-wider text-ash">
      <span aria-hidden="true" className={cn('inline-block h-3 w-3 rounded-full', risk === 'high' ? 'bg-[#ff3a4b]' : 'bg-[#f2b84a]')} />
      {risk === 'high' ? 'High-risk' : 'Medium-risk'} <span className="text-ash-dim">({count})</span>
    </h4>
  );
}

export function AssumptionList({ assumptions }: { assumptions: Assumption[] }) {
  if (assumptions.length === 0) return <p className="font-prose text-sm text-ash-dim">No assumptions yet. They appear as the Challenger probes your answers.</p>;
  return (
    <div className="space-y-5">
      {(['high', 'medium'] as const).map((risk) => {
        const items = assumptions.filter((a) => a.risk === risk);
        if (items.length === 0) return null;
        return (
          <section key={risk}>
            <RiskHeader risk={risk} count={items.length} />
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((a) => (
                  <m.li key={a.id} layout initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border border-[rgba(185,176,168,0.35)] bg-[rgba(0,0,0,0.4)] p-3">
                    <CategoryTag category={a.category} />
                    <p className="mt-2 font-prose text-sm text-ash">{a.text}</p>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function RivalsList({ competitors }: { competitors: Competitor[] }) {
  if (competitors.length === 0) return <p className="font-prose text-sm text-ash-dim">Rivals are scouted when the trial begins.</p>;
  return (
    <ul className="space-y-3">
      {competitors.map((c) => (
        <li key={c.name} className="rounded-md border border-[rgba(185,176,168,0.35)] bg-[rgba(0,0,0,0.4)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-label text-base font-bold text-ash">{c.name}</p>
            <span className="rounded-full border border-[rgba(185,176,168,0.6)] px-2 py-0.5 font-label text-[11px] uppercase tracking-wider text-ash">
              {c.source === 'search' ? 'From search' : 'AI estimate, verify'}
            </span>
          </div>
          <p className="mt-1 font-prose text-sm text-ash">{c.whatTheyDo}</p>
          <p className="mt-1 font-prose text-sm text-ash-dim">
            <strong className="text-ash">Why it matters:</strong> {c.whyItMatters}
          </p>
          {c.url && (
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 break-all font-label text-sm text-crimson-text underline">
              <Icon name="link" size={16} /> {c.url.replace(/^https?:\/\//, '').slice(0, 60)}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Assumption Map with a second "Rivals" tab. Used as the desktop sidebar and inside the mobile drawer. */
export function AssumptionMap({ assumptions, competitors }: { assumptions: Assumption[]; competitors: Competitor[] }) {
  const [tab, setTab] = useState<'map' | 'rivals'>('map');
  return (
    <div>
      <div role="tablist" aria-label="Assumption map" className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-[rgba(225,29,46,0.5)] p-1">
        {(['map', 'rivals'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('min-h-[44px] rounded font-label text-xs font-bold uppercase tracking-widest', tab === t ? 'bg-crimson-btn text-white' : 'text-ash hover:bg-[rgba(225,29,46,0.15)]')}>
            {t === 'map' ? `Assumptions (${assumptions.length})` : `Rivals (${competitors.length})`}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'map' ? <AssumptionList assumptions={assumptions} /> : <RivalsList competitors={competitors} />}</div>
    </div>
  );
}
