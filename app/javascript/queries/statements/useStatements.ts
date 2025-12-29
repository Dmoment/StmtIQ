import { useQuery } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import type { Statement } from "../../types/api";
import { statementKeys } from "../keys";

interface StatementFilters {
  page?: number;
  per_page?: number;
  status?: "pending" | "processing" | "parsed" | "failed";
}

/**
 * List all statements
 * Uses auto-generated StatementsService
 */
export const useStatements = (filters?: StatementFilters) => {
  return useQuery({
    queryKey: statementKeys.list(filters),
    queryFn: async () => {
      const response = await StatementsService.getV1Statements({
        page: filters?.page || 1,
        perPage: filters?.per_page || 20,
        status: filters?.status,
      });
      return response as unknown as Statement[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

