import { useState } from 'react';
import {
  FileText,
  File,
  FileImage,
  MoreVertical,
  Download,
  Share2,
  Pencil,
  Trash2,
  FolderInput,
  Eye,
  Tag,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Document, DocumentType } from '../../types/documents';
import { DOCUMENT_TYPE_LABELS } from '../../types/documents';

interface DocumentGridProps {
  documents: Document[];
  isLoading?: boolean;
  viewMode: 'grid' | 'list';
  onView: (document: Document) => void;
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
  onShare: (document: Document) => void;
  onMove: (document: Document) => void;
  onDownload: (document: Document) => void;
  selectedDocuments: Set<number>;
  onToggleSelect: (documentId: number) => void;
  onSelectAll: () => void;
  onUpload?: () => void;
}

function getDocumentIcon(document: Document) {
  if (document.is_pdf) {
    return <FileText className="w-8 h-8 text-red-500" />;
  }
  if (document.is_image) {
    return <FileImage className="w-8 h-8 text-blue-500" />;
  }
  return <File className="w-8 h-8 text-slate-400" />;
}

function getDocumentTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    invoice: 'bg-emerald-100 text-emerald-700',
    purchase_invoice: 'bg-orange-100 text-orange-700',
    bank_statement: 'bg-blue-100 text-blue-700',
    firc: 'bg-purple-100 text-purple-700',
    receipt: 'bg-green-100 text-green-700',
    expense: 'bg-red-100 text-red-700',
    contract: 'bg-indigo-100 text-indigo-700',
    tax_document: 'bg-yellow-100 text-yellow-700',
    gst_return: 'bg-amber-100 text-amber-700',
    tds_certificate: 'bg-cyan-100 text-cyan-700',
    audit_report: 'bg-teal-100 text-teal-700',
    balance_sheet: 'bg-slate-100 text-slate-700',
    profit_loss: 'bg-pink-100 text-pink-700',
    other: 'bg-gray-100 text-gray-700',
  };
  return colors[type] || colors.other;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: () => void;
  onDownload: () => void;
}

function DocumentCard({
  document,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onShare,
  onMove,
  onDownload,
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={clsx(
        'group relative bg-white rounded-xl border transition-all cursor-pointer',
        isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      )}
      onClick={onView}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={clsx(
            'w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>

      {/* Menu Button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={clsx(
            'w-8 h-8 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur hover:bg-white border border-slate-200 transition-opacity',
            showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <MoreVertical className="w-4 h-4 text-slate-500" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
              <button
                onClick={(e) => { e.stopPropagation(); onView(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDownload(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onShare(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMove(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FolderInput className="w-4 h-4" />
                Move to...
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="w-4 h-4" />
                Edit Details
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      <div className="h-32 bg-slate-50 rounded-t-xl flex items-center justify-center">
        {document.is_image && document.file_url ? (
          <img
            src={document.file_url}
            alt={document.name}
            className="w-full h-full object-cover rounded-t-xl"
          />
        ) : (
          getDocumentIcon(document)
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-slate-900 truncate text-sm" title={document.name}>
          {document.name}
        </h3>

        <div className="flex items-center gap-2 mt-2">
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', getDocumentTypeColor(document.document_type))}>
            {DOCUMENT_TYPE_LABELS[document.document_type]}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>{formatFileSize(document.file_size)}</span>
          <span>{formatDate(document.created_at)}</span>
        </div>

        {document.amount && (
          <div className="flex items-center gap-1 mt-2 text-sm font-medium text-slate-700">
            <IndianRupee className="w-3 h-3" />
            {document.amount.toLocaleString('en-IN')}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentRow({
  document,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onShare,
  onMove,
  onDownload,
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr
      className={clsx(
        'group hover:bg-slate-50 transition-colors cursor-pointer',
        isSelected && 'bg-amber-50'
      )}
      onClick={onView}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            {getDocumentIcon(document)}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-slate-900 truncate">{document.name}</h3>
            <p className="text-xs text-slate-400">{document.file_name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', getDocumentTypeColor(document.document_type))}>
          {DOCUMENT_TYPE_LABELS[document.document_type]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {document.document_date ? formatDate(document.document_date) : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {formatFileSize(document.file_size)}
      </td>
      <td className="px-4 py-3">
        {document.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">{document.tags.length}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); onDownload(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onShare(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMove(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FolderInput className="w-4 h-4" />
                  Move to...
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Details
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function DocumentGrid({
  documents,
  isLoading,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onShare,
  onMove,
  onDownload,
  selectedDocuments,
  onToggleSelect,
  onSelectAll,
  onUpload,
}: DocumentGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center">
        {/* Empty State - Google Drive Style */}
        <div className="w-32 h-24 md:w-48 md:h-36 mb-4 md:mb-6 relative">
          {/* Folder illustration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-28 h-24 md:w-40 md:h-32" viewBox="0 0 160 128" fill="none">
              <path d="M8 32C8 27.5817 11.5817 24 16 24H56L72 40H144C148.418 40 152 43.5817 152 48V112C152 116.418 148.418 120 144 120H16C11.5817 120 8 116.418 8 112V32Z" fill="#F1F5F9"/>
              <path d="M8 32C8 27.5817 11.5817 24 16 24H56L72 40H144C148.418 40 152 43.5817 152 48V112C152 116.418 148.418 120 144 120H16C11.5817 120 8 116.418 8 112V32Z" stroke="#E2E8F0" strokeWidth="2"/>
              <path d="M60 72L80 92L100 72" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M80 56V92" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">Drop files here</h3>
        <p className="text-sm text-slate-500 mb-4 md:mb-6 max-w-sm px-4">
          or tap the + button to upload files
        </p>
        {onUpload && (
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-5 md:px-6 py-2.5 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
          >
            <FileText className="w-5 h-5" />
            Upload Files
          </button>
        )}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === documents.length && documents.length > 0}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                isSelected={selectedDocuments.has(doc.id)}
                onToggleSelect={() => onToggleSelect(doc.id)}
                onView={() => onView(doc)}
                onEdit={() => onEdit(doc)}
                onDelete={() => onDelete(doc)}
                onShare={() => onShare(doc)}
                onMove={() => onMove(doc)}
                onDownload={() => onDownload(doc)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Subtle background hint for drag-drop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        <div className="text-center">
          <svg className="w-48 h-48 mx-auto" viewBox="0 0 192 192" fill="none">
            <path d="M32 64C32 55.163 39.163 48 48 48H80L96 64H144C152.837 64 160 71.163 160 80V144C160 152.837 152.837 160 144 160H48C39.163 160 32 152.837 32 144V64Z" fill="currentColor"/>
            <path d="M80 104L96 120L112 104" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M96 88V120" stroke="white" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 p-3 md:p-4 relative">
        {documents.map((doc) => (
          <DocumentCard
          key={doc.id}
          document={doc}
          isSelected={selectedDocuments.has(doc.id)}
          onToggleSelect={() => onToggleSelect(doc.id)}
          onView={() => onView(doc)}
          onEdit={() => onEdit(doc)}
          onDelete={() => onDelete(doc)}
          onShare={() => onShare(doc)}
          onMove={() => onMove(doc)}
          onDownload={() => onDownload(doc)}
          />
        ))}
      </div>
    </div>
  );
}
