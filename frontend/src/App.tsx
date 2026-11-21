import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoUserBar } from './components/DemoUserBar';
import { Sidebar } from './components/Sidebar';
import { TrainingDashboard } from './pages/TrainingDashboard';
import { DistrictDashboard } from './pages/DistrictDashboard';
import { QualityDashboard } from './pages/QualityDashboard';
import { StateDashboard } from './pages/StateDashboard';
import { PublicVerifyPage } from './pages/PublicVerifyPage';

const DashboardRouter: React.FC = () => {
  const { user, isPublicMode, loading } = useAuth();

  // If in Public Verification mode or on /verify URL
  if (isPublicMode || window.location.pathname.startsWith('/verify')) {
    return <PublicVerifyPage />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-xs font-semibold">
        Connecting to CertiFlow secure session...
      </div>
    );
  }

  if (!user) {
    return <PublicVerifyPage />;
  }

  switch (user.role) {
    case 'TRAINING_CENTRE':
      return <TrainingDashboard />;
    case 'DISTRICT_OFFICER':
      return <DistrictDashboard />;
    case 'QUALITY_TEAM':
      return <QualityDashboard />;
    case 'STATE_OFFICE':
      return <StateDashboard />;
    default:
      return <PublicVerifyPage />;
  }
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* 1-Click Demo User Switcher Bar across top */}
      <DemoUserBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Role Dashboard / Public Page */}
        <main className="flex-1 overflow-y-auto">
          <DashboardRouter />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
