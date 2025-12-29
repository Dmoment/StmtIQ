import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Statement } from "../../types/api";
import { statementKeys } from "../keys";

interface UploadStatementData {
  file: File;
  template_id: number;
  account_id?: number;
}

// Helper to get CSRF token
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem("stmtiq_session_token");
}

/**
 * Upload a new statement
 * Note: This uses FormData for file upload, not the generated services
 * The generated services don't handle multipart/form-data uploads
 */
export const useUploadStatement = () => {
  const queryClient = useQueryClient();

  return useMutation<Statement, Error, UploadStatementData>({
    mutationFn: async ({ file, template_id, account_id }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("template_id", template_id.toString());
      if (account_id) {
        formData.append("account_id", account_id.toString());
      }

      const headers: Record<string, string> = {
        'X-CSRF-Token': getCsrfToken(),
      };
      
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch("/api/v1/statements", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload statement");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statementKeys.all });
    },
  });
};
