import { useQuery } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import type { Statement } from "../../types/api";
import { statementKeys } from "../keys";

interface StatementFilters {
  page?: number;
  per_page?: number;
  // Ransack query params
  q?: Record<string, unknown>;
}

/**
 * List all statements with Ransack filtering and Kaminari pagination
 * Uses auto-generated StatementsService
 * 
 * Example filters:
 * - { q: { status_eq: 'parsed' } }
 * - { q: { file_name_cont: 'icici', s: 'created_at desc' } }
 */
export const useStatements = (filters?: StatementFilters) => {
  return useQuery({
    queryKey: statementKeys.list(filters),
    queryFn: async () => {
      const response = await StatementsService.getV1Statements({
        page: filters?.page,
        perPage: filters?.per_page,
      });
      return response as unknown as Statement[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
