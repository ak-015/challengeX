import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RealmScene } from '@/components/realm/RealmScene';
import { useAuth } from '@/hooks/useAuth';

/**
 * Themed wrapper for public pages (share links, legal) that live outside the
 * authenticated AppShell. Same scene, smoke and embers as the rest of the app so
 * nothing ever renders on a bare black page.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <RealmScene scene="secondary" fixed />
      <div className="fixed inset-0 bg-gradient-to-b from-background/80 via-background/65 to-background/90" aria-hidden />

      <header className="relative z-10 border-b border-[var(--border-subtle)] bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="font-display text-lg tracking-widest text-parchment">
            CHALLENGE<span className="text-crimson-glow">X</span>
          </Link>
          {user ? (
            <Link to="/dashboard" className="gothic-btn-ghost px-4 py-2 text-xs">Dashboard</Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-3 py-2 text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment">Sign In</Link>
              <Link to="/register" className="gothic-btn-primary px-4 py-2 text-xs">Register</Link>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
