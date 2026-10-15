import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { RuneLogo } from '@/components/art/RuneLogo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

/** Real routes only — every entry leads somewhere that exists. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/realm', label: 'Paths', icon: 'layers', end: true },
  { to: '/altar', label: 'Challenge My Idea', icon: 'sword' },
  { to: '/ideas', label: 'Generate Ideas', icon: 'bulb' },
  { to: '/roadmap', label: 'Get Roadmap', icon: 'map' },
  { to: '/history', label: 'History', icon: 'history', end: true },
  { to: '/history?tab=saved', label: 'Saved Ideas', icon: 'star' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

/** True when every key in `query` appears with the same value in `search`. */
function queryMatches(query: string, search: string): boolean {
  const want = new URLSearchParams(query);
  const got = new URLSearchParams(search);
  return [...want.entries()].every(([k, v]) => got.get(k) === v);
}

/** Active check that honours a query string (Saved Ideas = History with ?tab=saved). */
function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  const [path, query] = item.to.split('?');
  if (item.end ? pathname !== path : !pathname.startsWith(path)) return false;
  if (query) return queryMatches(query, search);
  // No query: inactive if a sibling with a query for this path currently claims the URL.
  return !NAV_ITEMS.some((o) => o.to.startsWith(`${path}?`) && queryMatches(o.to.split('?')[1] ?? '', search));
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user);
  const { pathname, search } = useLocation();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-[var(--edge)] px-5 py-4">
        <RuneLogo size={30} />
        <span className="font-display text-base font-bold tracking-[0.14em] text-ash">
          Challenge<span className="text-crimson-text">X</span>
        </span>
      </div>
      <nav aria-label="Application" className="flex-1 space-y-1 overflow-y-auto p-3 scroll-thin">
        <p className="px-3 pb-1 pt-2 font-label text-[0.64rem] font-bold uppercase tracking-[0.24em] text-ash-faint">The Realm</p>
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item, pathname, search);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              className={() =>
                [
                  'flex min-h-[44px] items-center gap-3 rounded-md border px-3 font-label text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-colors',
                  active
                    ? 'border-[rgba(229,9,32,0.55)] bg-[rgba(142,24,36,0.22)] text-white shadow-glow'
                    : 'border-transparent text-ash-dim hover:border-[var(--edge)] hover:bg-[rgba(142,24,36,0.1)] hover:text-ash',
                ].join(' ')
              }
            >
              <Icon name={item.icon} size={19} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      {user && (
        <div className="border-t border-[var(--edge)] px-5 py-3">
          <p className="truncate font-label text-xs font-bold uppercase tracking-wider text-ash">{user.displayName}</p>
          <p className="truncate font-prose text-sm text-ash-dim">{user.email}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Desktop rail + mobile drawer. The drawer closes on navigation (see onNavigate).
 * `rail={false}` hides the permanent desktop rail (cinematic pages, e.g. Paths) and lets the
 * drawer open at every viewport width, so navigation is never lost.
 */
export function Sidebar({ open, onClose, rail = true }: { open: boolean; onClose: () => void; rail?: boolean }) {
  const { pathname, search } = useLocation();

  // Close the drawer whenever the route (or query) changes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* desktop rail */}
      {rail && (
        <aside
          aria-label="Sidebar"
          className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[var(--edge)] bg-[rgba(7,5,6,0.92)] backdrop-blur-md lg:block"
          style={{ paddingTop: 'var(--safe-top)' }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* drawer (mobile always; desktop when the rail is hidden) */}
      {open && (
        <div
          className={cn('fixed inset-0 z-[60]', rail && 'lg:hidden')}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-[rgba(229,9,32,0.4)] bg-[var(--void)] shadow-2xl" style={{ paddingTop: 'var(--safe-top)' }}>
            <button type="button" onClick={onClose} aria-label="Close menu" className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded text-ash hover:bg-[rgba(142,24,36,0.18)]">
              <Icon name="close" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
