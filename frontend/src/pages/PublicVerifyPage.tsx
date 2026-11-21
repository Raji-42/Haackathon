import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Building2,
  Calendar,
  Award,
} from 'lucide-react';

export const PublicVerifyPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Check URL pathname for direct verification links (e.g. /verify/CRT-2026-ABC123)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/verify\/(.+)/);
    if (match && match[1]) {
      const certId = decodeURIComponent(match[1]);
      setQuery(certId);
      performVerification(certId);
    }
  }, []);

  const performVerification = async (certId: string) => {
    if (!certId.trim()) return;
    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const data = await ApiService.publicVerify(certId.trim());
      setResult(data);
    } catch (err: any) {
      setResult({
        verified: false,
        status: 'INVALID',
        message: 'Unable to connect to verification server or certificate record does not exist.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(query);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500 text-slate-950 p-1.5 rounded-lg font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight">CertiFlow Public Verification Portal</h1>
              <p className="text-xs text-amber-400 font-semibold">Government of Pragati State • Skills Mission</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium hidden sm:inline">
            Zero-Login Public Registry
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl w-full mx-auto px-4 py-10 space-y-8 flex-1">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Verify National Vocational Skill Certificates
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Employers, academic institutions, and government bodies can instantly verify the authenticity and current
            validity of Pragati Skills Mission credentials.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Certificate Number (e.g. CRT-2026-X1Y2Z3) or scan QR code"
                className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5"
            >
              {loading ? 'Verifying...' : 'Verify Now'}
            </button>
          </form>
        </div>

        {/* Verification Result Display */}
        {searched && result && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* 1. GENUINE CASE */}
            {result.status === 'GENUINE' && (
              <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-xl overflow-hidden">
                <div className="bg-emerald-600 text-white p-4 flex items-center space-x-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-100 shrink-0" />
                  <div>
                    <h3 className="font-black text-lg">OFFICIALLY GENUINE & VALID</h3>
                    <p className="text-xs text-emerald-100">
                      This certificate is authentic and validly registered in the National Registry.
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Candidate Name
                      </span>
                      <span className="text-base font-black text-slate-900 mt-0.5 block">
                        {result.candidateName}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Certificate Number
                      </span>
                      <span className="font-mono text-sm font-bold text-sky-800 mt-0.5 block">
                        {result.certificateNumber}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Course / Vocational Trade
                      </span>
                      <span className="text-sm font-bold text-slate-800 mt-0.5 block">{result.courseName}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Graduation Result
                      </span>
                      <span className="text-sm font-bold text-emerald-700 mt-0.5 block">{result.result}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Accredited Training Centre
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                        {result.trainingCentre} ({result.district})
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Issue Date
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                        {new Date(result.issueDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Privacy note */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Data Privacy Protection Active: Personal contact information (phone, email) is masked to prevent
                      unauthorized scraping.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CANCELLED / REVOKED CASE (Scenario 5!) */}
            {result.status === 'CANCELLED' && (
              <div className="bg-white rounded-2xl border-2 border-rose-500 shadow-xl overflow-hidden">
                <div className="bg-rose-600 text-white p-4 flex items-center space-x-3">
                  <XCircle className="w-8 h-8 text-rose-100 shrink-0" />
                  <div>
                    <h3 className="font-black text-lg">CERTIFICATE REVOKED & CANCELLED</h3>
                    <p className="text-xs text-rose-100">
                      WARNING: This certificate was explicitly revoked by the State Authority.
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-rose-900">Official Cancellation Reason:</div>
                    <div className="text-rose-800 font-semibold">{result.cancelReason || 'Administrative cancellation'}</div>
                    <div className="text-rose-600 font-mono text-[11px] pt-1">
                      Revocation Timestamp:{' '}
                      {result.cancelledAt ? new Date(result.cancelledAt).toLocaleString('en-IN') : 'Recorded in DB'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Candidate Name:</span>
                      <span className="font-bold text-slate-800">{result.candidateName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Certificate Number:</span>
                      <span className="font-mono font-bold text-slate-800 line-through">
                        {result.certificateNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. INVALID / NOT FOUND CASE */}
            {result.status === 'INVALID' && (
              <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-6 text-center space-y-3">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="font-black text-base text-slate-900">Certificate Not Found</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  No genuine certificate matches identifier &quot;{query}&quot;. Please verify the certificate number
                  or scan the original QR code.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-6 text-center text-xs">
        <p>Pragati Skills Mission • National Vocational Skilling & Verification Gateway</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Protected by SHA-256 Digital Verification & Live QR Integrity</p>
      </footer>
    </div>
  );
};
