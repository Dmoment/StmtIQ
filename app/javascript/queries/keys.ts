/**
 * React Query key factories
 * Provides consistent, type-safe query keys for cache management
 */

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

export const bankTemplateKeys = {
  all: ["bank-templates"] as const,
  lists: () => [...bankTemplateKeys.all, "list"] as const,
  list: (filters?: { bank_code?: string }) =>
    [...bankTemplateKeys.lists(), filters] as const,
  details: () => [...bankTemplateKeys.all, "detail"] as const,
  detail: (id: number) => [...bankTemplateKeys.details(), id] as const,
  byBank: (bankCode: string) =>
    [...bankTemplateKeys.all, "bank", bankCode] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: number) => [...categoryKeys.details(), id] as const,
};

export const accountKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, "detail"] as const,
  detail: (id: number) => [...accountKeys.details(), id] as const,
  summary: (id: number, filters?: { start_date?: string; end_date?: string }) =>
    [...accountKeys.detail(id), "summary", filters] as const,
};

export const statementKeys = {
  all: ["statements"] as const,
  lists: () => [...statementKeys.all, "list"] as const,
  list: (filters?: {
    page?: number;
    per_page?: number;
    status?: string;
  }) => [...statementKeys.lists(), filters] as const,
  details: () => [...statementKeys.all, "detail"] as const,
  detail: (id: number) => [...statementKeys.details(), id] as const,
  summary: (id: number) => [...statementKeys.detail(id), "summary"] as const,
};

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters?: {
    page?: number;
    per_page?: number;
    category_id?: number;
    account_id?: number;
    statement_id?: number;
    transaction_type?: "debit" | "credit";
    start_date?: string;
    end_date?: string;
    search?: string;
    uncategorized?: boolean;
  }) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
  stats: (filters?: {
    detailed?: boolean;
    statement_id?: number;
    start_date?: string;
    end_date?: string;
    account_id?: number;
  }) => [...transactionKeys.all, "stats", filters] as const,
};

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (filters?: {
    page?: number;
    per_page?: number;
    status?: string;
    source?: string;
    from_date?: string;
    to_date?: string;
  }) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: number) => [...invoiceKeys.details(), id] as const,
  suggestions: (id: number) => [...invoiceKeys.detail(id), "suggestions"] as const,
  stats: () => [...invoiceKeys.all, "stats"] as const,
};

export const gmailKeys = {
  all: ["gmail"] as const,
  status: () => [...gmailKeys.all, "status"] as const,
  connections: () => [...gmailKeys.all, "connections"] as const,
  connection: (id: number) => [...gmailKeys.connections(), id] as const,
};

