import React, { useState, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image,
  File
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUploadInvoice } from '../queries/useInvoices';

interface InvoiceUploadModalProps {
  onClose: () => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function InvoiceUploadModal({ onClose }: InvoiceUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadInvoice();

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please select a PDF or image file (PNG, JPEG)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
    e.target.value = '';
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync(selectedFile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return FileText;
    if (type.startsWith('image/')) return Image;
    return File;
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile.type) : File;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Upload Invoice</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload successful */}
          {uploadMutation.isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Invoice Uploaded Successfully!
              </h3>
              <p className="text-slate-600 text-sm">
                Your invoice is being processed. We'll extract the details and find matching transactions.
              </p>
            </div>
          ) : (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={clsx(
                  "relative rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200",
                  isDragging
                    ? "border-slate-800 bg-slate-50"
                    : selectedFile
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-300 hover:border-slate-400"
                )}
              >
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadMutation.isPending}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto">
                      <FileIcon className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-sm text-slate-600 hover:text-slate-900"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={clsx(
                      "w-14 h-14 rounded-lg flex items-center justify-center mx-auto transition-colors",
                      isDragging ? "bg-slate-200" : "bg-slate-100"
                    )}>
                      <Upload className={clsx(
                        "w-7 h-7",
                        isDragging ? "text-slate-700" : "text-slate-500"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {isDragging ? "Drop your file here" : "Drag & drop your invoice"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        or click to browse
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Supported formats */}
              <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  PDF
                </span>
                <span className="flex items-center gap-1.5">
                  <Image className="w-4 h-4" />
                  PNG, JPEG
                </span>
                <span>Max 10MB</span>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!uploadMutation.isSuccess && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className={clsx(
                "px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2",
                selectedFile && !uploadMutation.isPending
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
