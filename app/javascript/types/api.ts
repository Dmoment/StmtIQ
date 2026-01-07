/**
 * Manual API response types
 * These complement the auto-generated types from OpenAPI
 * Run `bun run generate:api` to regenerate types
 */

// Re-export generated types
export * from "./generated/types.gen";

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
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  is_system: boolean;
  parent_id: number | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_default: boolean;
  category_id: number;
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
  id: number;
  status: string;
  transaction_count: number;
  account_type: string;
  // Regular account fields
  total_credits?: string;
  total_debits?: string;
  net?: string;
  date_range?: {
    start: string | null;
    end: string | null;
  };
  // Credit card specific fields
  total_spent?: string;
  payments_made?: string;
  outstanding_balance?: string;
  amount_due?: string;
  statement_period?: {
    start: string | null;
    end: string | null;
  };
  categories: Record<number, number>;
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
  confidence: string | null;
  ai_explanation: string | null;
  category_id: number | null;
  ai_category_id: number | null;
  account_id: number | null;
  statement_id: number | null;
  user_id: number;
  category?: Category;
  ai_category?: Category;
  subcategory?: Subcategory;
  tx_kind?: string | null;
  counterparty_name?: string | null;
  metadata?: {
    categorization_method?: 'rule' | 'embedding' | 'llm' | 'none';
    normalized_description?: string;
    [key: string]: unknown;
  };
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
// Invoice Types
// ============================================
export type InvoiceStatus = 'pending' | 'processing' | 'extracted' | 'matched' | 'unmatched' | 'failed';
export type InvoiceSource = 'upload' | 'gmail';

export interface Invoice {
  id: number;
  source: InvoiceSource;
  status: InvoiceStatus;
  vendor_name: string | null;
  vendor_gstin: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: string | null;
  currency: string;
  extraction_method: string | null;
  extraction_confidence: string | null;
  match_confidence: string | null;
  matched_at: string | null;
  matched_by: string | null;
  file_url: string | null;
  matched_transaction: Transaction | null;
  extracted_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  total: number;
  by_status: Record<InvoiceStatus, number>;
  by_source: Record<InvoiceSource, number>;
  matched_amount: string;
  unmatched_amount: string;
}

export interface InvoiceSuggestion {
  transaction: Transaction;
  score: number;
  breakdown: {
    amount_score: number;
    date_score: number;
    vendor_score: number;
  };
}

// ============================================
// API Error Types
// ============================================
export interface ApiError {
  error: string;
  detail?: string | string[];
}

