import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Trash2, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';

export function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(() => localStorage.getItem('challengex.bio') ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { authService } = await import('@/services/auth');
      const r = await authService.updateProfile(name.trim());
      updateUser(r.user);
      localStorage.setItem('challengex.bio', bio);
      push('success', 'Settings saved.');
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const clearLocal = () => {
    localStorage.removeItem('challengex.bio');
    setBio('');
    push('info', 'Local preferences cleared.');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment flex items-center gap-3">
          <Settings className="h-7 w-7 text-crimson-glow" aria-hidden /> Settings
        </h1>
      </header>

      <div className="space-y-6">
        <section className="gothic-panel p-6 space-y-4">
          <h2 className="font-heading text-base text-parchment">Profile</h2>
          <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          <Textarea label="About Me" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} hint="Stored locally — no backend field exists yet." />
          <div className="flex gap-3">
            <Button onClick={save} loading={saving}>Save</Button>
            <Button variant="ghost" onClick={clearLocal}>Clear Local Data</Button>
          </div>
        </section>

        <section className="gothic-panel p-6 space-y-4">
          <h2 className="font-heading text-base text-parchment">Session</h2>
          <p className="text-sm text-parchment-dim">
            Signed in as <span className="text-parchment">{user?.email}</span>. Tokens live only in this browser's
            local storage and are sent as <code className="text-crimson-glow">Authorization: Bearer</code> headers.
          </p>
          <Button variant="ghost" onClick={logout} className="text-red-400 border-red-900/50 hover:bg-red-950/40">
            Sign Out Everywhere
          </Button>
        </section>

        <section className="gothic-panel p-6 space-y-4">
          <h2 className="font-heading text-base text-parchment">Data</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/history" className="gothic-btn-ghost text-sm">
              <Download className="h-4 w-4" aria-hidden /> View My Records
            </Link>
            <Button variant="danger" onClick={clearLocal}>
              <Trash2 className="h-4 w-4" aria-hidden /> Wipe Local Preferences
            </Button>
          </div>
          <p className="text-xs text-parchment-faint">
            Account deletion is performed by an administrator via the admin application — the public API does not
            expose a self-delete endpoint.
          </p>
        </section>
      </div>
    </div>
  );
}
