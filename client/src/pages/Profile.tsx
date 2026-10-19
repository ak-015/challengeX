import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User as UserIcon, Camera, Save, Trophy, Map, Swords, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { authService } from '@/services/auth';
import { uploadsService, uploadToCloudinary } from '@/services/shares';
import { trialsService } from '@/services/trials';
import { roadmapsService } from '@/services/roadmaps';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { EmptyState } from '@/components/ui/States';

const TABS = ['Overview', 'My Ideas', 'Roadmaps', 'Trials', 'Achievements', 'Settings'] as const;
type Tab = (typeof TABS)[number];

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('Overview');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(() => localStorage.getItem('challengex.bio') ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const trials = useQuery({
    queryKey: ['trials', 'profile'],
    queryFn: () => trialsService.list({ kind: 'trial', pageSize: 50 }),
    retry: false,
  });
  const ideas = useQuery({
    queryKey: ['trials', 'profile-ideas'],
    queryFn: () => trialsService.list({ kind: 'ideas', pageSize: 50 }),
    retry: false,
  });
  const roadmaps = useQuery({
    queryKey: ['roadmaps', 'profile'],
    queryFn: () => roadmapsService.list({ pageSize: 50 }),
    retry: false,
  });

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await authService.updateProfile(displayName.trim());
      updateUser(r.user);
      // Bio/interests have no backend field — stored locally and documented as unsupported.
      localStorage.setItem('challengex.bio', bio);
      push('success', 'Profile updated.');
    } catch (err) {
      push('error', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file: File) => {
    setUploading(true);
    try {
      const signed = await uploadsService.sign('avatar');
      const uploaded = await uploadToCloudinary(signed, file);
      const r = await uploadsService.saveAvatar(uploaded.secure_url, uploaded.public_id);
      updateUser({ ...user!, avatarUrl: r.avatarUrl });
      push('success', 'Avatar updated.');
    } catch (err) {
      push('error', errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const trialItems = trials.data?.items ?? [];
  const ideaItems = ideas.data?.items ?? [];
  const roadmapItems = roadmaps.data?.items ?? [];
  const completed = trialItems.filter((t) => t.status === 'complete');
  const verdicts = completed.filter((t) => t.verdict);


  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header card */}
      <div className="gothic-panel p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={`${user.displayName} avatar`} className="h-24 w-24 rounded-full border-2 border-[var(--border-visible)] object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--border-visible)] bg-surface-elevated">
                <UserIcon className="h-10 w-10 text-parchment-faint" aria-hidden />
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 rounded-full border border-[var(--border-visible)] bg-surface p-2 text-crimson-glow hover:bg-crimson-soft"
              aria-label="Change avatar"
            >
              <Camera className="h-4 w-4" aria-hidden />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void changeAvatar(f);
                e.target.value = '';
              }}
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="font-display text-2xl sm:text-3xl text-parchment">{user?.displayName}</h1>
            <p className="text-sm text-parchment-dim mt-1">{user?.email}</p>
            <p className="text-xs font-heading uppercase tracking-widest text-parchment-faint mt-1">
              {user?.emailVerified ? '✓ Verified' : 'Unverified'} · {user?.role}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="font-display text-xl text-crimson-glow">{trialItems.length}</div><div className="text-[10px] uppercase tracking-widest text-parchment-faint">Trials</div></div>
            <div><div className="font-display text-xl text-crimson-glow">{ideaItems.length}</div><div className="text-[10px] uppercase tracking-widest text-parchment-faint">Idea Sets</div></div>
            <div><div className="font-display text-xl text-crimson-glow">{roadmapItems.length}</div><div className="text-[10px] uppercase tracking-widest text-parchment-faint">Roadmaps</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Profile sections">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-heading uppercase tracking-widest transition-all ${
              tab === t ? 'border-[var(--border-visible)] bg-crimson-soft text-parchment' : 'border-[var(--border-subtle)] text-parchment-dim hover:text-parchment'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'Overview' && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="gothic-panel p-6">
            <h2 className="font-heading text-base text-parchment mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-crimson-glow" aria-hidden /> Statistics
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-parchment-dim">Trials started</dt><dd className="text-parchment font-heading">{trialItems.length}</dd></div>
              <div className="flex justify-between"><dt className="text-parchment-dim">Trials completed</dt><dd className="text-parchment font-heading">{completed.length}</dd></div>
              <div className="flex justify-between"><dt className="text-parchment-dim">Verdicts received</dt><dd className="text-parchment font-heading">{verdicts.length}</dd></div>
              <div className="flex justify-between"><dt className="text-parchment-dim">Best score</dt><dd className="text-parchment font-heading">{trialItems.reduce((m, t) => Math.max(m, t.totalScore ?? 0), 0) || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-parchment-dim">Roadmaps forged</dt><dd className="text-parchment font-heading">{roadmapItems.length}</dd></div>
            </dl>
          </div>
          <div className="gothic-panel p-6">
            <h2 className="font-heading text-base text-parchment mb-4">About Me</h2>
            <Textarea
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={400}
              hint={`${bio.length}/400 — stored locally; no backend field exists yet (see docs).`}
              placeholder="Tell other founders who you are and what you are building…"
            />
            <Button onClick={saveProfile} loading={saving} className="mt-3 w-full sm:w-auto">
              <Save className="h-4 w-4" aria-hidden /> Save Profile
            </Button>
          </div>
        </div>
      )}

      {tab === 'My Ideas' && (
        <div>
          {ideaItems.length === 0 ? (
            <EmptyState
              title="No idea sets yet"
              message="Generate ideas and they will be archived here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {ideaItems.map((i) => (
                <div key={i.id} className="gothic-panel p-5 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 mt-1 text-crimson-glow shrink-0" aria-hidden />
                  <div>
                    <h3 className="font-heading text-sm text-parchment">{i.title}</h3>
                    <p className="text-xs text-parchment-faint mt-1">{new Date(i.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Roadmaps' && (
        <div>
          {roadmapItems.length === 0 ? (
            <EmptyState title="No roadmaps yet" message="Forge your first roadmap from the Get Roadmap path." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {roadmapItems.map((r) => (
                <div key={r.id} className="gothic-panel p-5 flex items-start gap-3">
                  <Map className="h-4 w-4 mt-1 text-crimson-glow shrink-0" aria-hidden />
                  <div>
                    <h3 className="font-heading text-sm text-parchment">{r.title}</h3>
                    <p className="text-xs text-parchment-faint mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Trials' && (
        <div>
          {trialItems.length === 0 ? (
            <EmptyState title="No trials yet" message="Your trial record is empty. Face your first interrogation." />
          ) : (
            <div className="space-y-2">
              {trialItems.map((t) => (
                <div key={t.id} className="gothic-panel p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Swords className="h-4 w-4 text-crimson-glow shrink-0" aria-hidden />
                    <span className="font-heading text-sm text-parchment truncate">{t.title}</span>
                  </div>
                  <span className="text-xs text-parchment-faint shrink-0">
                    {t.totalScore !== null ? `${t.totalScore}/100` : t.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Achievements' && (
        <EmptyState
          title="Achievements are not tracked yet"
          message="The backend has no achievements or gamification API. This section will populate if/when that capability is added — see docs/backend-capability-report.md."
        />
      )}

      {tab === 'Settings' && (
        <div className="gothic-panel p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-heading text-base text-parchment mb-4">Account</h2>
            <div className="space-y-4">
              <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
              <Input label="Email" value={user?.email ?? ''} readOnly disabled hint="Email changes are not supported by the backend." />
            </div>
            <Button onClick={saveProfile} loading={saving} className="mt-4">
              <Save className="h-4 w-4" aria-hidden /> Save Changes
            </Button>
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-6">
            <p className="text-xs text-parchment-faint">
              Password changes use the email reset flow: <a href="/forgot" className="text-crimson-glow underline">request a reset code</a>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
