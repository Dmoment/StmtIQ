import React, { useCallback, useState } from 'react';
import { 
  Upload as UploadIcon, 
  FileText, 
  X, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';

type FileStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadedFile {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  statementId?: number;
  transactionCount?: number;
}

// Get CSRF token from meta tag
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

export function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || 
              file.type === 'text/csv' ||
              file.type === 'application/vnd.ms-excel' ||
              file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              file.name.endsWith('.csv') ||
              file.name.endsWith('.xlsx') ||
              file.name.endsWith('.xls')
    );
    
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      file,
      status: 'idle' as FileStatus,
      progress: 0
    }));
    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const pollStatementStatus = async (statementId: number, fileIndex: number): Promise<boolean> => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/v1/statements/${statementId}`);
        
        if (!response.ok) throw new Error('Failed to check status');
        
        const statement = await response.json();
        
        if (statement.status === 'parsed') {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { 
              ...f, 
              status: 'success' as FileStatus,
              transactionCount: statement.transaction_count
            } : f
          ));
          return true;
        } else if (statement.status === 'failed') {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { 
              ...f, 
              status: 'error' as FileStatus,
              error: statement.error_message || 'Parsing failed'
            } : f
          ));
          return false;
        }
        
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error polling status:', error);
        attempts++;
      }
    }
    
    // Timeout
    setFiles(prev => prev.map((f, idx) => 
      idx === fileIndex ? { 
        ...f, 
        status: 'error' as FileStatus,
        error: 'Parsing timed out'
      } : f
    ));
    return false;
  };

  const uploadFile = async (fileIndex: number) => {
    const fileData = files[fileIndex];
    if (!fileData || fileData.status !== 'idle') return;

    setFiles(prev => prev.map((f, idx) => 
      idx === fileIndex ? { ...f, status: 'uploading' as FileStatus, progress: 0 } : f
    ));

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', fileData.file);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles(prev => prev.map((f, idx) => 
              idx === fileIndex ? { ...f, progress } : f
            ));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/v1/statements');
        xhr.setRequestHeader('X-CSRF-Token', getCsrfToken());
        xhr.send(formData);
      });

      // Parse response
      const response = JSON.parse(xhr.responseText);
      const statementId = response.id;

      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { 
          ...f, 
          status: 'processing' as FileStatus,
          statementId
        } : f
      ));

      // Poll for parsing completion
      await pollStatementStatus(statementId, fileIndex);

    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Upload failed';
      
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { 
          ...f, 
          status: 'error' as FileStatus, 
          error: errorMessage 
        } : f
      ));
    }
  };

  const uploadAllFiles = async () => {
    const idleFiles = files.map((f, i) => ({ file: f, index: i }))
                          .filter(({ file }) => file.status === 'idle');
    
    // Upload sequentially to avoid overwhelming the server
    for (const { index } of idleFiles) {
      await uploadFile(index);
    }
  };

  const retryFile = (index: number) => {
    setFiles(prev => prev.map((f, idx) => 
      idx === index ? { ...f, status: 'idle' as FileStatus, error: undefined, progress: 0 } : f
    ));
  };

  const hasFilesToUpload = files.some(f => f.status === 'idle');
  const isUploading = files.some(f => f.status === 'uploading' || f.status === 'processing');
  const successCount = files.filter(f => f.status === 'success').length;
  const totalTransactions = files.reduce((sum, f) => sum + (f.transactionCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Statement</h1>
        <p className="text-slate-400 mt-1">
          Upload your bank statements to parse and categorize transactions
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200",
          isDragging 
            ? "border-emerald-500 bg-emerald-500/10" 
            : "border-slate-700 hover:border-slate-600 bg-slate-900"
        )}
      >
        <input
          type="file"
          accept=".pdf,.csv,.xlsx,.xls"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className={clsx(
          "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6 transition-transform",
          isDragging ? "scale-110 from-emerald-500 to-cyan-500" : "from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30"
        )}>
          <UploadIcon className={clsx(
            "w-8 h-8",
            isDragging ? "text-white" : "text-emerald-400"
          )} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isDragging ? "Drop files here" : "Drag & drop your statements"}
        </h3>
        <p className="text-slate-400 mb-4">
          or click to browse from your computer
        </p>
        <p className="text-sm text-slate-500">
          Supports PDF, CSV, and Excel files (ICICI, HDFC, SBI, and more)
        </p>
      </div>

      {/* Success Summary */}
      {successCount > 0 && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300">
              Successfully parsed {successCount} file{successCount > 1 ? 's' : ''} with {totalTransactions} transactions
            </span>
          </div>
          <a 
            href="/transactions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            View Transactions
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Files ({files.length})</h3>
            {hasFilesToUpload && (
              <button
                onClick={uploadAllFiles}
                disabled={isUploading}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium transition-all",
                  isUploading 
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 hover:from-emerald-400 hover:to-cyan-400"
                )}
              >
                {isUploading ? 'Uploading...' : 'Upload All'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800"
              >
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  file.status === 'success' ? "bg-emerald-500/20" :
                  file.status === 'error' ? "bg-rose-500/20" :
                  "bg-slate-800"
                )}>
                  <FileText className={clsx(
                    "w-5 h-5",
                    file.status === 'success' ? "text-emerald-400" :
                    file.status === 'error' ? "text-rose-400" :
                    "text-slate-400"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.file.size / 1024).toFixed(1)} KB
                    {file.transactionCount !== undefined && (
                      <span className="ml-2 text-emerald-400">
                        • {file.transactionCount} transactions
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {file.status === 'idle' && (
                    <>
                      <span className="text-sm text-slate-500">Ready</span>
                      <button
                        onClick={() => uploadFile(index)}
                        disabled={isUploading}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-sm hover:bg-slate-700 transition-colors"
                      >
                        Upload
                      </button>
                    </>
                  )}
                  
                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-400 w-10">{file.progress}%</span>
                    </div>
                  )}
                  
                  {file.status === 'processing' && (
                    <div className="flex items-center gap-2 text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Parsing...</span>
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">Complete</span>
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm max-w-[150px] truncate" title={file.error}>
                          {file.error}
                        </span>
                      </div>
                      <button
                        onClick={() => retryFile(index)}
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                        title="Retry"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {(file.status === 'idle' || file.status === 'error') && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-slate-800 rounded"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
        <h3 className="font-semibold mb-4">💡 Tips for best results</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Download statements as <strong className="text-slate-200">CSV or Excel</strong> from your bank's netbanking for best accuracy</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Supported banks: ICICI, HDFC, SBI, Axis, Kotak, and most other Indian banks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>PDF parsing works but may be less accurate than spreadsheet formats</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Transactions are automatically categorized using AI after parsing</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
