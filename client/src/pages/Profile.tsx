import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarCropper, type CropResult } from '@/components/profile/AvatarCropper';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { auth, profile, roadmaps, trials, uploads } from '@/lib/endpoints';
import { friendlyMessage, isAbort } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';
import { usePrefs } from '@/store/prefsStore';

/** Real counters from the list endpoints (total per kind / saved). No fabricated numbers. */
interface Stats {
  trials: number;
  saved: number;
  ideas: number;
  roadmaps: number;
}

export function Component() {
  useDocumentTitle('Profile');
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const prefs = usePrefs();

  const [name, setName] = useState(user?.displayName ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cropping, setCropping] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [upPct, setUpPct] = useState(0);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  // Real stats from the sessions list API.
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      trials.list({ kind: 'trial', pageSize: 1 }, { signal: c.signal }),
      trials.list({ kind: 'trial', saved: true, pageSize: 1 }, { signal: c.signal }),
      trials.list({ kind: 'ideas', pageSize: 1 }, { signal: c.signal }),
      roadmaps.list(1, { signal: c.signal }),
    ])
      .then(([t, sv, i, r]) => setStats({ trials: t.total, saved: sv.total, ideas: i.total, roadmaps: r.total }))
      .catch((e) => !isAbort(e) && setStatsErr(friendlyMessage(e)));
    return () => c.abort();
  }, []);

  if (!user) return null;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v || nameBusy) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      const r = await auth.updateMe({ displayName: v });
      setUser(r.user);
      setNameMsg({ ok: true, text: 'Name updated.' });
    } catch (err) {
      setNameMsg({ ok: false, text: friendlyMessage(err) });
    } finally {
      setNameBusy(false);
    }
  };

  const uploadAvatar = async ({ blob, crop }: CropResult) => {
    if (upBusy) return;
    setUpBusy(true);
    setUpErr(null);
    setUpPct(0);
    try {
      const signed = await uploads.sign({ purpose: 'avatar', crop });
      const up = await uploadToCloudinary(signed, blob, 'avatar.jpg', setUpPct);
      const saved = await profile.saveAvatar({ secureUrl: up.secureUrl, publicId: up.publicId });
      setUser({ ...useAuth.getState().user!, avatarUrl: saved.avatarUrl }); // updates the TopBar instantly
      setCropping(false);
    } catch (err) {
      setUpErr(err instanceof Error && !('code' in err) ? err.message : friendlyMessage(err));
    } finally {
      setUpBusy(false);
    }
  };

  const toggle = (checked: boolean, on: (v: boolean) => void, label: string, hint?: string) => (
    <label className="flex min-h-[48px] cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" className="mt-1 h-5 w-5 accent-[#c4081d]" checked={checked} onChange={(e) => on(e.target.checked)} />
      <span>
        <span className="block font-label text-sm font-semibold text-ash">{label}</span>
        {hint && <span className="block font-prose text-base text-ash-dim">{hint}</span>}
      </span>
    </label>
  );

  const statCells: { label: string; value: number | null; icon: 'sword' | 'star' | 'bulb' | 'map' }[] = [
    { label: 'Trials Taken', value: stats ? stats.trials : null, icon: 'sword' },
    { label: 'Saved Verdicts', value: stats ? stats.saved : null, icon: 'star' },
    { label: 'Idea Sets Generated', value: stats ? stats.ideas : null, icon: 'bulb' },
    { label: 'Roadmaps Forged', value: stats ? stats.roadmaps : null, icon: 'map' },
  ];

  return (
    <div className="safe-pad mx-auto max-w-3xl space-y-5 py-6">
      <div className="text-center">
        <p className="eyebrow mb-2">Your Corner of the Realm</p>
        <Heading level={1}>Profile</Heading>
        <div className="rune-divider mt-3" aria-hidden="true">
          <span />
        </div>
        <p className="mx-auto mt-3 max-w-lg font-prose text-lg text-ash-dim">Manage your profile, track your journey, and showcase your progress.</p>
      </div>

      {/* navigation tabs (each goes to a real destination — History deep-links by kind) */}
      <nav aria-label="Profile sections" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: '/history?tab=trial', label: 'My Trials', icon: 'sword' as const },
          { to: '/history?tab=ideas', label: 'My Ideas', icon: 'bulb' as const },
          { to: '/history?tab=roadmap', label: 'Roadmaps', icon: 'map' as const },
          { to: '/history?tab=saved', label: 'Saved Ideas', icon: 'star' as const },
        ].map((t) => (
          <button
            key={t.to}
            type="button"
            onClick={() => navigate(t.to)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[var(--edge)] bg-black/35 px-3 font-label text-sm font-semibold uppercase tracking-wide text-ash-dim transition-colors hover:border-crimson hover:text-ash focus-visible:border-crimson"
          >
            <Icon name={t.icon} size={16} className="text-crimson-text" />
            {t.label}
          </button>
        ))}
      </nav>

      {/* profile header */}
      <GlassPanel className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:p-7">
        <Avatar name={user.displayName} url={user.avatarUrl} size={88} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="font-display text-2xl font-bold text-ash">{user.displayName}</h2>
          <p className="font-prose text-base text-ash-dim">{user.email}</p>
          {!user.emailVerified && <p className="mt-1 font-label text-xs uppercase tracking-wider text-[#ffd27a]">Email not verified</p>}
        </div>
        {!cropping && (
          <Button variant="ghost" onClick={() => setCropping(true)}>
            <Icon name="image" size={16} /> Change photo
          </Button>
        )}
      </GlassPanel>
      {cropping && (
        <GlassPanel className="p-5">
          <AvatarCropper onConfirm={(r) => void uploadAvatar(r)} onCancel={() => setCropping(false)} busy={upBusy} />
          {upBusy && (
            <p role="status" className="mt-3 font-label text-sm text-ash">
              Uploading… {Math.round(upPct * 100)}%
            </p>
          )}
          {upErr && (
            <p role="alert" className="mt-3 text-sm text-crimson-text">
              {upErr}
            </p>
          )}
        </GlassPanel>
      )}

      {/* stats overview (real totals from the API) */}
      <GlassPanel className="p-5 sm:p-7">
        <h2 className="mb-4 font-label text-lg font-bold uppercase tracking-wide text-ash">Stats Overview</h2>
        {statsErr ? (
          <p role="alert" className="text-sm text-crimson-text">
            {statsErr}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCells.map((s) => (
              <li key={s.label} className="rounded-md border border-[var(--edge)] bg-black/35 p-4 text-center">
                <Icon name={s.icon} size={20} className="mx-auto text-crimson-text" />
                <p className="mt-2 font-display text-2xl font-bold text-ash">{s.value === null ? <Spinner size={18} /> : s.value}</p>
                <p className="mt-0.5 font-label text-[0.62rem] uppercase tracking-wider text-ash-faint">{s.label}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate('/history')}>
            View history
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/roadmap')}>
            New roadmap
          </Button>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-7">
        <form onSubmit={(e) => void saveName(e)} className="space-y-4" noValidate>
          <h2 className="font-label text-lg font-bold uppercase tracking-wide text-ash">Account</h2>
          <TextField label="Display name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <TextField label="Email" value={user.email} readOnly hint="Your email cannot be changed." />
          <div aria-live="polite">
            {nameMsg && <p role={nameMsg.ok ? 'status' : 'alert'} className={cn('text-sm', nameMsg.ok ? 'text-ash' : 'text-crimson-text')}>{nameMsg.text}</p>}
          </div>
          <Button type="submit" loading={nameBusy} disabled={!name.trim() || name.trim() === user.displayName}>Save name</Button>
        </form>
      </GlassPanel>

      <GlassPanel className="space-y-1 p-5 sm:p-7">
        <h2 className="mb-2 font-label text-lg font-bold uppercase tracking-wide text-ash">Sound and Gate</h2>
        {toggle(!prefs.muted, (v) => prefs.setMuted(!v), 'Sound on', 'Gate sounds are synthesized and play only on the gate.')}
        {toggle(prefs.alwaysSkip, prefs.setAlwaysSkip, 'Always skip the gate intro')}
        {toggle(prefs.gateMode === 'smoke', (v) => prefs.setGateMode(v ? 'smoke' : 'gate'), 'Smoke Mode', 'Use the smoke transition instead of the opening doors.')}
      </GlassPanel>

      <div className="text-center">
        <Button variant="danger" onClick={() => (logout(), navigate('/'))}>Logout</Button>
      </div>
    </div>
  );
}
