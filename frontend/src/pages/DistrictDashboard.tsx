import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Batch } from '../types';
import { useAuth } from '../context/AuthContext';
import { BatchDetailModal } from '../components/BatchDetailModal';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const DistrictDashboard: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');
  const [activeActionBatchId, setActiveActionBatchId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | 'RETURNED'>('APPROVED');
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getBatches();
      setBatches(res.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [user]);

  const handleOpenDetail = async (batchId: string) => {
    try {
      const res = await ApiService.getBatchById(batchId);
      setSelectedBatch(res.batch);
      setIsDetailOpen(true);
    } catch (err) {
      console.error('Failed to load batch detail:', err);
    }
  };

  const handleProcessAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionBatchId) return;

    setSubmitting(true);
    try {
      await ApiService.districtApproval(activeActionBatchId, actionType, actionRemarks);
      alert(`Action '${actionType}' recorded successfully!`);
      setActiveActionBatchId(null);
      setActionRemarks('');
      await fetchBatches();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter batches requiring district attention
  const pendingBatches = batches.filter((b) =>
    ['PENDING_DISTRICT_APPROVAL_1', 'PENDING_DISTRICT_APPROVAL_2'].includes(b.status)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
              Module 2: District Officer Verification Portal
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">
            {user?.name} (District Authority)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Jurisdiction: {user?.district?.name || 'Hyderabad Central'} • Mandatory Two-Officer Dual Sign-off
          </p>
        </div>

        {/* Dual Control Notice Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 max-w-md">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Two-Officer Rule Active (Dual Control)</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">
            Two distinct officers must independently review every batch before it progresses to Quality/State.
          </div>
        </div>
      </div>

      {/* Action Dialog / Tray when an action is selected */}
      {activeActionBatchId && (
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xl space-y-3 border border-slate-800 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-amber-400">
              Confirm Action on Batch:{' '}
              {batches.find((b) => b.id === activeActionBatchId)?.batchNumber}
            </h3>
            <button
              onClick={() => setActiveActionBatchId(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleProcessAction} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">
                Remarks / Decision Notes (Required for Reject & Return)
              </label>
              <textarea
                required={actionType !== 'APPROVED'}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Enter verification remarks, observations or correction directives..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveActionBatchId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-1.5 text-xs font-bold rounded shadow transition ${
                  actionType === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : actionType === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {submitting ? 'Recording Decision...' : `Confirm ${actionType}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Batches Awaiting District Sign-off ({pendingBatches.length})</span>
          </h2>
          <button
            onClick={fetchBatches}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading pending batches...</div>
        ) : pendingBatches.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">All district batches processed!</p>
            <p className="text-xs text-slate-500">No batches currently pending your district review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Training Centre</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Stage & Previous Sign-off</th>
                  <th className="px-4 py-3">Pending Time</th>
                  <th className="px-4 py-3 text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingBatches.map((b) => {
                  const firstApproval = b.approvals?.find((a) => a.stage === 'DISTRICT_1');
                  const isOfficer1TheCurrentUser = firstApproval?.officer.id === user?.id;
                  const isAwaitingOfficer2 = b.status === 'PENDING_DISTRICT_APPROVAL_2';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {b.trainingCentre?.name}
                        <div className="text-[10px] text-slate-400 font-mono">{b.trainingCentre?.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{b.courseName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{b.totalStudents} students</td>
                      <td className="px-4 py-3">
                        {b.status === 'PENDING_DISTRICT_APPROVAL_1' ? (
                          <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 text-[10px]">
                            Stage 1: Awaiting 1st Officer
                          </span>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 text-[10px]">
                              Stage 2: Awaiting 2nd Officer
                            </span>
                            {firstApproval && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                DO 1 Approved by: <span className="font-bold">{firstApproval.officer.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-xs font-bold ${
                            b.isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-600'
                          }`}
                        >
                          {b.hoursPending}h {b.isOverdue ? '(OVERDUE)' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(b.id)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>

                        {/* If current user already approved Stage 1, disable approving Stage 2 (Enforce 2 distinct officers) */}
                        {isAwaitingOfficer2 && isOfficer1TheCurrentUser ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded inline-block">
                            Signed (2nd officer required)
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setActiveActionBatchId(b.id);
                                setActionType('APPROVED');
                                setActionRemarks('All candidate records verified against district logs');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setActiveActionBatchId(b.id);
                                setActionType('RETURNED');
                                setActionRemarks('');
                              }}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px]"
                            >
                              Return
                            </button>
                            <button
                              onClick={() => {
                                setActiveActionBatchId(b.id);
                                setActionType('REJECTED');
                                setActionRemarks('');
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px]"
                            >
                              Reject
                            </button>
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
      </div>

      <BatchDetailModal
        batch={selectedBatch}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={() => selectedBatch && handleOpenDetail(selectedBatch.id)}
      />
    </div>
  );
};
