import { useQuery } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import type { StatementSummary } from "../../types/api";
import { statementKeys } from "../keys";

/**
 * Query options factory for statement summary
 * Can be used with useQuery or useQueries for consistent cache behavior
 */
export const statementSummaryQueryOptions = (id: number) => ({
  queryKey: statementKeys.summary(id),
  queryFn: async () => {
    const response = await StatementsService.getV1StatementsIdSummary({ id });
    return response as unknown as StatementSummary;
  },
  enabled: id > 0,
  staleTime: 30 * 1000, // 30 seconds
});

/**
 * Get statement summary
 * Uses auto-generated StatementsService
 */
export const useStatementSummary = (id: number, enabled = true) => {
  return useQuery({
    ...statementSummaryQueryOptions(id),
    enabled: enabled && id > 0,
  });
};
