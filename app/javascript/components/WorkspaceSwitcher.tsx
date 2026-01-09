import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, User, Plus } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import type { WorkspaceSimple, WorkspaceType } from '../types/workspace';

const workspaceTypeIcons: Record<WorkspaceType, typeof Building2> = {
  personal: User,
  business: Building2,
};

const workspaceTypeLabels: Record<WorkspaceType, string> = {
  personal: 'Personal',
  business: 'Business',
};

interface WorkspaceSwitcherProps {
  onCreateWorkspace?: () => void;
}

export function WorkspaceSwitcher({ onCreateWorkspace }: WorkspaceSwitcherProps) {
  const { currentWorkspace, workspaces, switchWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (workspace: WorkspaceSimple) => {
    if (workspace.id === currentWorkspace?.id) {
      setIsOpen(false);
      return;
    }

    await switchWorkspace(workspace.id);
    setIsOpen(false);
  };

  if (isLoading && !currentWorkspace) {
    return (
      <div className="h-9 w-40 bg-slate-100 animate-pulse rounded-lg" />
    );
  }

  if (!currentWorkspace) {
    return null;
  }

  const CurrentIcon = workspaceTypeIcons[currentWorkspace.workspace_type] || Building2;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition-colors min-w-[160px] max-w-[240px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select workspace"
      >
        {currentWorkspace.logo_url ? (
          <img
            src={currentWorkspace.logo_url}
            alt={currentWorkspace.name}
            className="w-6 h-6 rounded object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
            <CurrentIcon className="w-3.5 h-3.5 text-orange-600" />
          </div>
        )}
        <span className="flex-1 text-left text-sm font-medium text-slate-700 truncate">
          {currentWorkspace.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
          role="listbox"
          aria-label="Workspaces"
        >
          {/* Workspace list */}
          <div className="max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => {
              const Icon = workspaceTypeIcons[workspace.workspace_type] || Building2;
              const isSelected = workspace.id === currentWorkspace.id;

              return (
                <button
                  key={workspace.id}
                  onClick={() => handleSelect(workspace)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-orange-50' : ''
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  {workspace.logo_url ? (
                    <img
                      src={workspace.logo_url}
                      alt={workspace.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {workspace.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {workspaceTypeLabels[workspace.workspace_type]}
                      {workspace.current_user_role && (
                        <span className="ml-1 text-slate-400">
                          ({workspace.current_user_role})
                        </span>
                      )}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-1" />

          {/* Create workspace button */}
          {onCreateWorkspace && (
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateWorkspace();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Create Workspace
                </p>
                <p className="text-xs text-slate-500">
                  Add a business or team workspace
                </p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
