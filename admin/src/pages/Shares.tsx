import { useState } from 'react';
import { adminApi, type AdminShare } from '../adminApi';
import { useAsync } from '../useAsync';
import { AdminTable, type Col } from '../ui/AdminTable';
import { Pagination } from '../ui/Pagination';
import { Pill } from '../ui/Pill';
import { ErrorState } from '../ui/States';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { friendlyMessage } from '@/lib/errors';
import { exactDate, relativeTime } from '@/lib/format';

export default function Shares() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync((s) => adminApi.shares(page, { signal: s }), [page]);
  const [target, setTarget] = useState<AdminShare | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const revoke = async () => {
    if (!target) return;
    setBusy(true);
    setErr(null);
    try {
      await adminApi.revokeShare(target.slug);
      setNotice(`Share ${target.slug} revoked. Its public link now returns 404. Recorded in the audit log.`);
      setTarget(null);
      reload();
    } catch (e) {
      setErr(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cols: Col<AdminShare>[] = [
    {
      key: 'slug',
      header: 'Link',
      card: 'title',
      cell: (r) => (
        <a href={`/s/${r.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 break-all font-label text-sm text-crimson-text underline">
          <Icon name="link" size={14} /> /s/{r.slug}
        </a>
      ),
    },
    { key: 'kind', header: 'Kind', cell: (r) => <Pill>{r.kind}</Pill> },
    { key: 'owner', header: 'Owner', cell: (r) => <span className="break-all">{r.userEmail ?? r.userId.slice(0, 8)}</span> },
    { key: 'created', header: 'Created', cell: (r) => <time dateTime={r.createdAt} title={exactDate(r.createdAt)}>{relativeTime(r.createdAt)}</time> },
    { key: 'state', header: 'State', cell: (r) => (r.revoked ? <Pill tone="bad" icon="close">Revoked</Pill> : <Pill tone="ok" icon="check">Active</Pill>) },
  ];

  return (
    <div className="space-y-4">
      <Heading level={2}>Shares</Heading>
      <div aria-live="polite">{notice && <p role="status" className="rounded border border-[#3fcf7f] bg-[#0b2417] p-3 text-sm text-[#b8f5cf]">{notice}</p>}</div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <GlassPanel corners={false} className="overflow-hidden">
          <AdminTable
            caption="Public shares"
            columns={cols}
            rows={data?.items ?? null}
            rowKey={(r) => r.slug}
            loading={loading}
            empty={{ title: 'No shares yet', text: 'Shares appear when a user exports a verdict or roadmap.' }}
            actions={(r) => (
              <Button size="sm" variant="danger" disabled={r.revoked} onClick={() => (setErr(null), setTarget(r))}>
                {r.revoked ? 'Revoked' : 'Revoke'}
              </Button>
            )}
          />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={loading} />}
        </GlassPanel>
      )}
      {target && <ConfirmDialog title="Revoke this share?" message={`The public link /s/${target.slug} (owner: ${target.userEmail ?? 'unknown'}) will stop working immediately.`} confirmLabel="Revoke" busy={busy} error={err} onConfirm={() => void revoke()} onCancel={() => setTarget(null)} />}
    </div>
  );
}
