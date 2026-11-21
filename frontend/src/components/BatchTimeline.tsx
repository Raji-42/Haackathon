import React from 'react';
import { Batch } from '../types';
import { CheckCircle2, Clock, AlertCircle, XCircle, ArrowRight } from 'lucide-react';

export const BatchTimeline: React.FC<{ batch: Batch }> = ({ batch }) => {
  const steps = [
    {
      id: 'SUBMITTED',
      label: 'Batch Submission',
      role: 'Training Centre',
      officer: batch.trainingCentre?.name || 'Training Centre',
      isCompleted: batch.status !== 'DRAFT',
      isActive: batch.status === 'SUBMITTED',
      date: batch.submittedAt,
    },
    {
      id: 'DISTRICT_1',
      label: 'District Review 1',
      role: 'District Officer 1',
      officer: batch.approvals?.find((a) => a.stage === 'DISTRICT_1')?.officer.name || 'Awaiting DO 1',
      isCompleted: [
        'PENDING_DISTRICT_APPROVAL_2',
        'QUALITY_REVIEW',
        'PENDING_STATE_APPROVAL',
        'APPROVED',
        'ISSUING_CERTIFICATES',
        'COMPLETED',
      ].includes(batch.status),
      isActive: batch.status === 'PENDING_DISTRICT_APPROVAL_1',
      date: batch.approvals?.find((a) => a.stage === 'DISTRICT_1')?.createdAt,
    },
    {
      id: 'DISTRICT_2',
      label: 'District Review 2 (Dual Sign-off)',
      role: 'District Officer 2',
      officer: batch.approvals?.find((a) => a.stage === 'DISTRICT_2')?.officer.name || 'Awaiting DO 2',
      isCompleted: [
        'QUALITY_REVIEW',
        'PENDING_STATE_APPROVAL',
        'APPROVED',
        'ISSUING_CERTIFICATES',
        'COMPLETED',
      ].includes(batch.status),
      isActive: batch.status === 'PENDING_DISTRICT_APPROVAL_2',
      date: batch.approvals?.find((a) => a.stage === 'DISTRICT_2')?.createdAt,
    },
    ...(batch.isQualityReviewRequired
      ? [
          {
            id: 'QUALITY_REVIEW',
            label: 'Quality Audit (>25 Students)',
            role: 'Quality Team',
            officer: batch.qualityReviews?.[0]?.reviewer.name || 'Neha Reddy',
            isCompleted: ['PENDING_STATE_APPROVAL', 'APPROVED', 'ISSUING_CERTIFICATES', 'COMPLETED'].includes(
              batch.status
            ),
            isActive: batch.status === 'QUALITY_REVIEW',
            date: batch.qualityReviews?.[0]?.reviewedAt,
          },
        ]
      : []),
    {
      id: 'STATE_APPROVAL',
      label: 'State Authority Sign-off',
      role: 'State Director',
      officer: batch.approvals?.find((a) => a.stage === 'STATE_FINAL')?.officer.name || 'Farah Khan',
      isCompleted: ['APPROVED', 'ISSUING_CERTIFICATES', 'COMPLETED'].includes(batch.status),
      isActive: batch.status === 'PENDING_STATE_APPROVAL',
      date: batch.approvals?.find((a) => a.stage === 'STATE_FINAL')?.createdAt,
    },
    {
      id: 'ISSUED',
      label: 'Certificates & QR Generation',
      role: 'Automated Worker',
      officer: 'BullMQ + PDF Generator',
      isCompleted: batch.status === 'COMPLETED',
      isActive: batch.status === 'ISSUING_CERTIFICATES',
      date: batch.status === 'COMPLETED' ? batch.lastActionAt : undefined,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span>Visual Approval Timeline</span>
            {batch.isOverdue && (
              <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded font-bold animate-pulse">
                ⚠️ OVERDUE ({batch.hoursPending}h pending)
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">Live multi-tier dual control tracking</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Current State:</span>{' '}
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
            {batch.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Rejection / Return Alert Banner */}
      {batch.status === 'RETURNED' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Batch Returned for Correction:</span> {batch.returnRemarks || 'Review remarks'}
            <div className="text-[11px] text-amber-700 mt-1">
              Training Centre can upload a corrected file and resubmit. Previous approvals will cleanly restart.
            </div>
          </div>
        </div>
      )}

      {batch.status === 'REJECTED' && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs flex items-start gap-2">
          <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Batch Rejected:</span> {batch.rejectionReason || 'Rejected by reviewing officer'}
          </div>
        </div>
      )}

      {/* Horizontal Steps */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
        {steps.map((s, idx) => {
          let badgeBg = 'bg-slate-100 border-slate-200 text-slate-500';
          let icon = <Clock className="w-4 h-4 text-slate-400" />;

          if (s.isCompleted) {
            badgeBg = 'bg-emerald-50 border-emerald-300 text-emerald-800';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
          } else if (s.isActive) {
            badgeBg = 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-300 ring-opacity-50';
            icon = <Clock className="w-4 h-4 text-sky-600 animate-spin" />;
          }

          return (
            <div key={s.id} className={`p-3 rounded-lg border text-xs relative ${badgeBg}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">Step {idx + 1}</span>
                {icon}
              </div>
              <div className="font-bold text-slate-900 mb-0.5">{s.label}</div>
              <div className="text-[11px] text-slate-600 mb-1">{s.officer}</div>
              {s.date ? (
                <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-200">
                  {new Date(s.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic mt-1">Pending</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
