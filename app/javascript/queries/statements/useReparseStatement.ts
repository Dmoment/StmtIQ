import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import type { Statement } from "../../types/api";
import { statementKeys } from "../keys";

/**
 * Re-parse a failed statement
 * Uses auto-generated StatementsService
 */
export const useReparseStatement = () => {
  const queryClient = useQueryClient();

  return useMutation<Statement, Error, { id: number; template_id?: number }>({
    mutationFn: async ({ id, template_id }) => {
      const response = await StatementsService.postV1StatementsIdReparse({
        id,
        requestBody: { template_id },
      });
      return response as unknown as Statement;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: statementKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: statementKeys.lists() });
    },
  });
};

