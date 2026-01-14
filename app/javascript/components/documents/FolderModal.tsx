import { useState, useEffect } from 'react';
import { X, Folder, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Folder as FolderType } from '../../types/documents';
import { FOLDER_COLORS } from '../../types/documents';
import { useCreateFolder, useUpdateFolder } from '../../queries/useDocuments';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: FolderType | null;
  parentId?: number | null;
}

export function FolderModal({ isOpen, onClose, folder, parentId }: FolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('slate');

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();

  const isEditing = !!folder;
  const isLoading = createFolder.isPending || updateFolder.isPending;

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
      setColor(folder.color);
    } else {
      setName('');
      setDescription('');
      setColor('slate');
    }
  }, [folder, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (isEditing && folder) {
        await updateFolder.mutateAsync({
          id: folder.id,
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
      } else {
        await createFolder.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          parent_id: parentId,
        });
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save folder:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('slate');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Folder className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Edit Folder' : 'New Folder'}
              </h2>
              <p className="text-sm text-slate-500">
                {isEditing ? 'Update folder details' : 'Create a new folder'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Folder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Invoices 2024"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={clsx(
                    'w-8 h-8 rounded-lg transition-all',
                    c.class,
                    color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
