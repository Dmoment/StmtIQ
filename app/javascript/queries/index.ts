/**
 * React Query hooks index
 * Re-exports all query hooks for convenient importing
 */

// Key factories
export * from "./keys";

// Auth hooks
export {
  useCurrentUser,
  useSendOtp,
  useVerifyOtp,
  useResendOtp,
  useLogout,
  useUpdateProfile,
} from "./useAuth";

// Bank template hooks
export {
  useBankTemplates,
  useBankTemplate,
  useBankTemplatesByBank,
} from "./useBankTemplates";

// Category hooks
export {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "./useCategories";

// Account hooks
export {
  useAccounts,
  useAccount,
  useAccountSummary,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "./useAccounts";

// Statement hooks
export {
  useStatements,
  useStatement,
  useStatementSummary,
  useStatementPolling,
  useUploadStatement,
  useDeleteStatement,
  useReparseStatement,
} from "./useStatements";

// Transaction hooks
export {
  useTransactions,
  useTransaction,
  useTransactionStats,
  useUpdateTransaction,
  useBulkUpdateTransactions,
  useCategorizeTransactions,
} from "./useTransactions";

