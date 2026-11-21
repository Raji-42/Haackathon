import React, { useState } from 'react';
import { Batch } from '../types';
import { BatchTimeline } from './BatchTimeline';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Download, ShieldAlert, CheckCircle, Clock, RefreshCw, Eye } from 'lucide-react';

interface BatchDetailModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batch,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'candidates' | 'approvals' | 'audit'>('candidates');
  const [cancellingCertNum, setCancellingCertNum] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Clerical error during candidate registration');
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen || !batch) return null;

  const handleCancelCertificate = async (certNumber: string) => {
    if (!cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await ApiService.cancelCertificate(certNumber, cancelReason);
      alert(`Certificate ${certNumber} has been revoked.`);
      setCancellingCertNum(null);
      onRefresh();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryWhatsApp = async (notificationId: string) => {
    try {
      await ApiService.retryWhatsApp(notificationId);
      alert('Simulated WhatsApp retry enqueued!');
      onRefresh();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-amber-400 font-bold">{batch.batchNumber}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-sm">{batch.courseName}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Centre: {batch.trainingCentre?.name} ({batch.trainingCentre?.code}) | District:{' '}
              {batch.trainingCentre?.district?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Timeline */}
          <BatchTimeline batch={batch} />

          {/* Tabs */}
          <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`pb-2 border-b-2 transition ${
                activeTab === 'candidates'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Candidates & Certificates ({batch.candidates?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`pb-2 border-b-2 transition ${
                activeTab === 'approvals'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Approval History ({batch.approvals?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-2 border-b-2 transition ${
                activeTab === 'audit'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Immutable Audit Trail ({batch.auditLogs?.length || 0})
            </button>
          </div>

          {/* TAB 1: Candidates Table */}
          {activeTab === 'candidates' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Roll No</th>
                    <th className="px-3 py-2">Candidate Name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Marks / Result</th>
                    <th className="px-3 py-2">Certificate Status</th>
                    <th className="px-3 py-2">WhatsApp Sim</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.candidates?.map((c) => {
                    const cert = c.certificate;
                    const notif = c.notifications?.[0];

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-mono text-slate-600 font-semibold">{c.rollNumber}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{c.fullName}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{c.phone}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-slate-800">
                            {c.marksObtained}/{c.totalMarks}
                          </span>{' '}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold ml-1">
                            {c.result}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {cert ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  cert.status === 'GENUINE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800 line-through'
                                }`}
                              >
                                {cert.certificateNumber}
                              </span>
                              {cert.status === 'CANCELLED' && (
                                <span className="text-[10px] text-rose-600 font-bold">REVOKED</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not issued yet</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {notif ? (
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  notif.status === 'DELIVERED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : notif.status === 'FAILED'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {notif.status} (Att: {notif.attempts})
                              </span>
                              {notif.status === 'FAILED' && (
                                <button
                                  onClick={() => handleRetryWhatsApp(notif.id)}
                                  className="text-sky-600 hover:text-sky-800 p-0.5"
                                  title="Retry simulated WhatsApp delivery"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Queued</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          {cert && cert.status === 'GENUINE' && (
                            <>
                              <a
                                href={`http://localhost:5000/api/certificates/${cert.certificateNumber}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-sky-700 hover:text-sky-900 font-bold text-[11px]"
                              >
                                <Download className="w-3.5 h-3.5 mr-0.5" /> PDF
                              </a>
                              {user?.role === 'STATE_OFFICE' && (
                                <button
                                  onClick={() => setCancellingCertNum(cert.certificateNumber)}
                                  className="text-rose-600 hover:text-rose-800 font-bold text-[11px]"
                                >
                                  Revoke
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Approvals Table */}
          {activeTab === 'approvals' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Officer</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Decision</th>
                    <th className="px-3 py-2">Remarks</th>
                    <th className="px-3 py-2">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.approvals?.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{a.stage}</td>
                      <td className="px-3 py-2 font-medium">{a.officer.name}</td>
                      <td className="px-3 py-2 text-slate-500">{a.officer.role}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            a.action === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.action === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{a.remarks || '—'}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">
                        {new Date(a.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {(!batch.approvals || batch.approvals.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 italic">
                        No approvals recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Immutable Audit Trail */}
          {activeTab === 'audit' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Transition</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.auditLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {log.user.name} <span className="text-[10px] text-slate-400">({log.user.role})</span>
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-sky-800">{log.action}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                        {log.fromStatus || 'INIT'} → {log.toStatus || 'END'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cancellation Confirmation Modal */}
          {cancellingCertNum && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Revoke Certificate: {cancellingCertNum}</span>
              </div>
              <p className="text-xs text-rose-700">
                This will immediately mark the certificate as CANCELLED in the national database. The public verification
                system will instantly show this revocation.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Revocation</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCancellingCertNum(null)}
                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleCancelCertificate(cancellingCertNum)}
                  className="px-4 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded"
                >
                  {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
