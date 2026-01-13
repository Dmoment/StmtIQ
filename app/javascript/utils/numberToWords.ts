// Convert number to Indian English words (Lakh, Crore system)
const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(num: number): string {
  if (num < 20) {
    return ones[num];
  }
  const ten = Math.floor(num / 10);
  const one = num % 10;
  return tens[ten] + (one ? ' ' + ones[one] : '');
}

function convertThreeDigits(num: number): string {
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundred === 0) {
    return convertTwoDigits(remainder);
  }

  const hundredPart = ones[hundred] + ' Hundred';
  if (remainder === 0) {
    return hundredPart;
  }
  return hundredPart + ' ' + convertTwoDigits(remainder);
}

export function numberToWords(num: number, currency: string = 'INR'): string {
  if (num === 0) return 'Zero';

  // Handle negative numbers
  if (num < 0) {
    return 'Minus ' + numberToWords(Math.abs(num), currency);
  }

  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  const wholePart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - wholePart) * 100);

  let words = '';

  // Indian numbering system: Crore, Lakh, Thousand, Hundred
  // 1,00,00,000 = 1 Crore
  // 1,00,000 = 1 Lakh
  // 1,000 = 1 Thousand

  let n = wholePart;

  // Crores (10^7)
  const crores = Math.floor(n / 10000000);
  if (crores > 0) {
    words += convertTwoDigits(crores) + ' Crore ';
    n = n % 10000000;
  }

  // Lakhs (10^5)
  const lakhs = Math.floor(n / 100000);
  if (lakhs > 0) {
    words += convertTwoDigits(lakhs) + ' Lakh ';
    n = n % 100000;
  }

  // Thousands (10^3)
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    words += convertTwoDigits(thousands) + ' Thousand ';
    n = n % 1000;
  }

  // Hundreds and below
  if (n > 0) {
    words += convertThreeDigits(n);
  }

  // Trim and add currency
  words = words.trim();

  const currencyNames: Record<string, { main: string; sub: string }> = {
    INR: { main: 'Rupees', sub: 'Paise' },
    USD: { main: 'Dollars', sub: 'Cents' },
    EUR: { main: 'Euros', sub: 'Cents' },
    GBP: { main: 'Pounds', sub: 'Pence' },
  };

  const currencyName = currencyNames[currency] || currencyNames.INR;

  if (words) {
    words += ' ' + currencyName.main;
  }

  // Add decimal part (paise)
  if (decimalPart > 0) {
    if (words) {
      words += ' and ';
    }
    words += convertTwoDigits(decimalPart) + ' ' + currencyName.sub;
  }

  return words + ' Only';
}

export function formatIndianNumber(num: number): string {
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return formatted;
}
