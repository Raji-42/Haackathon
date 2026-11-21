import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Search, Award } from 'lucide-react';

export const DemoUserBar: React.FC = () => {
  const { user, switchUser, isPublicMode } = useAuth();

  const personas = [
    { key: 'anika', name: 'Anika', role: 'Training Centre', icon: '🏫', color: 'bg-emerald-600' },
    { key: 'dev', name: 'Dev', role: 'District Officer 1', icon: '👮‍♂️', color: 'bg-blue-600' },
    { key: 'meera', name: 'Meera', role: 'District Officer 2', icon: '👮‍♀️', color: 'bg-indigo-600' },
    { key: 'kabir', name: 'Kabir', role: 'District Officer 3', icon: '👮', color: 'bg-cyan-600' },
    { key: 'neha', name: 'Neha', role: 'Quality Team', icon: '🔍', color: 'bg-purple-600' },
    { key: 'farah', name: 'Farah', role: 'State Director', icon: '🏛️', color: 'bg-amber-600' },
    { key: 'public', name: 'Public', role: 'QR Verification', icon: '🌐', color: 'bg-slate-700' },
  ];

  const currentKey = isPublicMode
    ? 'public'
    : user?.email.split('@')[0].toLowerCase() || '';

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
      {/* Brand & Mission Tag */}
      <div className="flex items-center space-x-2">
        <div className="bg-amber-500 text-slate-950 p-1 rounded font-black flex items-center justify-center">
          <Award className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold tracking-wide text-amber-400">CertiFlow</span>
          <span className="hidden sm:inline text-slate-400 ml-1.5 border-l border-slate-700 pl-1.5">
            Pragati Skills Mission (Govt of India Hackathon)
          </span>
        </div>
      </div>

      {/* 1-Click Role Switcher */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
        <span className="text-slate-400 font-medium mr-1 hidden md:inline">Demo Persona:</span>
        {personas.map((p) => {
          const isActive = currentKey === p.key;
          return (
            <button
              key={p.key}
              onClick={() => switchUser(p.key)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all font-medium whitespace-nowrap ${
                isActive
                  ? `${p.color} text-white shadow-inner ring-2 ring-white/30 scale-105`
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={`Switch to ${p.name} (${p.role})`}
            >
              <span>{p.icon}</span>
              <span className="font-semibold">{p.name}</span>
              <span className="text-[10px] opacity-75 hidden lg:inline">({p.role})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
