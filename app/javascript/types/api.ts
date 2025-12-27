/**
 * Manual API response types
 * These complement the auto-generated types from OpenAPI
 * Run `bun run generate:api-types` to regenerate api.d.ts
 */

// Re-export generated types
export type { paths, components, operations } from "./generated/api";

// ============================================
// User & Auth Types
// ============================================
export interface User {
  id: number;
  phone_number: string;
  name: string | null;
  email: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OtpResponse {
  message: string;
  dev_otp?: string; // Only in development
}

// ============================================
// Bank Template Types
// ============================================
export interface BankTemplate {
  id: number;
  bank_code: string;
  bank_name: string;
  template_name: string;
  file_type: "csv" | "xlsx" | "xls" | "pdf";
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Category Types
// ============================================
export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  is_system: boolean;
  parent_id: number | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Account Types
// ============================================
export interface Account {
  id: number;
  name: string;
  bank_name: string;
  account_number_last4: string | null;
  account_type: "savings" | "current" | "credit_card" | "loan";
  currency: "INR" | "USD" | "EUR" | "GBP";
  is_active: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface AccountSummary {
  account: Account;
  total_credits: string;
  total_debits: string;
  net: string;
  transaction_count: number;
}

// ============================================
// Statement Types
// ============================================
export interface Statement {
  id: number;
  original_filename: string;
  file_type: string;
  status: "pending" | "processing" | "parsed" | "failed";
  error_message: string | null;
  transactions_count: number;
  user_id: number;
  account_id: number | null;
  template_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface StatementSummary {
  statement: Statement;
  total_credits: string;
  total_debits: string;
  net: string;
  transaction_count: number;
  date_range: {
    start: string | null;
    end: string | null;
  };
}

// ============================================
// Transaction Types
// ============================================
export interface Transaction {
  id: number;
  transaction_date: string;
  description: string;
  reference_number: string | null;
  amount: string;
  transaction_type: "debit" | "credit";
  balance: string | null;
  raw_description: string | null;
  is_reviewed: boolean;
  category_id: number | null;
  account_id: number | null;
  statement_id: number | null;
  user_id: number;
  category?: Category;
  created_at: string;
  updated_at: string;
}

export interface TransactionStats {
  total_transactions: number;
  total_credits: string;
  total_debits: string;
  net: string;
  categorized_count: number;
  uncategorized_count: number;
}

// ============================================
// Pagination Types
// ============================================
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

// ============================================
// API Error Types
// ============================================
export interface ApiError {
  error: string;
  detail?: string | string[];
}

