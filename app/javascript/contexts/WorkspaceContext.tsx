import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import type { Workspace, WorkspaceSimple, WorkspaceRole } from '../types/workspace';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: WorkspaceSimple[];
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: number) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  canPerform: (permission: Permission) => boolean;
}

type Permission =
  | 'view_transactions'
  | 'edit_transactions'
  | 'delete_data'
  | 'export_data'
  | 'upload_statements'
  | 'invite_members'
  | 'manage_workspace';

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  viewer: ['view_transactions'],
  member: ['view_transactions', 'edit_transactions', 'upload_statements'],
  accountant: ['view_transactions', 'export_data'],
  admin: [
    'view_transactions',
    'edit_transactions',
    'delete_data',
    'export_data',
    'upload_statements',
    'invite_members',
  ],
  owner: [
    'view_transactions',
    'edit_transactions',
    'delete_data',
    'export_data',
    'upload_statements',
    'invite_members',
    'manage_workspace',
  ],
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_KEY = 'stmtiq_current_workspace_id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { getToken, isAuthenticated, isOnboarded } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSimple[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return [];

      const response = await fetch('/api/v1/workspaces', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - this is fine in some cases
          return [];
        }
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      return [];
    }
  }, [getToken]);

  const fetchCurrentWorkspace = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await fetch('/api/v1/workspaces/current', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          // No workspace set or not authenticated
          return null;
        }
        throw new Error('Failed to fetch current workspace');
      }

      const data = await response.json();
      setCurrentWorkspace(data);
      localStorage.setItem(WORKSPACE_KEY, data.id.toString());
      return data;
    } catch (err) {
      console.error('Failed to fetch current workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
      return null;
    }
  }, [getToken]);

  const switchWorkspace = useCallback(
    async (workspaceId: number) => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const response = await fetch(`/api/v1/workspaces/${workspaceId}/switch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to switch workspace');
        }

        const data = await response.json();
        setCurrentWorkspace(data);
        localStorage.setItem(WORKSPACE_KEY, data.id.toString());

        // Invalidate all queries to refresh data for new workspace
        queryClient.invalidateQueries();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch workspace');
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient, getToken]
  );

  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchWorkspaces();
      await fetchCurrentWorkspace();
    } finally {
      setIsLoading(false);
    }
  }, [fetchWorkspaces, fetchCurrentWorkspace]);

  const canPerform = useCallback(
    (permission: Permission): boolean => {
      if (!currentWorkspace?.current_user_role) return false;
      const rolePermissions = ROLE_PERMISSIONS[currentWorkspace.current_user_role];
      return rolePermissions.includes(permission);
    },
    [currentWorkspace]
  );

  // Load workspaces when authenticated and onboarded
  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    // Only fetch workspaces when user is onboarded
    if (!isOnboarded) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([fetchWorkspaces(), fetchCurrentWorkspace()]).finally(() => {
      setIsLoading(false);
    });
  }, [isAuthenticated, isOnboarded, fetchWorkspaces, fetchCurrentWorkspace]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    isLoading,
    error,
    switchWorkspace,
    refreshWorkspaces,
    canPerform,
  };

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

// Hook to get current workspace ID for API calls
export function useWorkspaceId(): number | null {
  const { currentWorkspace } = useWorkspace();
  return currentWorkspace?.id ?? null;
}
