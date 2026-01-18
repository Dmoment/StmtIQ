import { useMemo, useCallback } from 'react';

/**
 * Template variable substitution data
 */
interface TemplateVariables {
  invoiceNumber?: string;
  businessName?: string;
  clientName?: string;
  dueDate?: string;
  totalAmount?: string;
}

/**
 * Substituted text part
 */
interface TextPart {
  value: string;
  isDynamic: boolean;
}

/**
 * Substitution result
 */
interface SubstitutionResult {
  text: string;
  parts: TextPart[];
}

/**
 * Variable configuration
 */
interface VariableConfig {
  value: string;
  isExample: boolean;
}

/**
 * Custom hook for template variable substitution
 * Extracts complex logic from components for reusability
 *
 * @param variables - The template variable values
 * @returns Substitution function
 */
export function useTemplateVariableSubstitution(variables: TemplateVariables) {
  const { invoiceNumber, businessName, clientName, dueDate, totalAmount } = variables;

  // Memoize variable map to avoid recreation on every render
  const variableMap = useMemo<Record<string, VariableConfig>>(() => ({
    '{invoice_number}': {
      value: invoiceNumber || 'INV-001',
      isExample: !invoiceNumber,
    },
    '{business_name}': {
      value: businessName || 'Your Business',
      isExample: !businessName,
    },
    '{client_name}': {
      value: clientName || 'Client Name',
      isExample: !clientName,
    },
    '{due_date}': {
      value: dueDate || 'DD MMM YYYY',
      isExample: !dueDate,
    },
    '{amount}': {
      value: totalAmount || '0.00',
      isExample: !totalAmount,
    },
  }), [invoiceNumber, businessName, clientName, dueDate, totalAmount]);

  /**
   * Parse text into parts with dynamic sections identified
   */
  const parseTextParts = useCallback((text: string): TextPart[] => {
    const parts: TextPart[] = [];
    const variablePattern = /\{(invoice_number|business_name|client_name|due_date|amount)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = variablePattern.exec(text)) !== null) {
      // Add static text before variable
      if (match.index > lastIndex) {
        parts.push({
          value: text.slice(lastIndex, match.index),
          isDynamic: false,
        });
      }

      // Add variable value
      const varKey = match[0];
      const varInfo = variableMap[varKey];
      parts.push({
        value: varInfo.value,
        isDynamic: true,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining static text
    if (lastIndex < text.length) {
      parts.push({
        value: text.slice(lastIndex),
        isDynamic: false,
      });
    }

    return parts;
  }, [variableMap]);

  /**
   * Substitute all variables in template with actual values
   */
  const substitute = useCallback((template: string): SubstitutionResult => {
    const parts = parseTextParts(template);

    // Create fully substituted text
    let substitutedText = template;
    Object.entries(variableMap).forEach(([key, info]) => {
      const escapedKey = key.replace(/[{}]/g, '\\$&');
      substitutedText = substitutedText.replace(new RegExp(escapedKey, 'g'), info.value);
    });

    return {
      text: substitutedText,
      parts,
    };
  }, [parseTextParts, variableMap]);

  return { substitute };
}
