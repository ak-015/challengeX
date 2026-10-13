import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { RequireAdmin } from './RequireAdmin';
import { Spinner } from './components/ui/Spinner';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Sessions = lazy(() => import('./pages/Sessions'));
const Shares = lazy(() => import('./pages/Shares'));
const System = lazy(() => import('./pages/System'));
const Audit = lazy(() => import('./pages/Audit'));
const NotFound = lazy(() => import('./pages/NotFound'));

const loading = (
  <p role="status" className="flex items-center gap-3 py-10 font-label text-ash">
    <Spinner /> Loading…
  </p>
);

export function App() {
  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="shares" element={<Shares />} />
            <Route path="system" element={<System />} />
            <Route path="audit" element={<Audit />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
