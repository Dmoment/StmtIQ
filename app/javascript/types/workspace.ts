export type WorkspaceType = 'personal' | 'business';
export type WorkspaceRole = 'owner' | 'admin' | 'accountant' | 'member' | 'viewer';
export type MembershipStatus = 'pending' | 'active' | 'suspended';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  workspace_type: WorkspaceType;
  plan: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner_id: number;
  current_user_role: WorkspaceRole | null;
  member_count: number;
  is_personal: boolean;
  is_owner: boolean;
}

export interface WorkspaceSimple {
  id: number;
  name: string;
  slug: string;
  workspace_type: WorkspaceType;
  logo_url: string | null;
  is_active: boolean;
  current_user_role: WorkspaceRole | null;
}

export interface WorkspaceMember {
  id: number;
  user_id: number;
  role: WorkspaceRole;
  status: MembershipStatus;
  joined_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  is_owner: boolean;
  is_admin: boolean;
}

export interface WorkspaceInvitation {
  id: number;
  email: string | null;
  phone_number: string | null;
  role: WorkspaceRole;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: {
    id: number;
    name: string | null;
  };
  is_expired: boolean;
}

export interface CreateWorkspaceData {
  name: string;
  workspace_type: WorkspaceType;
  description?: string;
  logo_url?: string;
}

export interface InviteMemberData {
  email?: string;
  phone_number?: string;
  role: Exclude<WorkspaceRole, 'owner'>;
}

export interface UpdateMemberData {
  role: Exclude<WorkspaceRole, 'owner'>;
}
