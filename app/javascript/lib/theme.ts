/**
 * Theme constants for the application
 * Centralized color definitions for categories and UI elements
 */

export interface CategoryColorScheme {
  bg: string;
  text: string;
  border: string;
}

/**
 * Muted, professional category colors
 * Used for category badges, cards, and visual indicators
 */
export const categoryColors: Record<string, CategoryColorScheme> = {
  shopping: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  food: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  transport: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  housing: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  utilities: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  business: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  health: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  entertainment: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  transfer: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  salary: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  investment: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  emi: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  tax: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  other: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

/**
 * Get category color scheme by category slug/name
 * Falls back to 'other' if category not found
 */
export function getCategoryColor(categorySlug?: string | null): CategoryColorScheme {
  if (!categorySlug) {
    return categoryColors.other;
  }
  
  const normalizedSlug = categorySlug.toLowerCase().trim();
  return categoryColors[normalizedSlug] || categoryColors.other;
}

/**
 * Get category color scheme with custom color support
 * If a custom color is provided, it takes precedence
 */
export function getCategoryColorWithCustom(
  categorySlug?: string | null,
  customColor?: string | null
): CategoryColorScheme & { hasCustomColor: boolean; customColor?: string } {
  const defaultScheme = getCategoryColor(categorySlug);
  
  if (customColor) {
    return {
      ...defaultScheme,
      hasCustomColor: true,
      customColor,
    };
  }
  
  return {
    ...defaultScheme,
    hasCustomColor: false,
  };
}

