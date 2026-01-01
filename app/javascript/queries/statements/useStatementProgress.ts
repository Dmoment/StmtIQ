import { useQuery } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import { statementKeys } from "../keys";

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
  
  // Note: No 'total' or 'percentage' - true streaming doesn't know upfront
  // For estimated percentage, you can use file size heuristics if needed
}

/**
 * Poll statement parsing progress
 * 
 * True streaming design:
 * - Shows "Processed X transactions" during parsing
 * - No percentage bar (we don't know total upfront)
 * - Shows duration for user feedback
 * 
 * @param id - Statement ID
 * @param enabled - Whether to enable polling
 * @param onComplete - Callback when parsing completes
 */
export const useStatementProgress = (
  id: number,
  enabled = true,
  onComplete?: (progress: ParsingProgress) => void
) => {
  return useQuery({
    queryKey: [...statementKeys.detail(id), "progress"],
    queryFn: async () => {
      const response = await StatementsService.getV1StatementsIdProgress({ id });
      const progress = response as unknown as ParsingProgress;
      
      // Call onComplete when parsing finishes
      if (progress.status === 'parsed' || progress.status === 'failed') {
        onComplete?.(progress);
      }
      
      return progress;
    },
    enabled: enabled && id > 0,
    refetchInterval: (query) => {
      const data = query.state.data as ParsingProgress | undefined;
      if (!data) return 2000;
      
      // Stop polling when status is terminal
      if (data.status === 'parsed' || data.status === 'failed') {
        return false;
      }
      
      // Poll faster during active parsing
      if (data.parsing_status === 'processing') {
        return 1000; // Poll every 1 second
      }
      
      return 2000; // Poll every 2 seconds
    },
  });
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
export function formatProgress(progress: ParsingProgress): string {
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
