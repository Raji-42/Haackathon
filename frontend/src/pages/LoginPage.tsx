import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleDefaultPath } from '../context/AuthContext';
import { Award, Lock, Mail, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('anika@certiflow.gov.in');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(getRoleDefaultPath(user.role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoKey: string) => {
    try {
      const user = await switchUser(demoKey);
      if (user) {
        navigate(getRoleDefaultPath(user.role), { replace: true });
      }
    } catch (err) {
      console.error('Demo login failed:', err);
    }
  };

  const demoAccounts = [
    { key: 'anika', label: 'Anika (Training Centre)', email: 'anika@certiflow.gov.in', role: 'TRAINING_CENTRE', badge: 'bg-emerald-100 text-emerald-800' },
    { key: 'dev', label: 'Dev (District Officer 1)', email: 'dev@certiflow.gov.in', role: 'DISTRICT_OFFICER', badge: 'bg-blue-100 text-blue-800' },
    { key: 'meera', label: 'Meera (District Officer 2)', email: 'meera@certiflow.gov.in', role: 'DISTRICT_OFFICER', badge: 'bg-indigo-100 text-indigo-800' },
    { key: 'kabir', label: 'Kabir (District Officer 3)', email: 'kabir@certiflow.gov.in', role: 'DISTRICT_OFFICER', badge: 'bg-cyan-100 text-cyan-800' },
    { key: 'neha', label: 'Neha (Quality Team)', email: 'neha@certiflow.gov.in', role: 'QUALITY_TEAM', badge: 'bg-purple-100 text-purple-800' },
    { key: 'farah', label: 'Farah (State Director)', email: 'farah@certiflow.gov.in', role: 'STATE_OFFICE', badge: 'bg-amber-100 text-amber-800' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Government Header */}
        <div className="bg-slate-950 p-6 text-center text-white border-b border-slate-800">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500 rounded-xl mb-3 shadow-lg">
            <Award className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">CertiFlow Portal</h1>
          <p className="text-xs text-amber-400 font-semibold mt-1">
            Government of Pragati State • Skills Mission
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Department of Skill Development &amp; Entrepreneurship
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-base font-bold text-slate-900">Sign In to Your Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your official credentials or use 1-click demo login below
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="name@certiflow.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Default demo password: <span className="font-mono text-slate-600 font-semibold">Password123!</span></div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center justify-center space-x-1"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to CertiFlow'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
              Quick 1-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.key}
                  type="button"
                  onClick={() => handleQuickDemoLogin(acc.key)}
                  className="p-2 border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 rounded-lg text-left transition group"
                >
                  <div className="font-semibold text-slate-800 text-[11px] truncate group-hover:text-sky-700">
                    {acc.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Public Verification Link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate('/verify')}
              className="text-xs text-sky-700 hover:text-sky-900 font-bold hover:underline"
            >
              Go to Public Certificate Verification (No Login Required) →
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer */}
      <div className="text-center text-xs text-slate-500 mt-4">
        <p>Pragati Skills Mission • National Certificate Issuance Platform</p>
        <p className="text-[10px] text-slate-600 mt-0.5">Two-Officer Governance &amp; Cryptographic QR Verification</p>
      </div>
    </div>
  );
};
