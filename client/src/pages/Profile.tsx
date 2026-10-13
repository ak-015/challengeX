import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarCropper, type CropResult } from '@/components/profile/AvatarCropper';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { auth, profile, uploads } from '@/lib/endpoints';
import { friendlyMessage } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';
import { usePrefs } from '@/store/prefsStore';

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
      <input type="checkbox" className="mt-1 h-5 w-5 accent-[#c41423]" checked={checked} onChange={(e) => on(e.target.checked)} />
      <span>
        <span className="block font-label text-sm font-semibold text-ash">{label}</span>
        {hint && <span className="block font-prose text-sm text-ash-dim">{hint}</span>}
      </span>
    </label>
  );

  return (
    <div className="safe-pad mx-auto max-w-2xl space-y-5 py-6">
      <div className="text-center"><Heading level={1}>Profile</Heading></div>

      <GlassPanel className="space-y-4 p-5 sm:p-7">
        <h2 className="font-label text-lg font-bold text-ash">Avatar</h2>
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName} url={user.avatarUrl} size={72} />
          {!cropping && <Button variant="ghost" onClick={() => setCropping(true)}>Change photo</Button>}
        </div>
        {cropping && <AvatarCropper onConfirm={(r) => void uploadAvatar(r)} onCancel={() => setCropping(false)} busy={upBusy} />}
        {upBusy && <p role="status" className="font-label text-sm text-ash">Uploading… {Math.round(upPct * 100)}%</p>}
        {upErr && <p role="alert" className="text-sm text-crimson-text">{upErr}</p>}
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-7">
        <form onSubmit={(e) => void saveName(e)} className="space-y-4" noValidate>
          <h2 className="font-label text-lg font-bold text-ash">Account</h2>
          <TextField label="Display name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <TextField label="Email" value={user.email} readOnly hint="Your email cannot be changed." />
          <div aria-live="polite">
            {nameMsg && <p role={nameMsg.ok ? 'status' : 'alert'} className={cn('text-sm', nameMsg.ok ? 'text-ash' : 'text-crimson-text')}>{nameMsg.text}</p>}
          </div>
          <Button type="submit" loading={nameBusy} disabled={!name.trim() || name.trim() === user.displayName}>Save name</Button>
        </form>
      </GlassPanel>

      <GlassPanel className="space-y-1 p-5 sm:p-7">
        <h2 className="mb-2 font-label text-lg font-bold text-ash">Sound and gate</h2>
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
