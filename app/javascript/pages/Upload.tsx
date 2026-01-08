import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
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

  // Refs for click-outside handling
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click-outside handler for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBankDropdown(false);
      }
    }

    if (showBankDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBankDropdown]);

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

  // File management
  const addFiles = useCallback((newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      file,
      status: 'idle' as FileStatus,
      progress: 0
    }));
    setFiles(prev => [...prev, ...uploadedFiles]);
  }, []);

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
  }, [selectedTemplate, addFiles]);

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
  }, [selectedTemplate, addFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const selectBank = useCallback((bank: BankGroup) => {
    setSelectedBank(bank);
    setSelectedAccountType(null);
    setSelectedFormat(null);
    setShowBankDropdown(false);
  }, []);

  const selectAccountType = useCallback((type: string) => {
    setSelectedAccountType(type);
    setSelectedFormat(null);

    // Auto-select if only one format available
    const formats = selectedBank?.templates
      .filter(t => t.account_type === type)
      .map(t => t.file_format) || [];
    if (formats.length === 1) {
      setSelectedFormat(formats[0]);
    }
  }, [selectedBank]);

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

  const uploadFile = useCallback(async (fileIndex: number) => {
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
  }, [files, selectedTemplate]);

  const uploadAllFiles = useCallback(async () => {
    const idleFiles = files.map((f, i) => ({ file: f, index: i }))
                          .filter(({ file }) => file.status === 'idle');

    for (const { index } of idleFiles) {
      await uploadFile(index);
    }
  }, [files, uploadFile]);

  const retryFile = useCallback((index: number) => {
    setFiles(prev => prev.map((f, idx) =>
      idx === index ? { ...f, status: 'idle' as FileStatus, error: undefined, progress: 0 } : f
    ));
  }, []);

  // Derived state with memoization
  const hasFilesToUpload = useMemo(() => files.some(f => f.status === 'idle'), [files]);
  const isUploading = useMemo(() => files.some(f => f.status === 'uploading' || f.status === 'processing'), [files]);
  const successCount = useMemo(() => files.filter(f => f.status === 'success').length, [files]);
  const totalTransactions = useMemo(() => files.reduce((sum, f) => sum + (f.transactionCount || 0), 0), [files]);

  // Check completion status for each step
  const step1Complete = !!selectedBank;
  const step2Complete = !!selectedAccountType;
  const step3Complete = !!selectedFormat;
  const allStepsComplete = step1Complete && step2Complete && step3Complete;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Select your bank, account type, and file format to upload
          </p>
        </div>
      </div>

      {/* Orange Alert Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-white border border-orange-100 p-6">
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <UploadIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">
                  Upload Bank Statements
                </h3>
                <p className="text-sm text-orange-700/80">
                  Follow the steps below to upload and parse your statements
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4 mb-3">
              <div className="flex justify-between text-xs text-orange-800 mb-1.5">
                <span>
                  {allStepsComplete ? 'Ready to upload' : `Step ${step1Complete ? (step2Complete ? (step3Complete ? '3' : '3') : '2') : '1'} of 3`}
                </span>
                <span>{[step1Complete, step2Complete, step3Complete].filter(Boolean).length} / 3 completed</span>
              </div>
              <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${([step1Complete, step2Complete, step3Complete].filter(Boolean).length / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Quick Stats with Priority indicator */}
            <div className="flex items-center gap-4 text-xs font-medium text-orange-800">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-12 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${([step1Complete, step2Complete, step3Complete].filter(Boolean).length / 3) * 100}%` }}
                  />
                </div>
                <span>
                  {[step1Complete, step2Complete, step3Complete].filter(Boolean).length === 0
                    ? 'Priority: High'
                    : [step1Complete, step2Complete, step3Complete].filter(Boolean).length < 3
                      ? 'Priority: Medium'
                      : 'Priority: Low'}
                </span>
              </div>
              {successCount > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{successCount} uploaded</span>
                </div>
              )}
              {files.length > 0 && files.some(f => f.status === 'idle') && (
                <div className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  <span>{files.filter(f => f.status === 'idle').length} pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Decorative Icon */}
          <div className="hidden md:block ml-6">
            <FileText className="w-20 h-20 text-orange-200" />
          </div>
        </div>
      </div>

      {/* 3-Step Selection with Vertical Stepper */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex gap-6">
          {/* Vertical Stepper Line */}
          <div className="flex flex-col items-center">
            {/* Step 1 Circle */}
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
              step1Complete
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-white border-slate-300 text-slate-500"
            )}>
              {step1Complete ? <CheckCircle2 className="w-5 h-5" /> : "1"}
            </div>

            {/* Connector Line 1-2 */}
            <div className="w-0.5 h-24 my-2 rounded-full overflow-hidden bg-slate-200">
              <div
                className={clsx(
                  "w-full transition-all duration-500",
                  step1Complete ? "bg-emerald-500 h-full" : "bg-slate-200 h-0"
                )}
              />
            </div>

            {/* Step 2 Circle */}
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
              step2Complete
                ? "bg-emerald-500 border-emerald-500 text-white"
                : step1Complete
                  ? "bg-white border-orange-400 text-orange-500"
                  : "bg-white border-slate-300 text-slate-400"
            )}>
              {step2Complete ? <CheckCircle2 className="w-5 h-5" /> : "2"}
            </div>

            {/* Connector Line 2-3 */}
            <div className="w-0.5 h-24 my-2 rounded-full overflow-hidden bg-slate-200">
              <div
                className={clsx(
                  "w-full transition-all duration-500",
                  step2Complete ? "bg-emerald-500 h-full" : "bg-slate-200 h-0"
                )}
              />
            </div>

            {/* Step 3 Circle */}
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
              step3Complete
                ? "bg-emerald-500 border-emerald-500 text-white"
                : step2Complete
                  ? "bg-white border-orange-400 text-orange-500"
                  : "bg-white border-slate-300 text-slate-400"
            )}>
              {step3Complete ? <CheckCircle2 className="w-5 h-5" /> : "3"}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 space-y-6">
            {/* Step 1: Select Bank */}
            <div className="min-h-[96px]">
              <div className="mb-3">
                <h4 className={clsx(
                  "font-semibold transition-colors",
                  step1Complete ? "text-emerald-700" : "text-slate-900"
                )}>
                  Select Bank
                </h4>
                <p className="text-sm text-slate-500">Choose your bank from the list</p>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowBankDropdown(!showBankDropdown)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowBankDropdown(false);
                    }
                  }}
                  aria-expanded={showBankDropdown}
                  aria-haspopup="listbox"
                  aria-label="Select your bank"
                  className={clsx(
                    "w-full flex items-center justify-between gap-3 p-4 rounded-xl border transition-all text-left bg-white shadow-sm",
                    step1Complete
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {selectedBank ? (
                    <div className="flex items-center gap-3">
                      {selectedBank.logo_url ? (
                        <img
                          src={selectedBank.logo_url}
                          alt={selectedBank.bank_name}
                          className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-100"
                        />
                      ) : (
                        <div className={clsx(
                          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                          bankColors[selectedBank.bank_code] || 'from-slate-600 to-slate-700'
                        )}>
                          <span className="text-white font-bold text-sm">
                            {selectedBank.bank_name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-slate-900">{selectedBank.bank_name}</span>
                        <p className="text-xs text-slate-500">{selectedBank.templates.length} templates available</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">Choose your bank...</span>
                  )}
                  <ChevronDown className={clsx(
                    "w-5 h-5 text-slate-400 transition-transform",
                    showBankDropdown && "rotate-180"
                  )} aria-hidden="true" />
                </button>

                {showBankDropdown && (
                  <div
                    role="listbox"
                    aria-label="Bank options"
                    className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-80 overflow-y-auto"
                  >
                    {loadingTemplates ? (
                      <div className="p-4 text-center text-slate-400" role="status">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" aria-hidden="true" />
                        <span className="sr-only">Loading banks...</span>
                      </div>
                    ) : (
                      banks.map(bank => (
                        <button
                          key={bank.bank_code}
                          role="option"
                          aria-selected={selectedBank?.bank_code === bank.bank_code}
                          onClick={() => selectBank(bank)}
                          className={clsx(
                            "w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors",
                            selectedBank?.bank_code === bank.bank_code && "bg-emerald-50"
                          )}
                        >
                          {bank.logo_url ? (
                            <img
                              src={bank.logo_url}
                              alt={bank.bank_name}
                              className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-100"
                            />
                          ) : (
                            <div className={clsx(
                              "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                              bankColors[bank.bank_code] || 'from-slate-600 to-slate-700'
                            )}>
                              <span className="text-white font-bold text-sm">
                                {bank.bank_name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="text-left">
                            <span className="font-medium text-slate-900">{bank.bank_name}</span>
                            <p className="text-xs text-slate-500">{bank.templates.length} formats</p>
                          </div>
                          {selectedBank?.bank_code === bank.bank_code && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" aria-hidden="true" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Select Account Type */}
            <div className={clsx("min-h-[96px] transition-opacity", !step1Complete && "opacity-50 pointer-events-none")}>
              <div className="mb-3">
                <h4 className={clsx(
                  "font-semibold transition-colors",
                  step2Complete ? "text-emerald-700" : step1Complete ? "text-slate-900" : "text-slate-400"
                )}>
                  Select Account Type
                </h4>
                <p className="text-sm text-slate-500">Choose the type of account</p>
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
                      aria-pressed={isSelected}
                      className={clsx(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all bg-white shadow-sm",
                        isSelected
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      )}
                    >
                      <Icon className={clsx(
                        "w-5 h-5",
                        isSelected ? "text-emerald-600" : "text-slate-500"
                      )} aria-hidden="true" />
                      <span className="font-medium">{config.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />}
                    </button>
                  );
                })}

                {availableAccountTypes.length === 0 && step1Complete && (
                  <p className="text-slate-500 text-sm">No account types available for this bank</p>
                )}
              </div>
            </div>

            {/* Step 3: Select File Format */}
            <div className={clsx("min-h-[96px] transition-opacity", !step2Complete && "opacity-50 pointer-events-none")}>
              <div className="mb-3">
                <h4 className={clsx(
                  "font-semibold transition-colors",
                  step3Complete ? "text-emerald-700" : step2Complete ? "text-slate-900" : "text-slate-400"
                )}>
                  Select File Format
                </h4>
                <p className="text-sm text-slate-500">Choose the format of your statement file</p>
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
                      aria-pressed={isSelected}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all bg-white shadow-sm",
                        isSelected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Icon className={clsx(
                        "w-5 h-5",
                        isSelected ? "text-emerald-600" : "text-slate-500"
                      )} aria-hidden="true" />
                      <div className="text-left">
                        <p className={clsx("font-medium", isSelected ? "text-emerald-700" : "text-slate-700")}>
                          {config.label}
                        </p>
                        {config.description && (
                          <p className="text-xs text-slate-500">{config.description}</p>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />}
                    </button>
                  );
                })}

                {availableFormats.length === 0 && step2Complete && (
                  <p className="text-slate-500 text-sm">No formats available for this account type</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      {allStepsComplete && selectedTemplate && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Drop zone for ${selectedTemplate.file_format.toUpperCase()} files`}
          className={clsx(
            "relative overflow-hidden rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 shadow-sm",
            isDragging
              ? "border-emerald-500 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white scale-[1.01]"
              : "border-orange-200 bg-gradient-to-br from-orange-50/30 via-white to-orange-50/20 hover:border-orange-300 hover:from-orange-50/50"
          )}
        >
          <input
            type="file"
            accept={`.${selectedTemplate.file_format}`}
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isUploading}
            aria-label={`Upload ${selectedTemplate.file_format.toUpperCase()} files`}
          />

          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-[0.08]" aria-hidden="true">
            <div className="absolute top-4 left-4 w-32 h-32 border-2 border-orange-300 rounded-full" />
            <div className="absolute bottom-4 right-4 w-24 h-24 border-2 border-orange-300 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-orange-300 rounded-full" />
          </div>

          <div className="relative z-0">
            {/* Upload Icon Container */}
            <div className={clsx(
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300",
              isDragging
                ? "bg-emerald-100 border-2 border-emerald-300 scale-110 shadow-lg shadow-emerald-100"
                : "bg-orange-50 border-2 border-dashed border-orange-200 hover:border-orange-300"
            )}>
              <UploadIcon className={clsx(
                "w-10 h-10 transition-colors duration-300",
                isDragging ? "text-emerald-600" : "text-orange-500"
              )} aria-hidden="true" />
            </div>

            <h3 className={clsx(
              "text-xl font-semibold mb-2 transition-colors",
              isDragging ? "text-emerald-800" : "text-slate-900"
            )}>
              {isDragging ? "Drop files here" : "Drag & drop your statements"}
            </h3>

            <p className="text-slate-600 mb-4">
              or <span className="text-orange-600 font-medium underline underline-offset-2 hover:text-orange-700">click to browse</span> from your computer
            </p>

            {/* Selected format badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-orange-200 shadow-sm">
              <FileText className="w-4 h-4 text-orange-500" aria-hidden="true" />
              <span className="text-sm text-slate-600">
                <strong className="text-orange-700">{selectedTemplate.file_format.toUpperCase()}</strong>
                {' '}files for{' '}
                <strong className="text-slate-900">{selectedBank?.bank_name}</strong>
              </span>
            </div>

            {/* Supported format indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-orange-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              <span>Ready to accept {selectedTemplate.file_format.toUpperCase()} files</span>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete selection message */}
      {!allStepsComplete && !loadingTemplates && (
        <div className="relative overflow-hidden p-10 rounded-xl border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50/30 via-white to-orange-50/20 text-center shadow-sm">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
            <div className="absolute top-4 right-4 w-32 h-32 border-2 border-orange-300 rounded-full" />
            <div className="absolute bottom-4 left-4 w-24 h-24 border-2 border-orange-300 rounded-full" />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex items-center justify-center mx-auto mb-5">
              <UploadIcon className="w-10 h-10 text-orange-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Complete the steps above to upload
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Select your bank, account type, and file format to enable file uploads
            </p>

            {/* Progress indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className={clsx(
                "w-2.5 h-2.5 rounded-full transition-colors",
                step1Complete ? "bg-orange-500" : "bg-slate-300"
              )} />
              <div className={clsx(
                "w-2.5 h-2.5 rounded-full transition-colors",
                step2Complete ? "bg-orange-500" : "bg-slate-300"
              )} />
              <div className={clsx(
                "w-2.5 h-2.5 rounded-full transition-colors",
                step3Complete ? "bg-orange-500" : "bg-slate-300"
              )} />
            </div>
          </div>
        </div>
      )}

      {/* Success Summary */}
      {successCount > 0 && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-emerald-800 font-semibold">
                Successfully parsed {successCount} file{successCount > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-emerald-600">
                {totalTransactions} transactions ready for review
              </p>
            </div>
          </div>
          <a
            href="/transactions"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-200 text-slate-900 hover:bg-amber-300 transition-colors font-medium"
          >
            View Transactions
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Files ({files.length})</h3>
            {hasFilesToUpload && (
              <button
                onClick={uploadAllFiles}
                disabled={isUploading || !selectedTemplate}
                className={clsx(
                  "px-5 py-2.5 rounded-lg font-medium transition-all",
                  isUploading || !selectedTemplate
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-amber-200 text-slate-900 hover:bg-amber-300"
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
                className={clsx(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  file.status === 'success'
                    ? "bg-emerald-50/50 border-emerald-200"
                    : file.status === 'error'
                      ? "bg-red-50/50 border-red-200"
                      : "bg-slate-50/50 border-slate-200"
                )}
              >
                <div className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  file.status === 'success' ? "bg-emerald-100" :
                  file.status === 'error' ? "bg-red-100" :
                  "bg-white border border-slate-200"
                )}>
                  <FileText className={clsx(
                    "w-5 h-5",
                    file.status === 'success' ? "text-emerald-600" :
                    file.status === 'error' ? "text-red-600" :
                    "text-slate-600"
                  )} aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{file.file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.file.size / 1024).toFixed(1)} KB
                    {file.transactionCount !== undefined && (
                      <span className="ml-2 text-emerald-600 font-medium">
                        • {file.transactionCount} transactions
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {file.status === 'idle' && (
                    <>
                      <button
                        onClick={() => uploadFile(index)}
                        disabled={isUploading || !selectedTemplate}
                        className="px-4 py-2 rounded-lg bg-amber-200 text-slate-900 text-sm font-medium hover:bg-amber-300 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        Upload
                      </button>
                    </>
                  )}

                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-orange-200 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600 w-10">{file.progress}%</span>
                    </div>
                  )}

                  {file.status === 'processing' && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span className="text-sm font-medium">Parsing...</span>
                    </div>
                  )}

                  {file.status === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      <span className="text-sm font-medium">Complete</span>
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" aria-hidden="true" />
                        <span className="text-sm max-w-[150px] truncate" title={file.error}>
                          {file.error}
                        </span>
                      </div>
                      <button
                        onClick={() => retryFile(index)}
                        aria-label="Retry upload"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {(file.status === 'idle' || file.status === 'error') && (
                    <button
                      onClick={() => removeFile(index)}
                      aria-label="Remove file"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips Section - Orange Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-white border border-orange-100 p-6 shadow-sm">
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <span className="text-xl" role="img" aria-label="Light bulb">💡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">Tips for best results</h3>
                  <p className="text-sm text-orange-700/80">Follow these guidelines for accurate parsing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-orange-100">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-orange-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900 mb-0.5">Download from NetBanking</p>
                    <p className="text-xs text-orange-700/70">Get statements directly from your bank's online portal</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-orange-100">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-orange-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900 mb-0.5">Prefer Excel or CSV</p>
                    <p className="text-xs text-orange-700/70">These formats provide better parsing accuracy than PDF</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-orange-100">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-orange-600">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900 mb-0.5">Auto AI Categorization</p>
                    <p className="text-xs text-orange-700/70">Transactions are automatically categorized after parsing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Icon */}
            <div className="hidden lg:block ml-6">
              <FileSpreadsheet className="w-16 h-16 text-orange-200" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
