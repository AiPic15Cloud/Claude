import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute, GuestRoute } from '@/components/common/protected-route';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { CockpitPage } from '@/features/cockpit/cockpit-page';
import { PortfolioPage } from '@/features/portfolio/portfolio-page';
import { PipelinePage } from '@/features/pipeline/pipeline-page';
import { ObjectifsPage } from '@/features/objectifs/objectifs-page';
import { DossierPage } from '@/features/dossiers/dossier-page';
import { CartographiePage } from '@/features/cartographie/cartographie-page';
import { PlatformsPage } from '@/features/intelligence-concurrentielle/platforms-page';
import { MarchePage } from '@/features/intelligence-marche/marche-page';
import { AgentsPage } from '@/features/agents/agents-page';
import { RoadmapPage } from '@/features/roadmap/roadmap-page';
import { ProfilePage } from '@/features/auth/profile-page';

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
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/objectifs" element={<ObjectifsPage />} />
          <Route path="/deals" element={<Navigate to="/portfolio" replace />} />
          <Route path="/deals/:id" element={<DossierPage />} />
          <Route path="/graph" element={<Navigate to="/competitors" replace />} />
          <Route path="/map" element={<CartographiePage />} />
          <Route path="/competitors" element={<PlatformsPage />} />
          <Route path="/market" element={<MarchePage />} />
          <Route path="/ai" element={<AgentsPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/cockpit" replace />} />
      <Route path="*" element={<Navigate to="/cockpit" replace />} />
    </Routes>
  );
}
