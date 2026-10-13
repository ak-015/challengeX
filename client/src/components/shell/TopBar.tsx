import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RuneLogo } from '@/components/art/RuneLogo';
import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/store/authStore';
import { usePrefs } from '@/store/prefsStore';

const iconBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-ash hover:border-crimson hover:text-crimson-text focus-visible:border-crimson';

function canGoBack(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, token, logout } = useAuth();
  const { muted, toggleMuted } = usePrefs();
  const back = canGoBack();
  const hideBack = pathname === '/realm' && !back;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(225,29,46,0.45)] bg-[rgba(5,5,5,0.88)]"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="safe-pad mx-auto grid h-14 max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-1 sm:gap-3">
        <div className="flex items-center gap-1">
          {hideBack ? (
            <span className="h-11 w-0" />
          ) : (
            <button type="button" className={iconBtn} aria-label="Go back" onClick={() => (back ? navigate(-1) : navigate(token ? '/realm' : '/'))}>
              <Icon name="back" />
            </button>
          )}
          <Link to={token ? '/realm' : '/'} className="inline-flex h-11 w-11 items-center justify-center rounded-md" aria-label="ChallengeX, home">
            <RuneLogo size={34} />
          </Link>
        </div>

        <p className="truncate text-center font-display text-sm font-bold tracking-[0.18em] text-ash sm:text-base">ChallengeX</p>

        <div className="flex items-center gap-1">
          <button type="button" className={iconBtn} aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'} onClick={toggleMuted}>
            <Icon name={muted ? 'mute' : 'sound'} />
          </button>
          {user ? (
            <AvatarMenu name={user.displayName} avatarUrl={user.avatarUrl} onLogout={() => (logout(), navigate('/'))} />
          ) : (
            <Link to="/" className="btn btn-sm">
              Enter
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function AvatarMenu({ name, avatarUrl, onLogout }: { name: string; avatarUrl: string | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: { to: string; label: string; icon: IconName }[] = [
    { to: '/profile', label: 'Profile', icon: 'user' },
    { to: '/history', label: 'History', icon: 'history' },
  ];

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={name} url={avatarUrl} size={36} />
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="glass absolute right-0 top-12 z-50 w-52 overflow-hidden p-1">
          <p className="truncate px-3 py-2 font-label text-xs text-ash-dim">{name}</p>
          {items.map((it) => (
            <Link key={it.to} to={it.to} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-3 rounded px-3 font-label text-sm text-ash hover:bg-[rgba(225,29,46,0.18)]">
              <Icon name={it.icon} size={18} /> {it.label}
            </Link>
          ))}
          <button type="button" role="menuitem" onClick={onLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded px-3 text-left font-label text-sm text-ash hover:bg-[rgba(225,29,46,0.18)]">
            <Icon name="logout" size={18} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
