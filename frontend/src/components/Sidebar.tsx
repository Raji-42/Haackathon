import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  CheckSquare,
  ShieldCheck,
  Building2,
  Search,
  LogOut,
  FolderKanban,
  Award,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, isPublicMode, setPublicMode, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between hidden md:flex shrink-0">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-sky-600 text-white p-2 rounded-lg font-bold shadow-md">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight">CertiFlow</h1>
            <p className="text-[11px] text-sky-400 font-medium">Pragati Skills Mission</p>
          </div>
        </div>

        {/* Current Active User Profile Card */}
        <div className="p-4 mx-3 my-4 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Persona</div>
          <div className="font-bold text-white text-sm">{user ? user.name : 'Public Verifier'}</div>
          <div className="text-xs text-sky-400 font-semibold mt-0.5">
            {user ? user.role.replace(/_/g, ' ') : 'No Login Mode'}
          </div>
          {user?.trainingCentre && (
            <div className="text-[11px] text-slate-300 mt-2 pt-2 border-t border-slate-700/50">
              <span className="text-slate-400">Centre:</span> {user.trainingCentre.name}
            </div>
          )}
          {user?.district && (
            <div className="text-[11px] text-slate-300 mt-1">
              <span className="text-slate-400">District:</span> {user.district.name}
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="px-3 space-y-1 text-xs font-semibold">
          <div className="text-[10px] text-slate-500 font-bold px-3 py-1 uppercase tracking-wider">Navigation</div>

          {user?.role === 'TRAINING_CENTRE' && (
            <div className="px-3 py-2.5 rounded-lg bg-sky-600/20 text-sky-400 flex items-center space-x-2 font-bold">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Training Centre Batches</span>
            </div>
          )}

          {user?.role === 'DISTRICT_OFFICER' && (
            <div className="px-3 py-2.5 rounded-lg bg-blue-600/20 text-blue-400 flex items-center space-x-2 font-bold">
              <CheckSquare className="w-4 h-4" />
              <span>District Approval Inbox</span>
            </div>
          )}

          {user?.role === 'QUALITY_TEAM' && (
            <div className="px-3 py-2.5 rounded-lg bg-purple-600/20 text-purple-400 flex items-center space-x-2 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Quality Review Audits</span>
            </div>
          )}

          {user?.role === 'STATE_OFFICE' && (
            <div className="px-3 py-2.5 rounded-lg bg-amber-600/20 text-amber-400 flex items-center space-x-2 font-bold">
              <Building2 className="w-4 h-4" />
              <span>State Office Dashboard</span>
            </div>
          )}

          <button
            onClick={() => setPublicMode(true)}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center space-x-2 transition ${
              isPublicMode
                ? 'bg-emerald-600 text-white font-bold'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Public Certificate Verification</span>
          </button>
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>PostgreSQL + BullMQ Ready</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">v1.0.0 • Pragati Skills Mission</p>
      </div>
    </aside>
  );
};
