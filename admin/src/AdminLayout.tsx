import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { RuneLogo } from './components/art/RuneLogo';
import { Avatar } from './components/ui/Avatar';
import { Button } from './components/ui/Button';
import { Icon, type IconName } from './components/ui/Icon';
import { Spinner } from './components/ui/Spinner';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { APP_URL } from './env';
import { cn } from './lib/cn';
import { useAuth } from './store/authStore';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'chart', end: true },
  { to: '/users', label: 'Users', icon: 'people' },
  { to: '/sessions', label: 'Sessions', icon: 'layers' },
  { to: '/shares', label: 'Shares', icon: 'share' },
  { to: '/system', label: 'System', icon: 'gear' },
  { to: '/audit', label: 'Audit', icon: 'scroll' },
];

export function AdminLayout() {
  useDocumentTitle('Admin');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-[44px] shrink-0 items-center gap-2 rounded-md border px-3 font-label text-sm font-semibold',
      isActive ? 'border-crimson-text bg-[rgba(196,20,35,0.35)] text-white' : 'border-transparent text-ash hover:border-crimson hover:bg-[rgba(225,29,46,0.12)]',
    );
  return (
    <div className="min-h-[100dvh] overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-black focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(225,29,46,0.45)] bg-[rgba(5,5,5,0.92)]" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="safe-pad mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <RuneLogo size={34} />
            <p className="truncate font-display text-sm font-bold tracking-[0.15em] text-ash sm:text-base">
              CHALLENGEX <span className="hidden text-ash-dim sm:inline">· Admin</span>
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {APP_URL && (
              <a href={APP_URL} className="btn btn-quiet btn-sm hidden sm:inline-flex">
                Open the app
              </a>
            )}
            {user && (
              <span className="hidden items-center gap-2 sm:flex" title={user.email}>
                <Avatar name={user.displayName} url={user.avatarUrl} size={30} />
                <span className="max-w-[140px] truncate font-label text-sm text-ash">{user.displayName}</span>
              </span>
            )}
            <Button size="sm" variant="ghost" onClick={() => (logout(), navigate('/login'))}>
              <Icon name="logout" size={16} /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="safe-pad mx-auto max-w-[1400px] pb-8 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6" style={{ paddingTop: 'calc(56px + var(--safe-top) + 1rem)' }}>
        {/* sidebar on desktop, scrollable top tabs on phones */}
        <nav aria-label="Admin sections" className="mb-4 lg:sticky lg:top-[72px] lg:mb-0 lg:self-start">
          <ul className="scroll-thin flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {NAV.map((n) => (
              <li key={n.to} className="shrink-0 lg:shrink">
                <NavLink to={n.to} end={n.end} className={link}>
                  <Icon name={n.icon} size={18} /> {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="min-w-0">
          <Suspense fallback={<p role="status" className="flex items-center gap-3 py-10 font-label text-ash"><Spinner /> Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
