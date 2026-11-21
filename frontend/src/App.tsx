import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoUserBar } from './components/DemoUserBar';
import { Sidebar } from './components/Sidebar';
import { TrainingDashboard } from './pages/TrainingDashboard';
import { DistrictDashboard } from './pages/DistrictDashboard';
import { QualityDashboard } from './pages/QualityDashboard';
import { StateDashboard } from './pages/StateDashboard';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { LoginPage } from './pages/LoginPage';

// -----------------------------------------------------------------
// ProtectedRoute: wraps a component that requires authentication.
// If not logged in → redirect to /login.
// If logged in but wrong role → redirect to their correct dashboard.
// -----------------------------------------------------------------
interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedRole: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-semibold">
        Connecting to CertiFlow secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    // Redirect to the user's own dashboard
    const rolePathMap: Record<string, string> = {
      TRAINING_CENTRE: '/training',
      DISTRICT_OFFICER: '/district',
      QUALITY_TEAM: '/quality',
      STATE_OFFICE: '/state',
    };
    return <Navigate to={rolePathMap[user.role] || '/login'} replace />;
  }

  return element;
};

// -----------------------------------------------------------------
// RootRedirect: "/" → login if not authenticated, else role dashboard
// -----------------------------------------------------------------
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-semibold">
        Connecting to CertiFlow secure session...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const rolePathMap: Record<string, string> = {
    TRAINING_CENTRE: '/training',
    DISTRICT_OFFICER: '/district',
    QUALITY_TEAM: '/quality',
    STATE_OFFICE: '/state',
  };
  return <Navigate to={rolePathMap[user.role] || '/login'} replace />;
};

// -----------------------------------------------------------------
// DashboardShell: wraps authenticated pages with DemoUserBar + Sidebar
// -----------------------------------------------------------------
const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-slate-100">
    <DemoUserBar />
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>
);

// -----------------------------------------------------------------
// LoginWrapper: if already logged in, redirect to dashboard; else show login
// -----------------------------------------------------------------
const LoginWrapper: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-semibold">
        Connecting to CertiFlow secure session...
      </div>
    );
  }

  if (user) {
    const rolePathMap: Record<string, string> = {
      TRAINING_CENTRE: '/training',
      DISTRICT_OFFICER: '/district',
      QUALITY_TEAM: '/quality',
      STATE_OFFICE: '/state',
    };
    return <Navigate to={rolePathMap[user.role] || '/training'} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <DemoUserBar />
      <main className="flex-1">
        <LoginPage />
      </main>
    </div>
  );
};

// -----------------------------------------------------------------
// App: BrowserRouter wraps everything; AuthProvider inside so hooks work
// -----------------------------------------------------------------
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* PUBLIC routes — no auth required */}
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/verify" element={<PublicVerifyPage />} />
          <Route path="/verify/:certId" element={<PublicVerifyPage />} />

          {/* ROOT — smart redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* PROTECTED dashboard routes */}
          <Route
            path="/training"
            element={
              <ProtectedRoute
                allowedRole="TRAINING_CENTRE"
                element={
                  <DashboardShell>
                    <TrainingDashboard />
                  </DashboardShell>
                }
              />
            }
          />
          <Route
            path="/district"
            element={
              <ProtectedRoute
                allowedRole="DISTRICT_OFFICER"
                element={
                  <DashboardShell>
                    <DistrictDashboard />
                  </DashboardShell>
                }
              />
            }
          />
          <Route
            path="/quality"
            element={
              <ProtectedRoute
                allowedRole="QUALITY_TEAM"
                element={
                  <DashboardShell>
                    <QualityDashboard />
                  </DashboardShell>
                }
              />
            }
          />
          <Route
            path="/state"
            element={
              <ProtectedRoute
                allowedRole="STATE_OFFICE"
                element={
                  <DashboardShell>
                    <StateDashboard />
                  </DashboardShell>
                }
              />
            }
          />

          {/* CATCH-ALL — unknown routes → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
