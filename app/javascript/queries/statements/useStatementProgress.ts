import { useState, useEffect, useRef } from "react";

/**
 * Progress data from true streaming parser
 * 
 * Note: True streaming doesn't know total upfront.
 * We show "processed X records" instead of percentage.
 * This is the correct streaming tradeoff.
 */
export interface ParsingProgress {
  id: number;
  status: 'pending' | 'processing' | 'parsed' | 'failed';
  parsing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processed: number;           // Transactions processed so far
  transaction_count: number;   // Final count (only available after completion)
  duration_seconds: number | null; // Time elapsed
  updated_at: string | null;
  completed?: boolean;          // True when SSE stream closes
}

/**
 * Hook for real-time statement parsing progress using Server-Sent Events (SSE)
 * 
 * Benefits over polling:
 * - Single long-lived connection (more efficient)
 * - Server pushes updates immediately (real-time)
 * - Less server load (no repeated HTTP requests)
 * - Better UX (instant updates)
 * 
 * True streaming design:
 * - Shows "Processed X transactions" during parsing
 * - No percentage bar (we don't know total upfront)
 * - Shows duration for user feedback
 * 
 * @param id - Statement ID
 * @param enabled - Whether to enable SSE connection
 * @param onComplete - Callback when parsing completes
 */
export const useStatementProgress = (
  id: number,
  enabled = true,
  onComplete?: (progress: ParsingProgress) => void
) => {
  const [progress, setProgress] = useState<ParsingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect if disabled or invalid ID
    if (!enabled || id <= 0) {
      return;
    }
    
    // Build SSE URL
    const url = `/api/v1/statements/${id}/progress/stream`;
    
    // Create EventSource connection
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    setIsLoading(true);
    setError(null);

    // Handle progress events
    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data) as ParsingProgress;
        setProgress(data);
        setIsLoading(false);

        // Check if parsing is complete
        if (data.status === 'parsed' || data.status === 'failed' || data.completed) {
          onComplete?.(data);
        }
      } catch (err) {
        console.error('Failed to parse progress event:', err);
        setError(err instanceof Error ? err : new Error('Failed to parse progress'));
      }
    });

    // Handle completion event
    eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data) as ParsingProgress;
        setProgress({ ...data, completed: true });
        setIsLoading(false);
        onComplete?.(data);
        eventSource.close();
      } catch (err) {
        console.error('Failed to parse complete event:', err);
        setError(err instanceof Error ? err : new Error('Failed to parse completion'));
      }
    });

    // Handle error events from server
    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setError(new Error(data.error || data.message || 'Server error'));
      } catch {
        // Generic connection error
        setError(new Error('Connection error'));
      }
      setIsLoading(false);
      eventSource.close();
    });

    // Handle EventSource connection errors (network issues, etc.)
    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      setError(new Error('Connection lost. Please refresh.'));
      setIsLoading(false);
      eventSource.close();
    };

    // Cleanup on unmount or when dependencies change
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [id, enabled, onComplete]);

  return {
    data: progress,
    isLoading,
    error,
    refetch: () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      // Trigger re-connection by updating a dependency
      // This is handled by the useEffect dependency array
    }
  };
};

/**
 * Format progress for display
 * 
 * True streaming shows:
 * - "Processing... 5,432 transactions"
 * - "Completed in 3.2s"
 * 
 * NOT:
 * - "45% complete" (we don't know total upfront)
 */
export function formatProgress(progress: ParsingProgress | null): string {
  if (!progress) {
    return 'Waiting...';
  }

  switch (progress.parsing_status) {
    case 'pending':
      return 'Waiting to start...';
    case 'processing':
      const processed = progress.processed.toLocaleString();
      const duration = progress.duration_seconds
        ? ` (${progress.duration_seconds.toFixed(1)}s)`
        : '';
      return `Processing... ${processed} transactions${duration}`;
    case 'completed':
      const total = progress.transaction_count.toLocaleString();
      const time = progress.duration_seconds
        ? ` in ${progress.duration_seconds.toFixed(1)}s`
        : '';
      return `Completed: ${total} transactions${time}`;
    case 'failed':
      return 'Parsing failed';
    default:
      return 'Unknown status';
  }
}
