import { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Trash2,
  ExternalLink,
  FileText,
  File,
  FileImage,
  Calendar,
  HardDrive,
  Tag,
  Folder,
  MoreHorizontal,
  Pencil,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Document } from '../../types/documents';
import { DOCUMENT_TYPE_LABELS } from '../../types/documents';
import { useMobile } from '../../hooks/useMobile';

interface DocumentPreviewProps {
  document: Document | null;
  onClose: () => void;
  onDownload: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onMove: (doc: Document) => void;
}

function getDocumentIcon(doc: Document) {
  if (doc.is_pdf) {
    return <FileText className="w-16 h-16 text-red-500" />;
  }
  if (doc.is_image) {
    return <FileImage className="w-16 h-16 text-blue-500" />;
  }
  return <File className="w-16 h-16 text-slate-400" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentPreview({
  document: doc,
  onClose,
  onDownload,
  onShare,
  onDelete,
  onEdit,
  onMove,
}: DocumentPreviewProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const isMobile = useMobile();

  if (!doc) return null;

  const handleCopyLink = async () => {
    if (doc.file_url) {
      await navigator.clipboard.writeText(doc.file_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInNewTab = () => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

  const canPreview = doc.is_pdf || doc.is_image;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop - only show on desktop */}
      <div className="absolute inset-0 bg-black/60 hidden md:block" onClick={onClose} />

      {/* Preview Panel - Full screen on mobile */}
      <div className={clsx(
        'relative bg-white shadow-2xl flex flex-col animate-slide-in-right',
        'w-full md:ml-auto md:max-w-5xl'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-white">
          {/* Mobile: Back button and title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-lg md:hidden"
              aria-label="Close preview"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>

            {!isMobile && (
              <>
                {doc.is_pdf && <FileText className="w-6 h-6 text-red-500 flex-shrink-0" />}
                {doc.is_image && <FileImage className="w-6 h-6 text-blue-500 flex-shrink-0" />}
                {!doc.is_pdf && !doc.is_image && <File className="w-6 h-6 text-slate-400 flex-shrink-0" />}
              </>
            )}
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 truncate text-sm md:text-base">{doc.name}</h2>
              <p className="text-xs text-slate-500 hidden md:block">
                {doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Mobile: Info toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={clsx(
                'p-2 rounded-lg transition-colors md:hidden',
                showDetails ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
              )}
              aria-label={showDetails ? 'Hide details' : 'Show details'}
            >
              <Info className="w-5 h-5" />
            </button>

            {/* Action Buttons */}
            <button
              onClick={() => onDownload(doc)}
              className="p-2 md:px-3 md:py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Download document"
            >
              <Download className="w-5 h-5 md:w-4 md:h-4" />
            </button>

            <button
              onClick={() => onShare(doc)}
              className="p-2 md:px-3 md:py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Share document"
            >
              <Share2 className="w-5 h-5 md:w-4 md:h-4" />
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="More options"
                aria-expanded={showMenu}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                    <button
                      onClick={handleOpenInNewTab}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 md:hidden"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in new tab
                    </button>
                    <button
                      onClick={() => {
                        onEdit(doc);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit details
                    </button>
                    <button
                      onClick={() => {
                        onMove(doc);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Folder className="w-4 h-4" />
                      Move to folder
                    </button>
                    <button
                      onClick={() => {
                        handleCopyLink();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        onDelete(doc);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Desktop close button */}
            <div className="hidden md:block w-px h-6 bg-slate-200 mx-1" />

            <button
              onClick={onClose}
              className="hidden md:block p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Mobile Details Panel (slide up) */}
          {isMobile && showDetails && (
            <>
              <div
                className="absolute inset-0 bg-black/30 z-10"
                onClick={() => setShowDetails(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-20 max-h-[70vh] overflow-y-auto animate-slide-up-panel">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Details</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg"
                    aria-label="Close details"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Document Type */}
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Type</p>
                      <p className="text-sm text-slate-900">
                        {doc.document_type ? DOCUMENT_TYPE_LABELS[doc.document_type] : 'Other'}
                      </p>
                    </div>
                  </div>

                  {/* File Size */}
                  {doc.file_size && (
                    <div className="flex items-start gap-3">
                      <HardDrive className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Size</p>
                        <p className="text-sm text-slate-900">{formatFileSize(doc.file_size)}</p>
                      </div>
                    </div>
                  )}

                  {/* Created At */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Uploaded</p>
                      <p className="text-sm text-slate-900">{formatDate(doc.created_at)}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  {doc.amount && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Amount</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {doc.currency || 'INR'} {doc.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Main Preview */}
          <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto p-2 md:p-4">
            {doc.is_pdf && doc.file_url && (
              <iframe
                src={`${doc.file_url}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded-lg shadow-lg bg-white"
                title={doc.name}
              />
            )}

            {doc.is_image && doc.file_url && (
              <div className="relative">
                {/* Image Controls */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-md z-10">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-600 px-2" aria-live="polite">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button
                    onClick={handleRotate}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                    aria-label="Rotate image"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <img
                  src={doc.file_url}
                  alt={doc.name}
                  className="max-w-full max-h-[calc(100vh-200px)] rounded-lg shadow-lg transition-transform duration-200"
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  }}
                />
              </div>
            )}

            {!canPreview && (
              <div className="text-center">
                {getDocumentIcon(doc)}
                <p className="mt-4 text-slate-600 font-medium">{doc.name}</p>
                <p className="mt-1 text-sm text-slate-400">Preview not available for this file type</p>
                <button
                  onClick={() => onDownload(doc)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors mx-auto"
                >
                  <Download className="w-4 h-4" />
                  Download to view
                </button>
              </div>
            )}
          </div>

          {/* Details Sidebar - Hidden on mobile */}
          <div className="hidden md:block w-72 border-l border-slate-200 bg-white overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Details</h3>

              <div className="space-y-4">
                {/* Document Type */}
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="text-sm text-slate-900">
                      {doc.document_type ? DOCUMENT_TYPE_LABELS[doc.document_type] : 'Other'}
                    </p>
                  </div>
                </div>

                {/* File Size */}
                {doc.file_size && (
                  <div className="flex items-start gap-3">
                    <HardDrive className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Size</p>
                      <p className="text-sm text-slate-900">{formatFileSize(doc.file_size)}</p>
                    </div>
                  </div>
                )}

                {/* Folder */}
                {doc.folder && (
                  <div className="flex items-start gap-3">
                    <Folder className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-sm text-slate-900">{doc.folder.name}</p>
                    </div>
                  </div>
                )}

                {/* Document Date */}
                {doc.document_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Document Date</p>
                      <p className="text-sm text-slate-900">
                        {new Date(doc.document_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Created At */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Uploaded</p>
                    <p className="text-sm text-slate-900">{formatDate(doc.created_at)}</p>
                  </div>
                </div>

                {/* Updated At */}
                {doc.updated_at !== doc.created_at && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Modified</p>
                      <p className="text-sm text-slate-900">{formatDate(doc.updated_at)}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {doc.description && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-700">{doc.description}</p>
                  </div>
                )}

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount */}
                {doc.amount && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Amount</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {doc.currency || 'INR'} {doc.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                {/* Reference Number */}
                {doc.reference_number && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Reference Number</p>
                    <p className="text-sm text-slate-900 font-mono">{doc.reference_number}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
        @keyframes slide-up-panel {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up-panel {
          animation: slide-up-panel 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
