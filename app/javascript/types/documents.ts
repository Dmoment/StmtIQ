/**
 * Document Storage Types
 */

export interface Folder {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  position: number;
  parent_id: number | null;
  path: string;
  depth: number;
  is_root: boolean;
  children_count: number;
  documents_count: number;
  children?: Folder[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  name: string;
  document_type: DocumentType;
  description?: string;
  document_date?: string;
  financial_year?: string;
  tags: string[];
  amount?: number;
  currency: string;
  reference_number?: string;
  source?: string;
  metadata: Record<string, unknown>;
  folder_id: number | null;
  folder_name?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  file_name?: string;
  is_pdf: boolean;
  is_image: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | 'invoice'
  | 'purchase_invoice'
  | 'bank_statement'
  | 'firc'
  | 'receipt'
  | 'expense'
  | 'contract'
  | 'tax_document'
  | 'gst_return'
  | 'tds_certificate'
  | 'audit_report'
  | 'balance_sheet'
  | 'profit_loss'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  purchase_invoice: 'Purchase Invoice',
  bank_statement: 'Bank Statement',
  firc: 'FIRC',
  receipt: 'Receipt',
  expense: 'Expense',
  contract: 'Contract',
  tax_document: 'Tax Document',
  gst_return: 'GST Return',
  tds_certificate: 'TDS Certificate',
  audit_report: 'Audit Report',
  balance_sheet: 'Balance Sheet',
  profit_loss: 'Profit & Loss',
  other: 'Other',
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  invoice: 'FileText',
  purchase_invoice: 'Receipt',
  bank_statement: 'Building2',
  firc: 'Globe',
  receipt: 'Receipt',
  expense: 'CreditCard',
  contract: 'FileSignature',
  tax_document: 'FileCheck',
  gst_return: 'FileSpreadsheet',
  tds_certificate: 'Award',
  audit_report: 'ClipboardCheck',
  balance_sheet: 'Scale',
  profit_loss: 'TrendingUp',
  other: 'File',
};

export interface Bucket {
  id: number;
  name: string;
  description?: string;
  bucket_type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  month?: number;
  year?: number;
  financial_year?: string;
  status: 'draft' | 'finalized' | 'shared';
  finalized_at?: string;
  shared_at?: string;
  period_label: string;
  document_count: number;
  is_monthly: boolean;
  is_draft: boolean;
  is_finalized: boolean;
  is_shared: boolean;
  documents?: Document[];
  created_at: string;
  updated_at: string;
}

export interface DocumentShare {
  success: boolean;
  share_url: string;
  access_token: string;
  expires_at?: string;
}

export interface BucketShare {
  success: boolean;
  share_url: string;
  access_token: string;
  expires_at?: string;
}

export const FOLDER_COLORS = [
  { value: 'slate', label: 'Slate', class: 'bg-slate-100 text-slate-600' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-600' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-600' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-100 text-amber-600' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-600' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-100 text-lime-600' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-600' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-100 text-emerald-600' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-100 text-teal-600' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-100 text-cyan-600' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-100 text-sky-600' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-600' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-600' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-100 text-violet-600' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-600' },
  { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-100 text-fuchsia-600' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-600' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-100 text-rose-600' },
];

export function getFolderColorClass(color: string): string {
  const found = FOLDER_COLORS.find((c) => c.value === color);
  return found?.class || 'bg-slate-100 text-slate-600';
}
