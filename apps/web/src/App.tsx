import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute, GuestRoute } from '@/components/common/protected-route';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { CockpitPage } from '@/features/cockpit/cockpit-page';
import { PortfolioPage } from '@/features/portfolio/portfolio-page';
import { RoadmapPage } from '@/features/roadmap/roadmap-page';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/cockpit" element={<CockpitPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/cockpit" replace />} />
      <Route path="*" element={<Navigate to="/cockpit" replace />} />
    </Routes>
  );
}
