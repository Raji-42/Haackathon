import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { UploadCloud, AlertTriangle, CheckCircle, X, FileSpreadsheet } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [courseName, setCourseName] = useState('Web & Full Stack Development');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setValidationErrors([]);
      setGeneralError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setGeneralError('Please select a spreadsheet file (.xlsx, .csv)');
      return;
    }

    setLoading(true);
    setValidationErrors([]);
    setGeneralError(null);

    try {
      await ApiService.uploadBatch(courseName, file);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Upload failed:', err);
      if (err.validation && err.validation.errors) {
        setValidationErrors(err.validation.errors);
        setGeneralError('Validation failed: Exact row errors detected. Zero records were saved.');
      } else {
        setGeneralError(err.message || 'Failed to upload batch');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">Upload Student Candidate Batch</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Course / Vocational Trade Name
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="e.g. Electrician Skills, Web Development"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Candidate Excel or CSV File
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {file ? file.name : 'Click or drag spreadsheet file here (.xlsx, .csv)'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Expected columns: fullName, phone, email, rollNumber, marksObtained, totalMarks, result
                </p>
              </div>
            </div>

            {/* Error Display Section */}
            {generalError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold">{generalError}</div>
                  <div className="text-[11px] text-rose-700">
                    CertiFlow protects database integrity: not a single partial record has been saved.
                  </div>
                </div>
              </div>
            )}

            {/* Row-Level Errors Modal Table */}
            {validationErrors.length > 0 && (
              <div className="border border-rose-200 rounded-lg overflow-hidden">
                <div className="bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-900 flex justify-between">
                  <span>Row-Level Errors ({validationErrors.length} issues detected)</span>
                  <span>Zero Partial Saves</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="px-3 py-1.5">Row #</th>
                        <th className="px-3 py-1.5">Field</th>
                        <th className="px-3 py-1.5">Value</th>
                        <th className="px-3 py-1.5">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationErrors.map((err, i) => (
                        <tr key={i} className="hover:bg-rose-50/50">
                          <td className="px-3 py-1.5 font-bold text-rose-700">Row {err.row}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-700">{err.field}</td>
                          <td className="px-3 py-1.5 text-slate-500 truncate max-w-[120px]">
                            {err.value ? String(err.value) : '<empty>'}
                          </td>
                          <td className="px-3 py-1.5 text-rose-700">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
              >
                {loading ? 'Validating & Uploading...' : 'Validate & Upload Batch'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
