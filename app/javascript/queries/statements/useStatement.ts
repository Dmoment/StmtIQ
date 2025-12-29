import { useQuery } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import type { Statement } from "../../types/api";
import { statementKeys } from "../keys";

/**
 * Get a single statement
 * Uses auto-generated StatementsService
 */
export const useStatement = (id: number, enabled = true) => {
  return useQuery({
    queryKey: statementKeys.detail(id),
    queryFn: async () => {
      const response = await StatementsService.getV1StatementsId({ id });
      return response as unknown as Statement;
    },
    enabled: enabled && id > 0,
  });
};

