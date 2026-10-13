import { useState } from 'react';
import { adminApi, type AuditEntry } from '../adminApi';
import { auditLabel } from '../rules';
import { useAsync } from '../useAsync';
import { AdminTable, type Col } from '../ui/AdminTable';
import { Pagination } from '../ui/Pagination';
import { ErrorState } from '../ui/States';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { exactDate, relativeTime } from '@/lib/format';

export default function Audit() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync((s) => adminApi.audit(page, { signal: s }), [page]);
  const cols: Col<AuditEntry>[] = [
    { key: 'when', header: 'When', card: 'title', cell: (r) => <time dateTime={r.createdAt} title={exactDate(r.createdAt)} className="font-label text-sm text-ash">{exactDate(r.createdAt)} <span className="text-ash-dim">({relativeTime(r.createdAt)})</span></time> },
    { key: 'admin', header: 'Admin', cell: (r) => <span className="break-all">{r.adminEmail ?? (r.adminId ? r.adminId.slice(0, 8) : 'deleted admin')}</span> },
    { key: 'action', header: 'Action', cell: (r) => <span><strong className="font-label">{auditLabel(r.action)}</strong> <span className="text-ash-mute">({r.action})</span></span> },
    { key: 'target', header: 'Target', cell: (r) => <span className="break-all">{r.target}</span> },
  ];
  return (
    <div className="space-y-4">
      <Heading level={2}>Audit log</Heading>
      <p className="font-prose text-sm text-ash-dim">Every admin write (suspend, promote, delete, revoke, reset) is recorded here by the server. Newest first.</p>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <GlassPanel corners={false} className="overflow-hidden">
          <AdminTable caption="Admin audit log" columns={cols} rows={data?.items ?? null} rowKey={(r) => r.id} loading={loading} empty={{ title: 'The log is empty', text: 'Admin actions will appear here.' }} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={loading} />}
        </GlassPanel>
      )}
    </div>
  );
}
