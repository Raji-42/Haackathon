import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Batch } from '../types';
import { UploadModal } from '../components/UploadModal';
import { BatchDetailModal } from '../components/BatchDetailModal';
import {
  Plus,
  Send,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';

export const TrainingDashboard: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

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

  const handleSubmitBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to submit this batch for District Officer review?')) return;
    setSubmittingId(batchId);
    try {
      await ApiService.submitBatch(batchId);
      await fetchBatches();
      alert('Batch submitted successfully for District Officer review!');
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingId(null);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
              Module 1: Training Centre Portal
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">Apex Skilling Academy Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, validate, track, and manage student batches under Pragati Skills Mission.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch (Upload File)</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Batches</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{batches.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Draft / Returned</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {batches.filter((b) => b.status === 'DRAFT' || b.status === 'RETURNED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">In Review Pipeline</span>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {
              batches.filter((b) =>
                ['PENDING_DISTRICT_APPROVAL_1', 'PENDING_DISTRICT_APPROVAL_2', 'QUALITY_REVIEW', 'PENDING_STATE_APPROVAL'].includes(
                  b.status
                )
              ).length
            }
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Certified & Completed</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {batches.filter((b) => b.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            <span>Uploaded Student Batches</span>
          </h2>
          <button
            onClick={fetchBatches}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading candidate batches...</div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No student batches uploaded yet</p>
            <p className="text-xs text-slate-500">
              Click &quot;Create New Batch&quot; to upload your candidate spreadsheet (.csv or .xlsx).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Course / Trade</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Quality Audit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks / Feedback</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.courseName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{b.totalStudents} candidates</td>
                    <td className="px-4 py-3">
                      {b.isQualityReviewRequired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          Required (&gt;25)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Standard (&le;25)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'RETURNED'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : b.status === 'DRAFT'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {b.status === 'RETURNED' && (
                        <span className="text-amber-700 font-semibold">{b.returnRemarks}</span>
                      )}
                      {b.status === 'REJECTED' && (
                        <span className="text-rose-700 font-semibold">{b.rejectionReason}</span>
                      )}
                      {!b.returnRemarks && !b.rejectionReason && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail(b.id)}
                        className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 rounded font-semibold transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>

                      {(b.status === 'DRAFT' || b.status === 'RETURNED') && (
                        <button
                          disabled={submittingId === b.id}
                          onClick={() => handleSubmitBatch(b.id)}
                          className="px-3 py-1 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded font-bold transition inline-flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingId === b.id ? 'Submitting...' : 'Submit'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchBatches}
      />

      <BatchDetailModal
        batch={selectedBatch}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={() => selectedBatch && handleOpenDetail(selectedBatch.id)}
      />
    </div>
  );
};
