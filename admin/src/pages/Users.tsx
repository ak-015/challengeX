import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminUser } from '../adminApi';
import { userActionState } from '../rules';
import { useAsync, useDebounced } from '../useAsync';
import { AdminTable, type Col } from '../ui/AdminTable';
import { TypeToConfirmDialog } from '../ui/Dialogs';
import { Pagination } from '../ui/Pagination';
import { Pill } from '../ui/Pill';
import { ErrorState } from '../ui/States';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { friendlyMessage } from '@/lib/errors';
import { exactDate, relativeTime } from '@/lib/format';
import { useAuth } from '@/store/authStore';

type Action = { type: 'suspend' | 'activate' | 'promote' | 'demote' | 'delete'; user: AdminUser };

const COPY: Record<Action['type'], { title: string; verb: string; text: (u: AdminUser) => string }> = {
  suspend: { title: 'Suspend this user?', verb: 'Suspend', text: (u) => `${u.email} will be signed out on their next request and cannot sign in until re-activated.` },
  activate: { title: 'Re-activate this user?', verb: 'Activate', text: (u) => `${u.email} will be able to sign in again.` },
  promote: { title: 'Promote to admin?', verb: 'Promote', text: (u) => `${u.email} will get full admin access to this panel and every /api/admin endpoint.` },
  demote: { title: 'Demote this admin?', verb: 'Demote', text: (u) => `${u.email} loses admin access immediately (every existing session is cut off).` },
  delete: { title: 'Delete this user permanently?', verb: 'Delete', text: (u) => `${u.email}, all their trials, roadmaps and shares, and their avatar will be erased. This cannot be undone.` },
};

export default function Users() {
  const me = useAuth((s) => s.user);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q, 350);
  const { data, error, loading, reload } = useAsync((s) => adminApi.users({ q: dq, page }, { signal: s }), [dq, page]);

  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async () => {
    if (!action || busy) return;
    setBusy(true);
    setActErr(null);
    try {
      const { type, user } = action;
      if (type === 'delete') await adminApi.deleteUser(user.id);
      else if (type === 'suspend') await adminApi.patchUser(user.id, { status: 'suspended' });
      else if (type === 'activate') await adminApi.patchUser(user.id, { status: 'active' });
      else if (type === 'promote') await adminApi.patchUser(user.id, { role: 'admin' });
      else await adminApi.patchUser(user.id, { role: 'user' });
      setNotice(`${COPY[type].verb}: done for ${user.email}. Recorded in the audit log.`);
      setAction(null);
      reload();
    } catch (e) {
      setActErr(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cols: Col<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      card: 'title',
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={u.displayName} url={u.avatarUrl} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-label text-sm font-semibold text-ash">{u.displayName}</span>
            <span className="block break-all font-prose text-xs text-ash-dim">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'verified', header: 'Verified', cell: (u) => (u.emailVerified ? <Pill tone="ok" icon="check">Yes</Pill> : <Pill tone="warn" icon="warning">No</Pill>) },
    { key: 'role', header: 'Role', cell: (u) => (u.role === 'admin' ? <Pill tone="info">Admin{u.protected ? ' · seeded' : ''}</Pill> : <Pill>User</Pill>) },
    { key: 'status', header: 'Status', cell: (u) => (u.status === 'active' ? <Pill tone="ok">Active</Pill> : <Pill tone="bad" icon="warning">Suspended</Pill>) },
    { key: 'created', header: 'Created', cell: (u) => <time dateTime={u.createdAt} title={exactDate(u.createdAt)}>{relativeTime(u.createdAt)}</time> },
    { key: 'login', header: 'Last login', cell: (u) => (u.lastLoginAt ? <time dateTime={u.lastLoginAt} title={exactDate(u.lastLoginAt)}>{relativeTime(u.lastLoginAt)}</time> : 'never') },
    { key: 'trials', header: 'Trials', cell: (u) => u.trialCount },
  ];

  const actions = (u: AdminUser) => {
    const st = userActionState(u, me?.id);
    const btn = 'whitespace-nowrap';
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {u.status === 'active' ? (
            <Button size="sm" variant="quiet" className={btn} disabled={st.locked} onClick={() => (setActErr(null), setAction({ type: 'suspend', user: u }))}>Suspend</Button>
          ) : (
            <Button size="sm" variant="quiet" className={btn} disabled={st.locked} onClick={() => (setActErr(null), setAction({ type: 'activate', user: u }))}>Activate</Button>
          )}
          {u.role === 'admin' ? (
            <Button size="sm" variant="quiet" className={btn} disabled={st.locked} onClick={() => (setActErr(null), setAction({ type: 'demote', user: u }))}>Demote</Button>
          ) : (
            <Button size="sm" variant="quiet" className={btn} disabled={!u.emailVerified || u.status !== 'active'} title={!u.emailVerified ? 'Only verified, active users can be promoted' : undefined} onClick={() => (setActErr(null), setAction({ type: 'promote', user: u }))}>Promote</Button>
          )}
          <Button size="sm" variant="danger" className={btn} disabled={st.locked} onClick={() => (setActErr(null), setAction({ type: 'delete', user: u }))}>Delete</Button>
          <Link to={`/sessions?user=${u.id}`} className="btn btn-quiet btn-sm whitespace-nowrap">Sessions</Link>
        </div>
        {st.reason && <p className="max-w-xs font-prose text-xs text-[#ffd27a]">{st.reason}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Heading level={2}>Users</Heading>
      <GlassPanel corners={false} className="p-3">
        <label htmlFor="user-search" className="mb-1 block font-label text-sm text-ash">Search by name or email</label>
        <input id="user-search" type="search" className="field" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="e.g. alice@example.com" maxLength={100} />
      </GlassPanel>

      <div aria-live="polite">{notice && <p role="status" className="rounded border border-[#3fcf7f] bg-[#0b2417] p-3 text-sm text-[#b8f5cf]">{notice}</p>}</div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <GlassPanel corners={false} className="overflow-hidden">
          <AdminTable caption="Users" columns={cols} rows={data?.items ?? null} rowKey={(u) => u.id} loading={loading} actions={actions} empty={{ title: 'No users found', text: dq ? 'Try a different search.' : undefined }} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={loading} />}
        </GlassPanel>
      )}

      {action && action.type === 'delete' && (
        <TypeToConfirmDialog title={COPY.delete.title} message={COPY.delete.text(action.user)} phrase={action.user.email} busy={busy} error={actErr} onConfirm={() => void run()} onCancel={() => setAction(null)} />
      )}
      {action && action.type !== 'delete' && (
        <ConfirmDialog title={COPY[action.type].title} message={COPY[action.type].text(action.user)} confirmLabel={COPY[action.type].verb} busy={busy} error={actErr} onConfirm={() => void run()} onCancel={() => setAction(null)} />
      )}
    </div>
  );
}
