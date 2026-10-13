import { Button } from '@/components/ui/Button';

export function Pagination({ page, pageSize, total, onPage, busy }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; busy?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <p className="font-label text-sm text-ash-dim" aria-live="polite">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="ghost" disabled={page >= pages || busy} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
