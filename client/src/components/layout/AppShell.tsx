import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Menu, X, LogOut, Home, Swords, Lightbulb, Map, History,
  User as UserIcon, Settings, FlaskConical, Bell, Bookmark, Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RealmScene } from '@/components/realm/RealmScene';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/paths', label: 'Paths', icon: Swords },
  { to: '/challenge/new', label: 'Challenge', icon: Swords },
  { to: '/ideas/generate', label: 'Ideas', icon: Lightbulb },
  { to: '/roadmaps', label: 'Roadmaps', icon: Map },
  { to: '/history', label: 'History', icon: History },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/experiments', label: 'Experiments', icon: FlaskConical },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];

interface AppShellProps {
  children: React.ReactNode;
  /**
   * Route-config driven: the sidebar (desktop aside + mobile drawer) renders
   * only for routes that opt in via their element, currently /profile.
   * Every other route gets the full viewport width for main content.
   */
  showSidebar?: boolean;
}

export function AppShell({ children, showSidebar = false }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-heading tracking-wide uppercase transition-colors',
      isActive
        ? 'bg-crimson-soft text-parchment border border-[var(--border-visible)]'
        : 'text-parchment-dim hover:text-parchment hover:bg-surface-hover border border-transparent',
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Global full-screen dark-fantasy background (realm-background.webp) rendered as a live scene
          (fire, fog, moon, sword — see components/realm). Fixed + pointer-events-none: stays put while content scrolls, cached once,
          identical on every route. Content below uses relative z-10+ to stay above it. */}
      <RealmScene scene="background" fixed scrim="linear-gradient(rgba(5,3,4,0.28), rgba(5,3,4,0.42))" />

      {/* Full-width header on every route */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {showSidebar && (
              <button
                className="rounded-md p-2 text-parchment-dim hover:text-parchment md:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            <Link to="/dashboard" className="font-display text-lg tracking-widest text-parchment">
              CHALLENGE<span className="text-crimson-glow">X</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <a
                href={(import.meta.env.VITE_ADMIN_URL as string | undefined) ?? 'http://localhost:5174'}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-heading uppercase tracking-widest text-crimson-glow hover:bg-crimson-soft"
              >
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Admin
              </a>
            )}
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-parchment-dim hover:text-parchment hover:bg-surface-hover"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-[var(--border-subtle)] object-cover" />
              ) : (
                <UserIcon className="h-5 w-5" aria-hidden />
              )}
              <span className="hidden sm:inline font-heading text-xs tracking-wide">{user?.displayName ?? 'Account'}</span>
            </Link>
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              className="rounded-md p-2 text-parchment-dim hover:text-crimson-glow"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {showSidebar ? (
        /* Profile route: sidebar + content as a responsive grid aligned under the
           full-width header (same max-width/padding as the header container).
           md+: 15rem sidebar column + fluid content. Below md: single column and
           the sidebar lives in the hamburger drawer. The sidebar is a defined
           translucent panel (no floating links, no sticky overlap). */
        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:px-8 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-x-10">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col gap-1 rounded-lg border border-[var(--border-subtle)] bg-surface/70 p-4 backdrop-blur">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLink}>
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
            <div className="mt-auto space-y-1 border-t border-[var(--border-subtle)] pt-4">
              <NavLink to="/profile" className={navLink}>
                <UserIcon className="h-4 w-4" aria-hidden />
                Profile
              </NavLink>
              <NavLink to="/settings" className={navLink}>
                <Settings className="h-4 w-4" aria-hidden />
                Settings
              </NavLink>
            </div>
          </aside>

          {/* Mobile drawer */}
          {open && (
            <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
              <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
              <nav className="absolute left-0 top-0 h-full w-72 bg-surface border-r border-[var(--border-subtle)] p-4 space-y-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display tracking-widest text-parchment">CHALLENGEX</span>
                  <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-parchment-dim">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLink} onClick={() => setOpen(false)}>
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </NavLink>
                ))}
                <div className="border-t border-[var(--border-subtle)] pt-2 mt-2">
                  <NavLink to="/profile" className={navLink} onClick={() => setOpen(false)}>
                    <UserIcon className="h-4 w-4" aria-hidden />
                    Profile
                  </NavLink>
                  <NavLink to="/settings" className={navLink} onClick={() => setOpen(false)}>
                    <Settings className="h-4 w-4" aria-hidden />
                    Settings
                  </NavLink>
                </div>
              </nav>
            </div>
          )}

          {/* Content column: fills remaining grid space */}
          <main className="w-full min-w-0">{children}</main>
        </div>
      ) : (
        /* Full-width layout (every other route): no reserved sidebar column */
        <main className="relative z-10 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      )}
    </div>
  );
}

