import { useState, useCallback, useRef, DragEvent, useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Archive,
  ChevronDown,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  FileUp,
  FolderPlus,
  Check,
  Home,
  Upload,
  Share2,
  FolderInput,
  Link,
  Menu,
  ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { FolderTree } from '../components/documents/FolderTree';
import { DocumentGrid } from '../components/documents/DocumentGrid';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { ShareModal } from '../components/documents/ShareModal';
import { FolderModal } from '../components/documents/FolderModal';
import { BucketPanel } from '../components/documents/BucketPanel';
import { AddToBucketModal } from '../components/documents/AddToBucketModal';
import {
  useFolderTree,
  useDocuments,
  useDeleteDocument,
  useDeleteFolder,
  useUploadDocument,
} from '../queries/useDocuments';
import type { Document, Folder, Bucket, DocumentType } from '../types/documents';
import { DOCUMENT_TYPE_LABELS } from '../types/documents';
import { useMobile } from '../hooks/useMobile';

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

export function Documents() {
  // State
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareItem, setShareItem] = useState<Document | Bucket | null>(null);
  const [shareType, setShareType] = useState<'document' | 'bucket'>('document');
  const [showBucketPanel, setShowBucketPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'document' | 'folder'; item: Document | Folder } | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [showAddToBucketModal, setShowAddToBucketModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile screen
  const isMobile = useMobile();

  // Queries
  const { data: folders = [], isLoading: foldersLoading } = useFolderTree();
  const { data: documents = [], isLoading: documentsLoading } = useDocuments({
    folder_id: selectedFolderId,
    search: search || undefined,
    document_type: filterType || undefined,
  });
  // Get all documents for the tree view
  const { data: allDocuments = [] } = useDocuments({});

  const deleteDocument = useDeleteDocument();
  const deleteFolder = useDeleteFolder();
  const uploadDocument = useUploadDocument();

  // Flatten folders for navigation and lookup
  const flattenFolders = useCallback((folders: Folder[], level = 0): Folder[] => {
    return folders.reduce((acc, folder) => {
      acc.push({ ...folder });
      if (folder.children) {
        acc.push(...flattenFolders(folder.children, level + 1));
      }
      return acc;
    }, [] as Folder[]);
  }, []);

  const flatFolders = useMemo(() => flattenFolders(folders), [folders, flattenFolders]);

  // Build breadcrumb path (memoized to avoid recalculation on every render)
  const breadcrumbPath = useMemo(() => {
    if (!selectedFolderId) return [];

    const path: Folder[] = [];
    let currentId: number | null = selectedFolderId;

    while (currentId) {
      const folder = flatFolders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id;
      } else {
        break;
      }
    }

    return path;
  }, [selectedFolderId, flatFolders]);

  // Handlers
  const handleSelectFolder = (folderId: number | null) => {
    setSelectedFolderId(folderId);
    setSelectedDocuments(new Set());
    if (isMobile) setShowMobileSidebar(false);
  };

  const handleCreateFolder = (parentId: number | null) => {
    setNewFolderParentId(parentId);
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setNewFolderParentId(folder.parent_id);
    setShowFolderModal(true);
  };

  const handleDeleteFolder = (folder: Folder) => {
    setShowDeleteConfirm({ type: 'folder', item: folder });
  };

  const handleViewDocument = (doc: Document) => {
    setPreviewDocument(doc);
  };

  const handleEditDocument = (doc: Document) => {
    console.log('Edit document:', doc);
  };

  const handleDeleteDocument = (doc: Document) => {
    setShowDeleteConfirm({ type: 'document', item: doc });
  };

  const handleShareDocument = (doc: Document) => {
    setShareItem(doc);
    setShareType('document');
    setShowShareModal(true);
  };

  const handleMoveDocument = (doc: Document) => {
    console.log('Move document:', doc);
  };

  const handleDownloadDocument = (doc: Document) => {
    if (doc.file_url) {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.file_name || doc.name;
      link.click();
    }
  };

  const handleSelectBucket = (bucket: Bucket) => {
    console.log('Selected bucket:', bucket);
  };

  const handleShareBucket = (bucket: Bucket) => {
    setShareItem(bucket);
    setShareType('bucket');
    setShowShareModal(true);
  };

  const handleToggleSelect = (docId: number) => {
    setSelectedDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map((d) => d.id)));
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      if (showDeleteConfirm.type === 'document') {
        await deleteDocument.mutateAsync(showDeleteConfirm.item.id);
      } else {
        await deleteFolder.mutateAsync(showDeleteConfirm.item.id);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Drag and drop handlers for direct upload
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploadingFiles(files);

    // Upload files to current folder
    for (const file of files) {
      try {
        await uploadDocument.mutateAsync({
          file,
          folder_id: selectedFolderId,
          document_type: 'other',
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploadingFiles([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(files);

    for (const file of files) {
      try {
        await uploadDocument.mutateAsync({
          file,
          folder_id: selectedFolderId,
          document_type: 'other',
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploadingFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentFolder = selectedFolderId
    ? flatFolders.find((f) => f.id === selectedFolderId)
    : null;

  const isUploading = uploadingFiles.length > 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex relative">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown as overlay when toggled */}
      <div className={clsx(
        'bg-white flex flex-col border-r border-slate-200 z-50',
        // Mobile: fixed overlay
        'fixed inset-y-0 left-0 w-72 transform transition-transform duration-300 md:relative md:w-64 md:transform-none',
        isMobile && !showMobileSidebar && '-translate-x-full',
        isMobile && showMobileSidebar && 'translate-x-0'
      )}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-slate-200 md:hidden">
            <h2 className="font-semibold text-slate-900">Documents</h2>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}

        <div className="p-4 border-b border-slate-200">
          {/* New Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-medium transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-5 h-5" />
              New
            </button>

            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                  <button
                    onClick={() => {
                      setShowNewMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileUp className="w-5 h-5 text-slate-500" />
                    <span>File upload</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowNewMenu(false);
                      handleCreateFolder(selectedFolderId);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FolderPlus className="w-5 h-5 text-slate-500" />
                    <span>New folder</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={handleCreateFolder}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
            isLoading={foldersLoading}
            documents={allDocuments}
            onSelectDocument={handleViewDocument}
          />
        </div>

        {/* Bucket Toggle */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={() => setShowBucketPanel(!showBucketPanel)}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
              showBucketPanel ? 'bg-amber-100 text-amber-900' : 'hover:bg-slate-100'
            )}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              <span className="text-sm font-medium">Monthly Buckets</span>
            </div>
            <ChevronDown className={clsx('w-4 h-4 transition-transform', showBucketPanel && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={clsx(
          'flex-1 flex flex-col bg-slate-50 relative',
          isDragging && 'bg-amber-50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-amber-50/90 border-2 border-dashed border-amber-400 rounded-lg m-4 flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-amber-700">Drop files to upload</p>
              <p className="text-sm text-amber-600">
                Files will be uploaded to {currentFolder?.name || 'My Drive'}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
          {/* Mobile: Menu + Title row */}
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-lg md:hidden"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleSelectFolder(null)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0',
                  selectedFolderId === null
                    ? 'text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">My Drive</span>
              </button>

              {breadcrumbPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <button
                    onClick={() => handleSelectFolder(folder.id)}
                    className={clsx(
                      'px-2 py-1 rounded-lg text-sm transition-colors whitespace-nowrap max-w-[120px] truncate',
                      index === breadcrumbPath.length - 1
                        ? 'text-slate-900 font-medium'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile: New button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-amber-200 hover:bg-amber-300 rounded-lg md:hidden flex-shrink-0"
            >
              <Plus className="w-5 h-5 text-slate-900" />
            </button>

            {/* Upload indicator */}
            {isUploading && (
              <div className="hidden md:flex items-center gap-2 text-sm text-amber-600 flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading {uploadingFiles.length} file(s)...</span>
              </div>
            )}
          </div>

          {/* Mobile upload indicator */}
          {isUploading && isMobile && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mb-3 md:hidden">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading {uploadingFiles.length} file(s)...</span>
            </div>
          )}

          <div className="flex items-center gap-2 md:gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Filter - Icon only on mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-xl border transition-colors flex-shrink-0',
                showFilters || filterType
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'border-slate-200 hover:bg-slate-50'
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden md:inline">Filters</span>
              {filterType && (
                <span className="w-5 h-5 rounded-full bg-amber-200 text-xs flex items-center justify-center">1</span>
              )}
            </button>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-r border-slate-200',
                  viewMode === 'list'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
                title="List view"
              >
                {viewMode === 'list' && <Check className="w-4 h-4" />}
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
                title="Grid view"
              >
                {viewMode === 'grid' && <Check className="w-4 h-4" />}
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {selectedDocuments.size > 0 && (
              <button
                onClick={() => setSelectedDocuments(new Set())}
                className="hidden md:flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {selectedDocuments.size} selected
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Document Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as DocumentType | '')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="">All Types</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DOCUMENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {filterType && (
                  <button
                    onClick={() => setFilterType('')}
                    className="mt-5 text-sm text-amber-600 hover:text-amber-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Documents Grid/List */}
        <div className="flex-1 overflow-y-auto">
          <DocumentGrid
            documents={documents}
            isLoading={documentsLoading}
            viewMode={viewMode}
            onView={handleViewDocument}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            onShare={handleShareDocument}
            onMove={handleMoveDocument}
            onDownload={handleDownloadDocument}
            selectedDocuments={selectedDocuments}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onUpload={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Selection Action Bar */}
        {selectedDocuments.size > 0 && (
          <div className="absolute bottom-4 md:bottom-6 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-2 py-2 flex items-center justify-between md:justify-start gap-1 animate-slide-up">
            <div className="flex items-center gap-2 px-2 md:px-3 md:border-r border-slate-700">
              <span className="text-sm font-medium">{selectedDocuments.size}</span>
              <button
                onClick={() => setSelectedDocuments(new Set())}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddToBucketModal(true)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors"
                title="Add to monthly bucket"
              >
                <Archive className="w-4 h-4" />
                <span className="text-sm hidden md:inline">Bucket</span>
              </button>

              <button
                onClick={() => {
                  const firstDocId = Array.from(selectedDocuments)[0];
                  const doc = documents.find(d => d.id === firstDocId);
                  if (doc) handleShareDocument(doc);
                }}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors"
                title="Share selected"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm hidden md:inline">Share</span>
              </button>

              <button
                onClick={() => {
                  const firstDocId = Array.from(selectedDocuments)[0];
                  const doc = documents.find(d => d.id === firstDocId);
                  if (doc) handleMoveDocument(doc);
                }}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors"
                title="Move to folder"
              >
                <FolderInput className="w-4 h-4" />
                <span className="text-sm hidden md:inline">Move</span>
              </button>

              <div className="w-px h-6 bg-slate-700 mx-1 hidden md:block" />

              <button
                onClick={() => {
                  const firstDocId = Array.from(selectedDocuments)[0];
                  const doc = documents.find(d => d.id === firstDocId);
                  if (doc) handleDeleteDocument(doc);
                }}
                className="flex items-center gap-2 px-2 md:px-4 py-2 hover:bg-red-600 rounded-xl transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bucket Panel (Slide-out) */}
      {showBucketPanel && (
        <div className="w-80 border-l border-slate-200 bg-white">
          <BucketPanel
            onSelectBucket={handleSelectBucket}
            onShareBucket={handleShareBucket}
          />
        </div>
      )}

      {/* Modals */}
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => {
          setShowFolderModal(false);
          setEditingFolder(null);
        }}
        folder={editingFolder}
        parentId={newFolderParentId}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setShareItem(null);
        }}
        item={shareItem}
        type={shareType}
      />

      {/* Document Preview Panel */}
      <DocumentPreview
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={handleDownloadDocument}
        onShare={handleShareDocument}
        onDelete={(doc) => {
          setPreviewDocument(null);
          handleDeleteDocument(doc);
        }}
        onEdit={handleEditDocument}
        onMove={handleMoveDocument}
      />

      {/* Add to Bucket Modal */}
      <AddToBucketModal
        isOpen={showAddToBucketModal}
        onClose={() => setShowAddToBucketModal(false)}
        documentIds={Array.from(selectedDocuments)}
        onSuccess={() => setSelectedDocuments(new Set())}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Delete {showDeleteConfirm.type === 'document' ? 'Document' : 'Folder'}
                </h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete{' '}
              <strong>{showDeleteConfirm.item.name}</strong>?
              {showDeleteConfirm.type === 'folder' && ' All documents inside will also be deleted.'}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteDocument.isPending || deleteFolder.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {(deleteDocument.isPending || deleteFolder.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
