import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, Calendar, Tag, IndianRupee, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { DocumentType, Folder } from '../../types/documents';
import { DOCUMENT_TYPE_LABELS } from '../../types/documents';
import { useUploadDocument } from '../../queries/useDocuments';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: number | null;
  folders: Folder[];
}

interface UploadFile {
  file: File;
  name: string;
  documentType: DocumentType;
  documentDate: string;
  tags: string[];
  amount: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'purchase_invoice',
  'bank_statement',
  'firc',
  'receipt',
  'expense',
  'contract',
  'tax_document',
  'gst_return',
  'tds_certificate',
  'audit_report',
  'balance_sheet',
  'profit_loss',
  'other',
];

export function DocumentUploadModal({ isOpen, onClose, folderId, folders }: DocumentUploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(folderId);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDocument = useUploadDocument();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, []);

  const addFiles = (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      documentType: guessDocumentType(file.name),
      documentDate: new Date().toISOString().split('T')[0],
      tags: [],
      amount: '',
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const guessDocumentType = (filename: string): DocumentType => {
    const lower = filename.toLowerCase();
    if (lower.includes('invoice')) return 'invoice';
    if (lower.includes('statement')) return 'bank_statement';
    if (lower.includes('receipt')) return 'receipt';
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('gst')) return 'gst_return';
    if (lower.includes('tds')) return 'tds_certificate';
    return 'other';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const updateFile = (index: number, updates: Partial<UploadFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];
      if (uploadFile.status !== 'pending') continue;

      updateFile(i, { status: 'uploading' });

      try {
        await uploadDocument.mutateAsync({
          file: uploadFile.file,
          name: uploadFile.name,
          folder_id: selectedFolderId,
          document_type: uploadFile.documentType,
          document_date: uploadFile.documentDate || undefined,
          tags: uploadFile.tags,
          amount: uploadFile.amount ? parseFloat(uploadFile.amount) : undefined,
        });
        updateFile(i, { status: 'success' });
      } catch (error) {
        updateFile(i, { status: 'error', error: (error as Error).message });
      }
    }
  };

  const handleClose = () => {
    setFiles([]);
    setSelectedFolderId(folderId);
    onClose();
  };

  const pendingFiles = files.filter((f) => f.status === 'pending');
  const uploadingFiles = files.filter((f) => f.status === 'uploading');
  const successFiles = files.filter((f) => f.status === 'success');
  const canUpload = pendingFiles.length > 0 && uploadingFiles.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
            <p className="text-sm text-slate-500">Add files to your document storage</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Folder Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Upload to folder</label>
            <select
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Root (No folder)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.path || folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Drop Zone */}
          <div
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
              dragActive ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Drag and drop files here, or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-slate-400 mt-3">
              PDF, DOC, XLS, JPG, PNG up to 10MB each
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Files ({files.length})</h3>
                {successFiles.length === files.length && files.length > 0 && (
                  <span className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    All uploaded
                  </span>
                )}
              </div>

              {files.map((uploadFile, index) => (
                <div
                  key={index}
                  className={clsx(
                    'border rounded-xl p-4 transition-colors',
                    uploadFile.status === 'success' && 'border-emerald-200 bg-emerald-50',
                    uploadFile.status === 'error' && 'border-red-200 bg-red-50',
                    uploadFile.status === 'uploading' && 'border-amber-200 bg-amber-50',
                    uploadFile.status === 'pending' && 'border-slate-200'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {uploadFile.status === 'uploading' ? (
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                      ) : uploadFile.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : uploadFile.status === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900 truncate">{uploadFile.file.name}</span>
                        {uploadFile.status === 'pending' && (
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        )}
                      </div>

                      {uploadFile.status === 'error' && (
                        <p className="text-sm text-red-600 mb-2">{uploadFile.error}</p>
                      )}

                      {uploadFile.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Name</label>
                            <input
                              type="text"
                              value={uploadFile.name}
                              onChange={(e) => updateFile(index, { name: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Type</label>
                            <select
                              value={uploadFile.documentType}
                              onChange={(e) => updateFile(index, { documentType: e.target.value as DocumentType })}
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              {DOCUMENT_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {DOCUMENT_TYPE_LABELS[type]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Date</label>
                            <input
                              type="date"
                              value={uploadFile.documentDate}
                              onChange={(e) => updateFile(index, { documentDate: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Amount</label>
                            <input
                              type="number"
                              value={uploadFile.amount}
                              onChange={(e) => updateFile(index, { amount: e.target.value })}
                              placeholder="0.00"
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {successFiles.length === files.length && files.length > 0 ? 'Done' : 'Cancel'}
          </button>
          {canUpload && (
            <button
              onClick={handleUploadAll}
              className="px-4 py-2 text-sm font-medium text-slate-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
