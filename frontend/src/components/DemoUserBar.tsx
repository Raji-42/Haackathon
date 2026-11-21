import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleDefaultPath } from '../context/AuthContext';
import { Award, LogOut, LogIn } from 'lucide-react';

export const DemoUserBar: React.FC = () => {
  const { user, switchUser, logout } = useAuth();
  const navigate = useNavigate();

  const personas = [
    { key: 'anika', name: 'Anika', role: 'Training Centre', icon: '🏫', color: 'bg-emerald-600' },
    { key: 'dev', name: 'Dev', role: 'District Officer 1', icon: '👮‍♂️', color: 'bg-blue-600' },
    { key: 'meera', name: 'Meera', role: 'District Officer 2', icon: '👮‍♀️', color: 'bg-indigo-600' },
    { key: 'kabir', name: 'Kabir', role: 'District Officer 3', icon: '👮', color: 'bg-cyan-600' },
    { key: 'neha', name: 'Neha', role: 'Quality Team', icon: '🔍', color: 'bg-purple-600' },
    { key: 'farah', name: 'Farah', role: 'State Director', icon: '🏛️', color: 'bg-amber-600' },
    { key: 'public', name: 'Public', role: 'QR Verification', icon: '🌐', color: 'bg-slate-700' },
  ];

  const currentKey = user?.email.split('@')[0].toLowerCase() || '';

  const handlePersonaSwitch = async (key: string) => {
    if (key === 'public') {
      logout();
      navigate('/verify');
      return;
    }
    try {
      const switchedUser = await switchUser(key);
      if (switchedUser) {
        navigate(getRoleDefaultPath(switchedUser.role));
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
          const isActive = p.key === 'public'
            ? !user
            : currentKey === p.key && !!user;
          return (
            <button
              key={p.key}
              onClick={() => handlePersonaSwitch(p.key)}
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

      {/* Login / Logout Quick Action */}
      <div className="flex items-center space-x-2">
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded transition shadow-sm"
            title="Log out of current account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center space-x-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded transition shadow-sm"
            title="Go to login page"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
};
