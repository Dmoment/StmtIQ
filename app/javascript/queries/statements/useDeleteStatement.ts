import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StatementsService } from "../../types/generated/services.gen";
import { statementKeys, transactionKeys } from "../keys";

/**
 * Delete a statement
 * Uses auto-generated StatementsService
 */
export const useDeleteStatement = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await StatementsService.deleteV1StatementsId({ id });
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: statementKeys.all });
      queryClient.removeQueries({ queryKey: statementKeys.detail(deletedId) });
      // Also invalidate transactions as they may have been deleted
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};

