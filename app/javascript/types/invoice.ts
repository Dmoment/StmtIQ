/**
 * Shared types for invoice components
 */

export interface LineItem {
  id?: number;
  description: string;
  hsn_sac_code: string;
  quantity: number;
  unit: string;
  rate: number;
  gst_rate: number;
  _destroy?: boolean;
  showDescription?: boolean;
}

export interface BusinessProfile {
  id?: number;
  business_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
  gstin?: string;
  pan?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  logo_url?: string;
  signature_url?: string;
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  gstin?: string;
  pan?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  billing_state_code?: string;
  billing_country?: string;
  display_name?: string;
  notes?: string;
  logo_url?: string;
  total_invoiced?: {
    count: number;
    amount: number;
  };
}

export interface InvoiceCalculations {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  total: number;
  totalInINR: number;
  itemCalculations: ItemCalculation[];
}

export interface ItemCalculation {
  amount: number;
  taxAmount: number;
  total: number;
}

export type TaxType = 'none' | 'igst' | 'cgst_sgst';
