import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { PublicShell } from '@/components/layout/PublicShell';
import { Spinner } from '@/components/ui/States';
import { LandingPage } from '@/pages/Landing';

// Route-level code splitting for heavier screens.
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.LoginPage })));
const Register = lazy(() => import('@/pages/Register').then((m) => ({ default: m.RegisterPage })));
const Forgot = lazy(() => import('@/pages/Forgot').then((m) => ({ default: m.ForgotPasswordPage })));
const Gate = lazy(() => import('@/pages/Gate').then((m) => ({ default: m.GatePage })));
const Paths = lazy(() => import('@/pages/Paths').then((m) => ({ default: m.PathsPage })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const ChallengeNew = lazy(() => import('@/pages/ChallengeNew').then((m) => ({ default: m.ChallengeNewPage })));
const Clarify = lazy(() => import('@/pages/Clarify').then((m) => ({ default: m.ClarifyPage })));
const Trial = lazy(() => import('@/pages/Trial').then((m) => ({ default: m.TrialPage })));
const Verdict = lazy(() => import('@/pages/Verdict').then((m) => ({ default: m.VerdictPage })));
const IdeasGenerate = lazy(() => import('@/pages/IdeasGenerate').then((m) => ({ default: m.IdeasGeneratePage })));
const RoadmapNew = lazy(() => import('@/pages/RoadmapNew').then((m) => ({ default: m.RoadmapNewPage })));
const Roadmaps = lazy(() => import('@/pages/Roadmaps').then((m) => ({ default: m.RoadmapsPage })));
const RoadmapDetail = lazy(() => import('@/pages/RoadmapDetail').then((m) => ({ default: m.RoadmapDetailPage })));
const History = lazy(() => import('@/pages/History').then((m) => ({ default: m.HistoryPage })));
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.ProfilePage })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.SettingsPage })));
const Share = lazy(() => import('@/pages/Share').then((m) => ({ default: m.SharePage })));
const Notifications = lazy(() => import('@/pages/Secondary').then((m) => ({ default: m.NotificationsPage })));
const Experiments = lazy(() => import('@/pages/Secondary').then((m) => ({ default: m.ExperimentsPage })));
const Saved = lazy(() => import('@/pages/Secondary').then((m) => ({ default: m.SavedPage })));

/** Shell wrapper for authenticated application screens.
 *  `showSidebar` is set per-route in the config below (currently /profile only). */
function AppPage({
  children,
  showSidebar = false,
  bare = false,
  backdrop = 'background',
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
  bare?: boolean;
  backdrop?: 'background' | 'ritual';
}) {
  return (
    <AppShell showSidebar={showSidebar} bare={bare} backdrop={backdrop}>
      {children}
    </AppShell>
  );
}

export function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<Spinner />}>
      <Routes location={location}>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />

        <Route path="/share/:slug" element={<PublicShell><Share /></PublicShell>} />

        {/* Gate entrance (session required to continue into the app) */}
        <Route
          path="/gate"
          element={
            <ProtectedRoute>
              <Gate />
            </ProtectedRoute>
          }
        />

        {/* Authenticated application */}
        <Route path="/paths" element={<ProtectedRoute><AppPage bare backdrop="ritual"><Paths /></AppPage></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AppPage><Dashboard /></AppPage></ProtectedRoute>} />
        <Route path="/challenge/new" element={<ProtectedRoute><AppPage><ChallengeNew /></AppPage></ProtectedRoute>} />
        <Route path="/challenge/:id/clarify" element={<ProtectedRoute><AppPage><Clarify /></AppPage></ProtectedRoute>} />
        <Route path="/challenge/:id/trial" element={<ProtectedRoute><AppPage><Trial /></AppPage></ProtectedRoute>} />
        <Route path="/challenge/:id/verdict" element={<ProtectedRoute><AppPage><Verdict /></AppPage></ProtectedRoute>} />
        <Route path="/ideas/generate" element={<ProtectedRoute><AppPage><IdeasGenerate /></AppPage></ProtectedRoute>} />
        <Route path="/roadmaps/new" element={<ProtectedRoute><AppPage><RoadmapNew /></AppPage></ProtectedRoute>} />
        <Route path="/roadmaps" element={<ProtectedRoute><AppPage><Roadmaps /></AppPage></ProtectedRoute>} />
        <Route path="/roadmaps/:id" element={<ProtectedRoute><AppPage><RoadmapDetail /></AppPage></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><AppPage><History /></AppPage></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><AppPage><Saved /></AppPage></ProtectedRoute>} />
        <Route path="/experiments" element={<ProtectedRoute><AppPage><Experiments /></AppPage></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><AppPage><Notifications /></AppPage></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppPage showSidebar><Profile /></AppPage></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AppPage><Settings /></AppPage></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
