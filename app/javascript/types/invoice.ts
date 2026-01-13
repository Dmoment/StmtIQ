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
  business_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  state_code?: string;
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  company_name?: string;
  gstin?: string;
  pan?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  billing_state_code?: string;
  display_name?: string;
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
