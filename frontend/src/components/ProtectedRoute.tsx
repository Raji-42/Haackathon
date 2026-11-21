import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { DemoUserBar } from './DemoUserBar';
import { Sidebar } from './Sidebar';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, getRoleDefaultPath } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-300">Verifying CertiFlow secure session...</p>
      </div>
    );
  }

  // Requirement 3 & 6: Unauthenticated users are redirected to /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role-based boundary: If user role is not authorized for this specific route, redirect to their home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleDefaultPath(user.role)} replace />;
  }

  // Authenticated layout with Demo User Bar & Navigation Sidebar
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <DemoUserBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
