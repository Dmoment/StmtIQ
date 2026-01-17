import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, AuthError, SAFE_QUERY_OPTIONS } from '../utils/api';

// Types for GST API responses
export interface GstLookupData {
  gstin: string;
  legal_name?: string;
  trade_name?: string;
  business_type?: string;
  nature_of_business?: string;
  registration_date?: string;
  status?: string;
  state_code: string;
  state_name?: string;
  state_short_code?: string;
  pan?: string;
  entity_type?: string;
  logo_url?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface GstLookupResponse {
  success: boolean;
  source: string;
  data: GstLookupData;
  message?: string;
}

export interface GstValidationResponse {
  valid: boolean;
  gstin: string;
  state_code?: string;
  state_name?: string;
  state_short_code?: string;
  pan?: string;
  error?: string;
}

export interface LogoResponse {
  domain: string;
  logo_url: string;
  alternatives: {
    clearbit?: string;
    clearbit_hd?: string;
    google?: string;
    google_hd?: string;
    logo_dev?: string;
  };
}

export interface GstState {
  gst_code: string;
  name: string;
  short_code: string;
}

// GST-specific API request helper using shared utility
async function gstApiRequest<T>(endpoint: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
  return apiRequest<T>(`/gst${endpoint}`, { query });
}

/**
 * Hook to lookup GST details by GSTIN
 * Returns company name, address, and other details from GST portal
 */
export function useGstLookup(gstin: string | undefined) {
  return useQuery({
    queryKey: ['gst', 'lookup', gstin || ''],
    queryFn: async (): Promise<GstLookupResponse | null> => {
      try {
        return await gstApiRequest<GstLookupResponse>('/lookup', { gstin: gstin! });
      } catch (error) {
        // Handle auth errors gracefully
        if (error instanceof AuthError) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!gstin && gstin.length === 15,
    ...SAFE_QUERY_OPTIONS,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
}

/**
 * Mutation to manually trigger GST lookup
 * Use this for on-demand lookups (e.g., button click)
 *
 * Note: This will throw AuthError if user is not logged in.
 * Handle the error in your component:
 *
 * ```typescript
 * const mutation = useGstLookupMutation();
 *
 * const handleLookup = async (gstin: string) => {
 *   try {
 *     const result = await mutation.mutateAsync(gstin);
 *   } catch (error) {
 *     if (error instanceof AuthError) {
 *       toast.error('Please log in to use GST lookup');
 *     }
 *   }
 * };
 * ```
 */
export function useGstLookupMutation() {
  return useMutation({
    mutationFn: async (gstin: string): Promise<GstLookupResponse> => {
      return gstApiRequest<GstLookupResponse>('/lookup', { gstin });
    },
  });
}

/**
 * Hook to validate GSTIN format and extract basic info
 */
export function useGstValidation(gstin: string | undefined) {
  return useQuery({
    queryKey: ['gst', 'validate', gstin || ''],
    queryFn: async (): Promise<GstValidationResponse | null> => {
      try {
        return await gstApiRequest<GstValidationResponse>('/validate', { gstin: gstin! });
      } catch (error) {
        if (error instanceof AuthError) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!gstin && gstin.length >= 15,
    ...SAFE_QUERY_OPTIONS,
    staleTime: Infinity, // Validation result never changes
  });
}

/**
 * Hook to fetch company logo by domain
 */
export function useCompanyLogo(domain: string | undefined, size: number = 128) {
  return useQuery({
    queryKey: ['gst', 'logo', domain || '', size],
    queryFn: async (): Promise<LogoResponse | null> => {
      try {
        return await gstApiRequest<LogoResponse>('/logo', { domain: domain!, size });
      } catch (error) {
        if (error instanceof AuthError) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!domain,
    ...SAFE_QUERY_OPTIONS,
    staleTime: 1000 * 60 * 60 * 24 * 7, // Cache for 7 days
  });
}

/**
 * Hook to get list of Indian states with GST codes
 */
export function useGstStates() {
  return useQuery({
    queryKey: ['gst', 'states'],
    queryFn: async (): Promise<{ states: GstState[] } | null> => {
      try {
        return await gstApiRequest<{ states: GstState[] }>('/states');
      } catch (error) {
        if (error instanceof AuthError) {
          return null;
        }
        throw error;
      }
    },
    ...SAFE_QUERY_OPTIONS,
    staleTime: Infinity, // States don't change
  });
}

/**
 * Utility: Get logo URL for a domain (returns immediately, no API call)
 * Use this for displaying logos without waiting for API
 */
export function getLogoUrl(domainOrEmail: string | undefined, size: number = 128): string | null {
  if (!domainOrEmail) return null;

  // Extract domain from email if needed
  let domain = domainOrEmail;
  if (domain.includes('@')) {
    domain = domain.split('@')[1];
  }
  if (domain.includes('://')) {
    try {
      domain = new URL(domain).hostname;
    } catch {
      // Keep as is
    }
  }
  if (domain.startsWith('www.')) {
    domain = domain.slice(4);
  }

  // Return Clearbit logo URL
  return `https://logo.clearbit.com/${domain}?size=${size}`;
}

/**
 * Utility: Get fallback logo URL (Google Favicon)
 */
export function getFallbackLogoUrl(domainOrEmail: string | undefined, size: number = 128): string | null {
  if (!domainOrEmail) return null;

  let domain = domainOrEmail;
  if (domain.includes('@')) {
    domain = domain.split('@')[1];
  }

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * Utility: Validate GSTIN format (client-side)
 */
export function isValidGstin(gstin: string | undefined): boolean {
  if (!gstin) return false;
  const regex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
  return regex.test(gstin.toUpperCase());
}

/**
 * Utility: Extract state code from GSTIN
 */
export function getStateFromGstin(gstin: string | undefined): { code: string; name: string } | null {
  if (!gstin || gstin.length < 2) return null;

  const STATE_CODES: Record<string, string> = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
  };

  const code = gstin.substring(0, 2);
  const name = STATE_CODES[code];

  return name ? { code, name } : null;
}
