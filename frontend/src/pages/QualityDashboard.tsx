import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Batch } from '../types';
import { BatchDetailModal } from '../components/BatchDetailModal';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Sliders,
  Flag,
} from 'lucide-react';

export const QualityDashboard: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'FLAGGED'>('APPROVED');
  const [observations, setObservations] = useState('');
  const [threshold, setThreshold] = useState('25');
  const [updatingThreshold, setUpdatingThreshold] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getBatches();
      setBatches(res.batches || []);
      const cfgRes = await ApiService.getConfigs();
      const largeCfg = cfgRes.configs?.find((c: any) => c.key === 'LARGE_BATCH_THRESHOLD');
      if (largeCfg) setThreshold(largeCfg.value);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId || !observations.trim()) return;

    try {
      await ApiService.qualityReview(activeBatchId, decision, observations);
      alert(`Quality review recorded: ${decision}`);
      setActiveBatchId(null);
      setObservations('');
      await fetchData();
    } catch (err: any) {
      alert(`Review submission failed: ${err.message}`);
    }
  };

  const handleUpdateThreshold = async () => {
    setUpdatingThreshold(true);
    try {
      await ApiService.updateConfig('LARGE_BATCH_THRESHOLD', threshold);
      alert(`Threshold updated to ${threshold} candidates`);
    } catch (err: any) {
      alert(`Failed to update threshold: ${err.message}`);
    } finally {
      setUpdatingThreshold(false);
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

  const qualityBatches = batches.filter(
    (b) => b.status === 'QUALITY_REVIEW' || b.isQualityReviewRequired
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
              Module 3: Quality Assurance & Audit Team
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">Neha Reddy (Quality Lead)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit large cohorts, investigate scoring anomalies, and safeguard certification standards.
          </p>
        </div>

        {/* Configurable Threshold Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center space-x-3">
          <Sliders className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-700 block">Large Batch Threshold:</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-16 px-2 py-0.5 border border-slate-300 rounded font-bold text-center"
              />
              <span className="text-slate-500">students</span>
              <button
                onClick={handleUpdateThreshold}
                disabled={updatingThreshold}
                className="px-2 py-0.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-[10px]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Dialog Tray */}
      {activeBatchId && (
        <div className="bg-purple-950 text-white p-5 rounded-xl shadow-xl space-y-3 border border-purple-800 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-purple-300">
              Quality Audit for Batch: {batches.find((b) => b.id === activeBatchId)?.batchNumber}
            </h3>
            <button onClick={() => setActiveBatchId(null)} className="text-xs text-purple-400 hover:text-white">
              Cancel
            </button>
          </div>
          <form onSubmit={handleProcessReview} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">
                Quality Observations & Compliance Notes
              </label>
              <textarea
                required
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Detail sample verification findings, marks distribution assessment, attendance verification..."
                className="w-full px-3 py-2 bg-purple-900/60 border border-purple-700 rounded-lg text-xs text-white placeholder-purple-300 focus:outline-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveBatchId(null)}
                className="px-3 py-1.5 bg-purple-900 text-xs font-semibold rounded text-purple-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 text-xs font-bold rounded shadow transition ${
                  decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {decision}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>Batches Requiring Quality Audit ({qualityBatches.length})</span>
          </h2>
          <button onClick={fetchData} className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit batches...</div>
        ) : qualityBatches.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No batches currently under Quality Review</p>
            <p className="text-xs text-slate-500">Batches with more than {threshold} candidates will automatically appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Training Centre</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Cohort Size</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qualityBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.trainingCentre?.name}</td>
                    <td className="px-4 py-3 text-slate-700">{b.courseName}</td>
                    <td className="px-4 py-3 font-bold text-purple-700">
                      {b.totalStudents} candidates (Exceeds {threshold})
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 text-purple-800">
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail(b.id)}
                        className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>

                      {b.status === 'QUALITY_REVIEW' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveBatchId(b.id);
                              setDecision('APPROVED');
                              setObservations('Cohort assessment and score distribution verified to be within normal variances.');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                          >
                            Pass Audit
                          </button>
                          <button
                            onClick={() => {
                              setActiveBatchId(b.id);
                              setDecision('FLAGGED');
                              setObservations('High score clustering anomaly detected. Returned for centre re-examination.');
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px]"
                          >
                            Flag / Return
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
