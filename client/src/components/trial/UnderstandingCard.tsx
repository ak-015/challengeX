import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import type { Understanding } from '@/lib/apiTypes';
import { friendlyMessage } from '@/lib/errors';

type Field = keyof Understanding;
const FIELDS: { key: Field; label: string; max: number }[] = [
  { key: 'problem', label: 'Problem', max: 600 },
  { key: 'targetUsers', label: 'Target Users', max: 400 },
  { key: 'proposedSolution', label: 'Proposed Solution', max: 600 },
];

function EditableBlock({ label, value, max, onSave, disabled }: { label: string; value: string; max: number; onSave: (v: string) => Promise<void>; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = `u-${label.replace(/\s/g, '')}`;

  const save = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e) {
      setErr(friendlyMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-[rgba(185,176,168,0.35)] bg-[rgba(0,0,0,0.4)] p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-label text-sm font-bold uppercase tracking-wider text-crimson-text">{label}</h3>
        {!editing && (
          <button type="button" disabled={disabled} className="inline-flex min-h-[44px] items-center gap-1.5 px-2 font-label text-xs text-ash underline" onClick={() => (setDraft(value), setEditing(true))} aria-label={`Edit ${label}`}>
            <Icon name="edit" size={16} /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <textarea id={id} className="field" rows={3} maxLength={max} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          {err && <p role="alert" className="text-sm text-crimson-text">{err}</p>}
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={() => void save()} disabled={!draft.trim()}>
              Save
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap font-prose text-ash">{value}</p>
      )}
    </div>
  );
}

export function UnderstandingCard({ understanding, onSave, onBegin, busy }: { understanding: Understanding; onSave: (patch: Partial<Understanding>) => Promise<void>; onBegin: () => void; busy: boolean }) {
  return (
    <GlassPanel className="w-full space-y-4 p-5 sm:p-7">
      <div className="text-center">
        <Heading level={2}>Is this your idea?</Heading>
        <p className="mt-2 font-prose text-ash-dim">The Challenger understood it like this. Fix anything that is wrong. Your edits become the truth.</p>
      </div>
      {FIELDS.map((f) => (
        <EditableBlock key={f.key} label={f.label} max={f.max} value={understanding[f.key]} disabled={busy} onSave={(v) => onSave({ [f.key]: v })} />
      ))}
      <div className="text-center">
        <Button onClick={onBegin} loading={busy} className="w-full sm:w-auto sm:px-10">
          This is right, begin
        </Button>
        {busy && <p role="status" className="mt-3 font-label text-ash">Scouting the realm for rivals…</p>}
      </div>
    </GlassPanel>
  );
}
