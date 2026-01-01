import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { 
  Upload as UploadIcon, 
  FileText, 
  X, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Building2,
  CreditCard,
  Wallet,
  PiggyBank,
  Landmark,
  FileSpreadsheet,
  FileType,
  File
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

interface BankTemplate {
  id: number;
  account_type: string;
  file_format: string;
  description: string;
  display_name: string;
}

interface BankGroup {
  bank_code: string;
  bank_name: string;
  logo_url: string | null;
  templates: BankTemplate[];
}

// Bank fallback colors
const bankColors: Record<string, string> = {
  hdfc: 'from-blue-600 to-blue-700',
  icici: 'from-orange-500 to-red-600',
  sbi: 'from-blue-500 to-indigo-600',
  axis: 'from-pink-600 to-rose-600',
  kotak: 'from-red-600 to-red-700',
};

const accountTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  savings: { icon: PiggyBank, label: 'Savings Account', color: 'emerald' },
  current: { icon: Building2, label: 'Current Account', color: 'blue' },
  credit_card: { icon: CreditCard, label: 'Credit Card', color: 'violet' },
  salary: { icon: Wallet, label: 'Salary Account', color: 'amber' },
  fd_rd: { icon: Landmark, label: 'FD/RD Account', color: 'cyan' },
  loan: { icon: Landmark, label: 'Loan Account', color: 'rose' },
};

const formatConfig: Record<string, { icon: React.ElementType; label: string; description: string }> = {
  xls: { icon: FileSpreadsheet, label: 'Excel (.xls)', description: 'Classic Excel format' },
  xlsx: { icon: FileSpreadsheet, label: 'Excel (.xlsx)', description: 'Modern Excel format' },
  csv: { icon: FileType, label: 'CSV', description: 'Comma-separated values' },
  pdf: { icon: File, label: 'PDF', description: 'Portable document format' },
};

function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

export function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [banks, setBanks] = useState<BankGroup[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  // 3-step selection
  const [selectedBank, setSelectedBank] = useState<BankGroup | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  // Fetch bank templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/v1/bank_templates');
        if (response.ok) {
          const data = await response.json();
          setBanks(data);
        }
      } catch (error) {
        console.error('Failed to fetch bank templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  // Get unique account types for selected bank
  const availableAccountTypes = useMemo(() => {
    if (!selectedBank) return [];
    const types = new Set(selectedBank.templates.map(t => t.account_type));
    return Array.from(types);
  }, [selectedBank]);

  // Get available formats for selected account type
  const availableFormats = useMemo(() => {
    if (!selectedBank || !selectedAccountType) return [];
    return selectedBank.templates
      .filter(t => t.account_type === selectedAccountType)
      .map(t => t.file_format);
  }, [selectedBank, selectedAccountType]);

  // Get the selected template based on all selections
  const selectedTemplate = useMemo(() => {
    if (!selectedBank || !selectedAccountType || !selectedFormat) return null;
    return selectedBank.templates.find(
      t => t.account_type === selectedAccountType && t.file_format === selectedFormat
    ) || null;
  }, [selectedBank, selectedAccountType, selectedFormat]);

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
    
    if (!selectedTemplate) {
      alert('Please complete the selection first');
      return;
    }
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === selectedTemplate.file_format;
    });
    
    if (droppedFiles.length === 0) {
      alert(`Please select ${selectedTemplate.file_format.toUpperCase()} files`);
      return;
    }
    
    addFiles(droppedFiles);
  }, [selectedTemplate]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTemplate) {
      alert('Please complete the selection first');
      return;
    }
    
    if (e.target.files) {
      const validFiles = Array.from(e.target.files).filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext === selectedTemplate.file_format;
      });
      
      if (validFiles.length === 0) {
        alert(`Please select ${selectedTemplate.file_format.toUpperCase()} files`);
        return;
      }
      
      addFiles(validFiles);
    }
    e.target.value = '';
  }, [selectedTemplate]);

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

  const selectBank = (bank: BankGroup) => {
    setSelectedBank(bank);
    setSelectedAccountType(null);
    setSelectedFormat(null);
    setShowBankDropdown(false);
  };

  const selectAccountType = (type: string) => {
    setSelectedAccountType(type);
    setSelectedFormat(null);
    
    // Auto-select if only one format available
    const formats = selectedBank?.templates
      .filter(t => t.account_type === type)
      .map(t => t.file_format) || [];
    if (formats.length === 1) {
      setSelectedFormat(formats[0]);
    }
  };

  const pollStatementStatus = async (statementId: number, fileIndex: number): Promise<boolean> => {
    const maxAttempts = 60;
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error polling status:', error);
        attempts++;
      }
    }
    
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
    if (!fileData || fileData.status !== 'idle' || !selectedTemplate) return;

    setFiles(prev => prev.map((f, idx) => 
      idx === fileIndex ? { ...f, status: 'uploading' as FileStatus, progress: 0 } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('template_id', selectedTemplate.id.toString());

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
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/v1/statements');
        xhr.setRequestHeader('X-CSRF-Token', getCsrfToken());
        xhr.send(formData);
      });

      const response = JSON.parse(xhr.responseText);
      const statementId = response.id;

      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { 
          ...f, 
          status: 'processing' as FileStatus,
          statementId
        } : f
      ));

      await pollStatementStatus(statementId, fileIndex);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
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

  // Check completion status for each step
  const step1Complete = !!selectedBank;
  const step2Complete = !!selectedAccountType;
  const step3Complete = !!selectedFormat;
  const allStepsComplete = step1Complete && step2Complete && step3Complete;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Upload Statement</h1>
        <p className="text-slate-600 text-sm">
          Select your bank, account type, and file format to upload
        </p>
      </div>

      {/* 3-Step Selection */}
      <div className="grid gap-6">
        {/* Step 1: Select Bank */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              step1Complete ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {step1Complete ? <CheckCircle2 className="w-4 h-4" /> : "1"}
            </span>
            <label className={clsx("text-sm font-medium", step1Complete ? "text-slate-900" : "text-slate-600")}>Select Bank</label>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowBankDropdown(!showBankDropdown)}
              className={clsx(
                "w-full flex items-center justify-between gap-3 p-4 rounded-lg border transition-colors text-left bg-white shadow-sm",
                step1Complete 
                  ? "border-slate-800" 
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              {selectedBank ? (
                <div className="flex items-center gap-3">
                  {selectedBank.logo_url ? (
                    <img 
                      src={selectedBank.logo_url} 
                      alt={selectedBank.bank_name}
                      className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                    />
                  ) : (
                    <div className={clsx(
                      "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                      bankColors[selectedBank.bank_code] || 'from-slate-600 to-slate-700'
                    )}>
                      <span className="text-white font-bold text-sm">
                        {selectedBank.bank_name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium">{selectedBank.bank_name}</span>
                </div>
              ) : (
                <span className="text-slate-500">Choose your bank...</span>
              )}
              <ChevronDown className={clsx(
                "w-5 h-5 text-slate-500 transition-transform",
                showBankDropdown && "rotate-180"
              )} />
            </button>

            {showBankDropdown && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {loadingTemplates ? (
                  <div className="p-4 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : (
                  banks.map(bank => (
                    <button
                      key={bank.bank_code}
                      onClick={() => selectBank(bank)}
                      className={clsx(
                        "w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors",
                        selectedBank?.bank_code === bank.bank_code && "bg-slate-50"
                      )}
                    >
                      {bank.logo_url ? (
                        <img 
                          src={bank.logo_url} 
                          alt={bank.bank_name}
                          className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                        />
                      ) : (
                        <div className={clsx(
                          "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                          bankColors[bank.bank_code] || 'from-slate-600 to-slate-700'
                        )}>
                          <span className="text-white font-bold text-sm">
                            {bank.bank_name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{bank.bank_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Select Account Type */}
        <div className={clsx("space-y-3 transition-opacity", !step1Complete && "opacity-50 pointer-events-none")}>
          <div className="flex items-center gap-2">
            <span className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              step2Complete ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {step2Complete ? <CheckCircle2 className="w-4 h-4" /> : "2"}
            </span>
            <label className={clsx("text-sm font-medium", step2Complete ? "text-slate-900" : "text-slate-600")}>Select Account Type</label>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {availableAccountTypes.map(type => {
              const config = accountTypeConfig[type] || { icon: Wallet, label: type, color: 'slate' };
              const Icon = config.icon;
              const isSelected = selectedAccountType === type;
              
              return (
                <button
                  key={type}
                  onClick={() => selectAccountType(type)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border transition-all bg-white shadow-sm",
                    isSelected 
                      ? "border-slate-800 bg-slate-50 text-slate-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  )}
                >
                  <Icon className={clsx(
                    "w-5 h-5",
                    isSelected ? "text-slate-900" : "text-slate-500"
                  )} />
                  <span className="font-medium">{config.label}</span>
                </button>
              );
            })}
            
            {availableAccountTypes.length === 0 && step1Complete && (
              <p className="text-slate-500 text-sm">No account types available</p>
            )}
          </div>
        </div>

        {/* Step 3: Select File Format */}
        <div className={clsx("space-y-3 transition-opacity", !step2Complete && "opacity-50 pointer-events-none")}>
          <div className="flex items-center gap-2">
            <span className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              step3Complete ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {step3Complete ? <CheckCircle2 className="w-4 h-4" /> : "3"}
            </span>
            <label className={clsx("text-sm font-medium", step3Complete ? "text-slate-900" : "text-slate-600")}>Select File Format</label>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {availableFormats.map(format => {
              const config = formatConfig[format] || { icon: File, label: format.toUpperCase(), description: '' };
              const Icon = config.icon;
              const isSelected = selectedFormat === format;
              
              return (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all bg-white shadow-sm",
                    isSelected 
                      ? "border-slate-800 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Icon className={clsx(
                    "w-5 h-5",
                    isSelected ? "text-slate-900" : "text-slate-500"
                  )} />
                  <div className="text-left">
                    <p className={clsx("font-medium", isSelected ? "text-slate-900" : "text-slate-700")}>
                      {config.label}
                    </p>
                    {config.description && (
                      <p className="text-xs text-slate-500">{config.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
            
            {availableFormats.length === 0 && step2Complete && (
              <p className="text-slate-500 text-sm">No formats available</p>
            )}
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      {allStepsComplete && selectedTemplate && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            "relative rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200 bg-white shadow-sm",
            isDragging 
              ? "border-slate-800 bg-slate-50" 
              : "border-slate-300 hover:border-slate-400"
          )}
        >
          <input
            type="file"
            accept={`.${selectedTemplate.file_format}`}
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className={clsx(
            "w-16 h-16 rounded-lg bg-slate-100 border-2 border-dashed flex items-center justify-center mx-auto mb-6 transition-transform",
            isDragging ? "scale-110 border-slate-800 bg-slate-200" : "border-slate-300"
          )}>
            <UploadIcon className={clsx(
              "w-8 h-8",
              isDragging ? "text-slate-900" : "text-slate-600"
            )} />
          </div>
          
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {isDragging ? "Drop files here" : "Drag & drop your statements"}
          </h3>
          <p className="text-slate-600 mb-4">
            or click to browse from your computer
          </p>
          <p className="text-sm text-slate-500">
            Upload <strong className="text-slate-900">{selectedTemplate.file_format.toUpperCase()}</strong> files for{' '}
            <strong className="text-slate-900">{selectedBank?.bank_name}</strong>{' '}
            {accountTypeConfig[selectedAccountType!]?.label || selectedAccountType}
          </p>
        </div>
      )}

      {/* Incomplete selection message */}
      {!allStepsComplete && !loadingTemplates && (
        <div className="p-8 rounded-lg border-2 border-dashed border-slate-300 bg-white text-center shadow-sm">
          <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <UploadIcon className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Complete the selection above
          </h3>
          <p className="text-sm text-slate-600">
            Select your bank, account type, and file format to upload statements
          </p>
        </div>
      )}

      {/* Success Summary */}
      {successCount > 0 && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">
              Successfully parsed {successCount} file{successCount > 1 ? 's' : ''} with {totalTransactions} transactions
            </span>
          </div>
          <a 
            href="/transactions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
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
                disabled={isUploading || !selectedTemplate}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium transition-all shadow-sm",
                  isUploading || !selectedTemplate
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-slate-800 text-white hover:bg-slate-700"
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
                className="flex items-center gap-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm"
              >
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  file.status === 'success' ? "bg-emerald-100" :
                  file.status === 'error' ? "bg-red-100" :
                  "bg-slate-100"
                )}>
                  <FileText className={clsx(
                    "w-5 h-5",
                    file.status === 'success' ? "text-emerald-600" :
                    file.status === 'error' ? "text-red-600" :
                    "text-slate-600"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{file.file.name}</p>
                  <p className="text-sm text-slate-600">
                    {(file.file.size / 1024).toFixed(1)} KB
                    {file.transactionCount !== undefined && (
                      <span className="ml-2 text-emerald-600 font-medium">
                        • {file.transactionCount} transactions
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {file.status === 'idle' && (
                    <>
                      <span className="text-sm text-slate-600">Ready</span>
                      <button
                        onClick={() => uploadFile(index)}
                        disabled={isUploading || !selectedTemplate}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        Upload
                      </button>
                    </>
                  )}
                  
                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div 
                          className="h-full bg-slate-800 transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600 w-10">{file.progress}%</span>
                    </div>
                  )}
                  
                  {file.status === 'processing' && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Parsing...</span>
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Complete</span>
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm max-w-[150px] truncate" title={file.error}>
                          {file.error}
                        </span>
                      </div>
                      <button
                        onClick={() => retryFile(index)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                        title="Retry"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {(file.status === 'idle' || file.status === 'error') && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-slate-100 rounded"
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
      <div className="p-6 rounded-lg bg-slate-800 text-white border border-slate-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">💡</span>
          <span>Tips for best results</span>
        </h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-white mt-0.5">•</span>
            <span>Download statements from your bank's <strong className="text-white">NetBanking portal</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-white mt-0.5">•</span>
            <span><strong className="text-white">Excel and CSV</strong> formats provide better parsing accuracy than PDF</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-white mt-0.5">•</span>
            <span>Transactions are automatically categorized using AI after parsing</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
