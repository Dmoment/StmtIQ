import { useState, useCallback } from 'react';
import {
  useGmailAuth,
  useUpdateGmailConnection,
  useSyncGmail,
  useDisconnectGmail,
} from '../queries';
import type { GmailConnection } from '../types/api';

interface UseGmailManagerReturn {
  handleConnect: () => Promise<void>;
  handleSync: (id: number) => Promise<void>;
  handleToggleSync: (connection: GmailConnection) => Promise<void>;
  handleDisconnect: (id: number) => Promise<void>;
  disconnectingId: number | null;
  error: string | null;
  clearError: () => void;
}

export function useGmailManager(
  refetch?: () => void
): UseGmailManagerReturn {
  const gmailAuth = useGmailAuth();
  const updateConnection = useUpdateGmailConnection();
  const syncGmail = useSyncGmail();
  const disconnectGmail = useDisconnectGmail();
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const handleConnect = useCallback(async () => {
    try {
      setError(null);
      const authData = await gmailAuth.mutateAsync();
      window.location.href = authData.authorization_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start OAuth';
      setError(message);
    }
  }, [gmailAuth]);

  const handleSync = useCallback(
    async (id: number) => {
      try {
        setError(null);
        await syncGmail.mutateAsync({ id });
        if (refetch) {
          setTimeout(refetch, 2000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync';
        setError(message);
      }
    },
    [syncGmail, refetch]
  );

  const handleToggleSync = useCallback(
    async (connection: GmailConnection) => {
      try {
        setError(null);
        await updateConnection.mutateAsync({
          id: connection.id,
          sync_enabled: !connection.sync_enabled,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update settings';
        setError(message);
      }
    },
    [updateConnection]
  );

  const handleDisconnect = useCallback(
    async (id: number) => {
      setDisconnectingId(id);
      setError(null);
      try {
        await disconnectGmail.mutateAsync(id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to disconnect';
        setError(message);
      } finally {
        setDisconnectingId(null);
      }
    },
    [disconnectGmail]
  );

  return {
    handleConnect,
    handleSync,
    handleToggleSync,
    handleDisconnect,
    disconnectingId,
    error,
    clearError,
  };
}
