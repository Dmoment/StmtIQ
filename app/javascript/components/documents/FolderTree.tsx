import { useState } from 'react';
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Home,
  FileText,
  File,
  FileImage,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Folder, Document } from '../../types/documents';
import { getFolderColorClass } from '../../types/documents';

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
  onCreateFolder: (parentId: number | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  isLoading?: boolean;
  documents?: Document[];
  onSelectDocument?: (document: Document) => void;
}

interface FolderItemProps {
  folder: Folder;
  level: number;
  isLast: boolean;
  parentLines: boolean[];
  selectedFolderId: number | null;
  expandedFolders: Set<number>;
  onToggleExpand: (folderId: number) => void;
  onSelectFolder: (folderId: number | null) => void;
  onCreateFolder: (parentId: number | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  documents?: Document[];
  onSelectDocument?: (document: Document) => void;
}

function getDocumentIcon(doc: Document, size = 'w-4 h-4') {
  if (doc.is_pdf) {
    return <FileText className={`${size} text-red-500`} />;
  }
  if (doc.is_image) {
    return <FileImage className={`${size} text-blue-500`} />;
  }
  return <File className={`${size} text-slate-400`} />;
}

function TreeLines({ level, parentLines, isLast }: { level: number; parentLines: boolean[]; isLast: boolean }) {
  if (level === 0) return null;

  return (
    <div className="flex items-center" style={{ width: `${level * 16}px` }}>
      {parentLines.map((showLine, idx) => (
        <div key={idx} className="w-4 h-full flex justify-center">
          {showLine && (
            <div className="w-px h-full bg-slate-300" />
          )}
        </div>
      ))}
      <div className="w-4 h-full flex items-center">
        <div className={clsx(
          'w-3 border-slate-300',
          isLast ? 'border-l border-b rounded-bl h-1/2 self-start mt-3' : 'border-l border-b rounded-bl h-1/2 self-start mt-3'
        )} />
      </div>
    </div>
  );
}

function DocumentItem({
  document,
  level,
  parentLines,
  isLast,
  onSelect
}: {
  document: Document;
  level: number;
  parentLines: boolean[];
  isLast: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      className="flex items-center py-1 px-2 hover:bg-slate-50 rounded cursor-pointer group"
      onClick={onSelect}
    >
      {/* Tree lines */}
      <div className="flex items-center" style={{ width: `${(level + 1) * 16}px` }}>
        {[...parentLines, !isLast].slice(0, -1).map((showLine, idx) => (
          <div key={idx} className="w-4 h-6 flex justify-center">
            {showLine && <div className="w-px h-full bg-slate-200" />}
          </div>
        ))}
        <div className="w-4 h-6 flex items-center">
          <div className={clsx(
            'w-3 border-slate-200',
            isLast ? 'border-l border-b rounded-bl h-3' : 'border-l border-b rounded-bl h-3'
          )} />
        </div>
      </div>

      {/* File icon and name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getDocumentIcon(document)}
        <span className="text-xs text-slate-600 truncate">{document.name}</span>
      </div>
    </div>
  );
}

function FolderItem({
  folder,
  level,
  isLast,
  parentLines,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  documents = [],
  onSelectDocument,
}: FolderItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  // Get documents for this folder
  const folderDocuments = documents.filter(d => d.folder_id === folder.id);
  const hasContent = hasChildren || folderDocuments.length > 0;

  // Lines to pass to children
  const childParentLines = [...parentLines, !isLast];

  return (
    <div>
      <div
        className={clsx(
          'group flex items-center py-1.5 px-2 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-amber-100 text-amber-900' : 'hover:bg-slate-100'
        )}
        onClick={() => onSelectFolder(folder.id)}
      >
        {/* Tree Lines */}
        {level > 0 && (
          <div className="flex items-center" style={{ width: `${level * 16}px` }}>
            {parentLines.map((showLine, idx) => (
              <div key={idx} className="w-4 h-8 flex justify-center">
                {showLine && <div className="w-px h-full bg-slate-300" />}
              </div>
            ))}
            <div className="w-4 h-8 flex items-center">
              <div className={clsx(
                'border-slate-300',
                isLast
                  ? 'w-3 h-4 border-l border-b rounded-bl'
                  : 'w-3 h-4 border-l border-b rounded-bl'
              )} />
            </div>
          </div>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
          className={clsx(
            'w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200/50 transition-colors flex-shrink-0',
            !hasContent && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {/* Folder Icon */}
        <div className={clsx('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', getFolderColorClass(folder.color))}>
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5" />
          ) : (
            <FolderIcon className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Folder Name */}
        <span className="flex-1 text-sm font-medium truncate ml-2">{folder.name}</span>

        {/* Document Count Badge */}
        {folder.documents_count > 0 && (
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
            {folder.documents_count}
          </span>
        )}

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={clsx(
              'w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 transition-all flex-shrink-0',
              showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(folder.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4" />
                  New Subfolder
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditFolder(folder);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-4 h-4" />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content: Children Folders + Documents */}
      {isExpanded && (
        <div>
          {/* Child Folders */}
          {hasChildren && folder.children!.map((child, idx) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              isLast={idx === folder.children!.length - 1 && folderDocuments.length === 0}
              parentLines={childParentLines}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              documents={documents}
              onSelectDocument={onSelectDocument}
            />
          ))}

          {/* Documents in this folder */}
          {folderDocuments.map((doc, idx) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              level={level}
              parentLines={childParentLines}
              isLast={idx === folderDocuments.length - 1}
              onSelect={() => onSelectDocument?.(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  isLoading,
  documents = [],
  onSelectDocument,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const handleToggleExpand = (folderId: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Root level documents (not in any folder)
  const rootDocuments = documents.filter(d => !d.folder_id);

  return (
    <div className="py-2">
      {/* All Documents */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mx-2 mb-1',
          selectedFolderId === null ? 'bg-amber-100 text-amber-900' : 'hover:bg-slate-100'
        )}
        onClick={() => onSelectFolder(null)}
      >
        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
          <Home className="w-4 h-4 text-slate-600" />
        </div>
        <span className="text-sm font-medium">My Drive</span>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-2 mx-3" />

      {/* Folders Section Header */}
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Folders</span>
        <button
          onClick={() => onCreateFolder(null)}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="New folder"
        >
          <Plus className="w-4 h-4 text-slate-400 hover:text-slate-600" />
        </button>
      </div>

      {/* Folder Tree */}
      <div className="px-2">
        {folders.length === 0 && rootDocuments.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <FolderIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400 mb-2">No folders yet</p>
            <button
              onClick={() => onCreateFolder(null)}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Create your first folder
            </button>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders.map((folder, idx) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                level={0}
                isLast={idx === folders.length - 1 && rootDocuments.length === 0}
                parentLines={[]}
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onToggleExpand={handleToggleExpand}
                onSelectFolder={onSelectFolder}
                onCreateFolder={onCreateFolder}
                onEditFolder={onEditFolder}
                onDeleteFolder={onDeleteFolder}
                documents={documents}
                onSelectDocument={onSelectDocument}
              />
            ))}

            {/* Root Documents (not in any folder) */}
            {rootDocuments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 px-2">Files</span>
                {rootDocuments.slice(0, 10).map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer"
                    onClick={() => onSelectDocument?.(doc)}
                  >
                    {getDocumentIcon(doc)}
                    <span className="text-xs text-slate-600 truncate flex-1">{doc.name}</span>
                  </div>
                ))}
                {rootDocuments.length > 10 && (
                  <div className="text-xs text-slate-400 px-2 py-1">
                    +{rootDocuments.length - 10} more files
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
