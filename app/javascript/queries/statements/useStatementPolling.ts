import { useQuery } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import type { Statement } from "../../types/api";
import { statementKeys } from "../keys";

/**
 * Poll statement status until parsed or failed
 * Uses auto-generated StatementsService
 */
export const useStatementPolling = (
  id: number,
  enabled = true,
  onStatusChange?: (status: Statement["status"]) => void
) => {
  return useQuery({
    queryKey: [...statementKeys.detail(id), "polling"],
    queryFn: async () => {
      const response = await StatementsService.getV1StatementsId({ id });
      const statement = response as unknown as Statement;
      onStatusChange?.(statement.status);
      return statement;
    },
    enabled: enabled && id > 0,
    refetchInterval: (query) => {
      const data = query.state.data as Statement | undefined;
      if (!data) return 2000;
      // Stop polling when status is terminal
      if (data.status === "parsed" || data.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
};

