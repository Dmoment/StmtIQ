import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';

interface User {
  id: number;
  clerk_id: string;
  phone_number: string | null;
  name: string | null;
  email: string | null;
  phone_verified: boolean;
  onboarded_at: string | null;
  settings?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, signOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useClerkUser();
  const [backendUser, setBackendUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with backend when Clerk user changes
  const syncWithBackend = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      setBackendUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const token = await clerkGetToken();
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setBackendUser(userData);
      } else if (response.status === 401) {
        // User not found in backend yet - create temporary user from Clerk data
        // Backend will create the user on next authenticated API call
        setBackendUser({
          id: 0,
          clerk_id: clerkUser.id,
          phone_number: clerkUser.primaryPhoneNumber?.phoneNumber?.replace(/^\+91/, '') || null,
          name: clerkUser.fullName || clerkUser.firstName || null,
          email: clerkUser.primaryEmailAddress?.emailAddress || null,
          phone_verified: clerkUser.primaryPhoneNumber?.verification?.status === 'verified',
          onboarded_at: null,
        });
      } else {
        console.error('Failed to sync with backend:', response.status);
        setBackendUser(null);
      }
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      setBackendUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, clerkUser, clerkGetToken]);

  useEffect(() => {
    if (isLoaded && userLoaded) {
      syncWithBackend();
    }
  }, [isLoaded, userLoaded, isSignedIn, syncWithBackend]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null;
    try {
      return await clerkGetToken();
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }, [isSignedIn, clerkGetToken]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setBackendUser(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, [signOut]);

  const refreshUser = useCallback(async () => {
    await syncWithBackend();
  }, [syncWithBackend]);

  const value: AuthContextType = {
    user: backendUser,
    isAuthenticated: isSignedIn === true && backendUser !== null,
    isOnboarded: !!backendUser?.onboarded_at,
    isLoading: !isLoaded || !userLoaded || isLoading,
    getToken,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Legacy export for backwards compatibility with useCurrentUser
export function useCurrentUser() {
  const { user, isLoading } = useAuth();
  return { data: user, isLoading };
}
