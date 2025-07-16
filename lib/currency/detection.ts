/**
 * Currency detection utilities for import system
 */

import { CurrencyCode } from '@/types/database';

/**
 * Detect currency from a text string containing amount and/or currency information
 */
export function detectCurrencyFromString(text: string): CurrencyCode | null {
  if (!text || typeof text !== 'string') return null;
  
  const cleanText = text.trim().toLowerCase();
  
  // Check for currency symbols (prioritize symbols as they're more explicit)
  const symbolMap: Record<string, CurrencyCode> = {
    '$': 'USD',
    '€': 'EUR', 
    '£': 'GBP',
    '₪': 'ILS',
    'usd': 'USD',
    'eur': 'EUR',
    'gbp': 'GBP',
    'ils': 'ILS',
    'nis': 'ILS',
    'shekel': 'ILS',
    'shekels': 'ILS',
    'dollar': 'USD',
    'dollars': 'USD',
    'euro': 'EUR',
    'euros': 'EUR',
    'pound': 'GBP',
    'pounds': 'GBP'
  };
  
  for (const [symbol, code] of Object.entries(symbolMap)) {
    if (cleanText.includes(symbol)) {
      return code;
    }
  }
  
  return null;
}

/**
 * Detect currency from an amount string (e.g., "$100.50", "€45.99", "₪350.00")
 */
export function detectCurrencyFromAmount(amountString: string): CurrencyCode | null {
  if (!amountString || typeof amountString !== 'string') return null;
  
  // Look for currency symbols at the beginning or end of the string
  const currencySymbolRegex = /^([$€£₪])|([/$€£₪])$/;
  const match = amountString.match(currencySymbolRegex);
  
  if (match) {
    const symbol = match[1] || match[2];
    const symbolToCurrency: Record<string, CurrencyCode> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '₪': 'ILS'
    };
    
    return symbolToCurrency[symbol] || null;
  }
  
  return null;
}

/**
 * Analyze a collection of data rows to determine the most likely currency
 */
export function detectCurrencyFromDataset(
  data: Record<string, string>[], 
  amountField: string,
  currencyField?: string
): CurrencyCode | null {
  if (!data.length || !amountField) return null;
  
  const currencyVotes: Record<CurrencyCode, number> = {
    USD: 0,
    EUR: 0,
    GBP: 0,
    ILS: 0
  };
  
  // If there's a dedicated currency field, analyze it first
  if (currencyField) {
    data.forEach(row => {
      const currencyValue = row[currencyField];
      if (currencyValue) {
        const detectedCurrency = detectCurrencyFromString(currencyValue);
        if (detectedCurrency) {
          currencyVotes[detectedCurrency]++;
        }
      }
    });
  }
  
  // Also analyze amount fields for currency symbols
  data.forEach(row => {
    const amountValue = row[amountField];
    if (amountValue) {
      const detectedCurrency = detectCurrencyFromAmount(amountValue);
      if (detectedCurrency) {
        currencyVotes[detectedCurrency]++;
      }
    }
  });
  
  // Return the currency with the most votes
  const maxVotes = Math.max(...Object.values(currencyVotes));
  if (maxVotes === 0) return null;
  
  const winningCurrency = Object.entries(currencyVotes)
    .find(([_, votes]) => votes === maxVotes)?.[0] as CurrencyCode;
  
  return winningCurrency || null;
}

/**
 * Clean amount string by removing currency symbols and formatting
 */
export function cleanAmountString(amountString: string): string {
  if (!amountString || typeof amountString !== 'string') return '0';
  
  // Remove currency symbols, commas, and spaces, but keep digits, dots, and minus signs
  return amountString.replace(/[^0-9.-]/g, '');
}

/**
 * Suggest currency field mappings based on column headers
 */
export function suggestCurrencyMapping(headers: string[]): string | null {
  if (!headers.length) return null;
  
  const lowercaseHeaders = headers.map(h => h.toLowerCase());
  
  // Look for explicit currency column headers
  const currencyKeywords = [
    'currency',
    'curr',
    'ccy',
    'currency_code',
    'cur',
    'money_type',
    'denomination'
  ];
  
  for (const keyword of currencyKeywords) {
    const matchingHeader = lowercaseHeaders.find(header => 
      header.includes(keyword) || keyword.includes(header)
    );
    
    if (matchingHeader) {
      return headers[lowercaseHeaders.indexOf(matchingHeader)];
    }
  }
  
  return null;
}

/**
 * Validate if a string is a valid currency code
 */
export function isValidCurrencyCode(code: string): code is CurrencyCode {
  const validCodes: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'ILS'];
  return validCodes.includes(code as CurrencyCode);
}

/**
 * Normalize currency code from various formats
 */
export function normalizeCurrencyCode(input: string): CurrencyCode | null {
  if (!input || typeof input !== 'string') return null;
  
  const normalized = input.trim().toUpperCase();
  
  // Direct mapping for common variations
  const variations: Record<string, CurrencyCode> = {
    'USD': 'USD',
    'US': 'USD',
    'DOLLAR': 'USD',
    'DOLLARS': 'USD',
    'EUR': 'EUR',
    'EURO': 'EUR',
    'EUROS': 'EUR',
    'GBP': 'GBP',
    'POUND': 'GBP',
    'POUNDS': 'GBP',
    'STERLING': 'GBP',
    'ILS': 'ILS',
    'NIS': 'ILS',
    'SHEKEL': 'ILS',
    'SHEKELS': 'ILS',
    'ISRAELI': 'ILS'
  };
  
  return variations[normalized] || null;
} 