import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { EmptyState } from './States';
import { TableSkeleton } from './Skeleton';

export interface Col<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** how the column appears in the mobile card layout */
  card?: 'title' | 'row' | 'hide';
  className?: string;
}

interface Props<T> {
  caption: string;
  columns: Col<T>[];
  rows: T[] | null;
  rowKey: (r: T) => string;
  loading?: boolean;
  empty?: { title: string; text?: string };
  /** rendered in the last column / bottom of each card */
  actions?: (r: T) => ReactNode;
}

/** Accessible table at md+ (real <table>, scoped headers, caption); a card list on small screens. Same column definitions. */
export function AdminTable<T>({ caption, columns, rows, rowKey, loading, empty, actions }: Props<T>) {
  if (loading && !rows) return <TableSkeleton />;
  if (rows && rows.length === 0) return <EmptyState title={empty?.title ?? 'Nothing here'} text={empty?.text} />;
  if (!rows) return null;
  const title = columns.find((c) => c.card === 'title') ?? columns[0];
  return (
    <div aria-busy={loading || undefined} className={cn(loading && 'opacity-60 transition-opacity')}>
      {/* desktop */}
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[rgba(225,29,46,0.4)]">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('whitespace-nowrap px-3 py-2 font-label text-xs font-bold uppercase tracking-wider text-ash-dim', c.className)}>
                  {c.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-3 py-2 font-label text-xs font-bold uppercase tracking-wider text-ash-dim">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-[rgba(185,176,168,0.15)] align-top hover:bg-[rgba(225,29,46,0.07)]">
                {columns.map((c, i) =>
                  i === 0 ? (
                    <th key={c.key} scope="row" className={cn('px-3 py-2 text-left font-normal text-ash', c.className)}>
                      {c.cell(r)}
                    </th>
                  ) : (
                    <td key={c.key} className={cn('px-3 py-2 font-prose text-sm text-ash', c.className)}>
                      {c.cell(r)}
                    </td>
                  ),
                )}
                {actions && <td className="px-3 py-2">{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile (360px) cards */}
      <ul className="space-y-3 p-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-md border border-[rgba(185,176,168,0.3)] bg-[rgba(0,0,0,0.4)] p-3">
            <div className="mb-2 min-w-0 break-words">{title?.cell(r)}</div>
            <dl className="space-y-1.5">
              {columns
                .filter((c) => c !== title && c.card !== 'hide')
                .map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 font-label text-[11px] uppercase tracking-wider text-ash-dim">{c.header}</dt>
                    <dd className="min-w-0 break-words text-right font-prose text-sm text-ash">{c.cell(r)}</dd>
                  </div>
                ))}
            </dl>
            {actions && <div className="mt-3 border-t border-[rgba(185,176,168,0.2)] pt-3">{actions(r)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
