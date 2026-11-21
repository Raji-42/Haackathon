import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Batch } from '../types';
import { BatchDetailModal } from '../components/BatchDetailModal';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  Award,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const StateDashboard: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [remarks, setRemarks] = useState('');
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
  }, []);

  const handleStateApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId) return;

    setSubmitting(true);
    try {
      await ApiService.stateApproval(activeBatchId, actionType, remarks);
      alert(`State office decision '${actionType}' recorded! If approved, certificate generation is running.`);
      setActiveBatchId(null);
      setRemarks('');
      await fetchBatches();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = async (batchId: string) => {
    try {
      const res = await ApiService.getBatchById(batchId);
      setSelectedBatch(res.batch);
      setIsDetailOpen(true);
    } catch (err) {
      console.error('Failed to load batch detail:', err);
    }
  };

  const pendingBatches = batches.filter((b) => b.status === 'PENDING_STATE_APPROVAL');
  const overdueBatches = batches.filter((b) => b.isOverdue);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
              Module 4: State Office Directorate
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">Farah Khan (Mission Director)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Final statutory authorization for certificate issuance & statewide compliance oversight.
          </p>
        </div>

        {/* SLA Delay Alarm Card */}
        {overdueBatches.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-xs text-rose-900 flex items-center space-x-2 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">{overdueBatches.length} Overdue Batch(es) Detected!</span>
              <p className="text-[11px] text-rose-700">Approvals pending beyond the 24-hour SLA threshold.</p>
            </div>
          </div>
        )}
      </div>

      {/* Decision Modal Tray */}
      {activeBatchId && (
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xl space-y-3 border border-slate-800 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-amber-400">
              State Final Sign-off: {batches.find((b) => b.id === activeBatchId)?.batchNumber}
            </h3>
            <button onClick={() => setActiveBatchId(null)} className="text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
          <form onSubmit={handleStateApproval} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorization Remarks / Sanction Order
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Sanctioned for immediate electronic issuance under Pragati Skills Mission..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveBatchId(null)}
                className="px-3 py-1.5 bg-slate-800 text-xs font-semibold rounded text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-1.5 text-xs font-bold rounded shadow transition ${
                  actionType === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Dispatching Issuance Queue...' : `Confirm Final ${actionType}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Statewide Approval Queue ({batches.length} total)</span>
          </h2>
          <button onClick={fetchBatches} className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading statewide batches...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Training Centre</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3">SLA Status</th>
                  <th className="px-4 py-3 text-right">State Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.trainingCentre?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{b.trainingCentre?.district?.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{b.totalStudents} candidates</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'PENDING_STATE_APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.isOverdue ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 text-[10px] animate-pulse">
                          ⚠️ OVERDUE ({b.hoursPending}h)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">{b.hoursPending}h pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(b.id)}
                        className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>

                      {b.status === 'PENDING_STATE_APPROVAL' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveBatchId(b.id);
                              setActionType('APPROVED');
                              setRemarks('Final state sanction granted for digital certificate issuance.');
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Final Approve
                          </button>
                          <button
                            onClick={() => {
                              setActiveBatchId(b.id);
                              setActionType('REJECTED');
                              setRemarks('');
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px]"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
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
