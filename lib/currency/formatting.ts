import { CurrencyCode, CURRENCY_INFO } from '../../types/database';

/**
 * Format a currency amount with proper currency symbol and locale formatting
 * @param amount - The amount to format
 * @param currencyCode - The currency code (USD, EUR, GBP, ILS)
 * @param locale - Optional locale override (defaults to currency-specific locale)
 * @returns string - Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode,
  locale?: string
): string {
  const currencyInfo = CURRENCY_INFO[currencyCode];
  
  if (!currencyInfo) {
    // Fallback to generic USD formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  }

  // Use the currency-specific formatting function
  return currencyInfo.format(amount);
}

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode - The currency code
 * @returns string - Currency symbol
 */
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  return CURRENCY_INFO[currencyCode]?.symbol || currencyCode;
}

/**
 * Get the currency name for a given currency code
 * @param currencyCode - The currency code
 * @returns string - Currency name
 */
export function getCurrencyName(currencyCode: CurrencyCode): string {
  return CURRENCY_INFO[currencyCode]?.name || currencyCode;
}

/**
 * Format an amount with custom precision and currency symbol
 * @param amount - The amount to format
 * @param currencyCode - The currency code
 * @param precision - Number of decimal places (default: 2)
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @returns string - Formatted amount
 */
export function formatAmount(
  amount: number,
  currencyCode: CurrencyCode,
  precision: number = 2,
  showSymbol: boolean = true
): string {
  const formattedAmount = amount.toFixed(precision);
  
  if (!showSymbol) {
    return formattedAmount;
  }
  
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${formattedAmount}`;
}

/**
 * Parse a currency string back to a number
 * @param currencyString - The formatted currency string
 * @param currencyCode - The currency code for context
 * @returns number - The parsed amount
 */
export function parseCurrency(
  currencyString: string,
  currencyCode: CurrencyCode
): number {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Remove currency symbol, spaces, and commas
  const cleanString = currencyString
    .replace(symbol, '')
    .replace(/\s/g, '')
    .replace(/,/g, '');
  
  return parseFloat(cleanString) || 0;
}

/**
 * Format a currency amount for display in lists or tables
 * @param amount - The amount to format
 * @param currencyCode - The currency code
 * @param compact - Whether to use compact notation (e.g., 1.2K instead of 1,200)
 * @returns string - Formatted currency string
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: CurrencyCode,
  compact: boolean = false
): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode,
  };

  if (compact) {
    options.notation = 'compact';
    options.compactDisplay = 'short';
  }

  // Use appropriate locale for each currency
  const localeMap: Record<CurrencyCode, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    ILS: 'he-IL',
  };

  const locale = localeMap[currencyCode] || 'en-US';
  
  return new Intl.NumberFormat(locale, options).format(amount);
}

/**
 * Format two amounts to show original and converted values
 * @param originalAmount - The original amount
 * @param originalCurrency - The original currency code
 * @param convertedAmount - The converted amount
 * @param convertedCurrency - The converted currency code
 * @param showBoth - Whether to show both amounts or just converted
 * @returns string - Formatted string showing both amounts
 */
export function formatCurrencyConversion(
  originalAmount: number,
  originalCurrency: CurrencyCode,
  convertedAmount: number,
  convertedCurrency: CurrencyCode,
  showBoth: boolean = true
): string {
  const originalFormatted = formatCurrency(originalAmount, originalCurrency);
  const convertedFormatted = formatCurrency(convertedAmount, convertedCurrency);
  
  if (!showBoth || originalCurrency === convertedCurrency) {
    return originalFormatted;
  }
  
  return `${originalFormatted} (${convertedFormatted})`;
}

/**
 * Get available currency options for select dropdowns
 * @returns Array of currency options with code, name, and symbol
 */
export function getCurrencyOptions(): Array<{
  code: CurrencyCode;
  name: string;
  symbol: string;
  displayText: string;
}> {
  return Object.entries(CURRENCY_INFO).map(([code, info]) => ({
    code: code as CurrencyCode,
    name: info.name,
    symbol: info.symbol,
    displayText: `${info.symbol} ${info.name} (${code})`,
  }));
}

/**
 * Validate if a string is a valid currency code
 * @param code - The currency code to validate
 * @returns boolean - True if valid currency code
 */
export function isValidCurrencyCode(code: string): code is CurrencyCode {
  return code in CURRENCY_INFO;
}

/**
 * Format a currency amount for input fields (without currency symbol)
 * @param amount - The amount to format
 * @param precision - Number of decimal places (default: 2)
 * @returns string - Formatted amount without currency symbol
 */
export function formatCurrencyForInput(
  amount: number,
  precision: number = 2
): string {
  return amount.toFixed(precision);
} 