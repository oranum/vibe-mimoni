import { CurrencyCode } from '@/types/database';

/**
 * Clean amount string by removing currency symbols and formatting
 */
export function cleanAmountString(amountString: string): string {
  if (!amountString || amountString.trim() === '') {
    return '0';
  }
  
  // Remove common currency symbols and formatting
  return amountString
    .replace(/[$£€¥₹₪]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Normalize currency code to standard format
 */
export function normalizeCurrencyCode(currencyString: string): CurrencyCode | null {
  if (!currencyString || currencyString.trim() === '') {
    return null;
  }
  
  const normalized = currencyString.trim().toUpperCase();
  
  // Direct matches
  if (['USD', 'EUR', 'GBP', 'ILS', 'NIS'].includes(normalized)) {
    return normalized === 'NIS' ? 'ILS' : normalized as CurrencyCode;
  }
  
  // Symbol-based detection
  const symbolMap: Record<string, CurrencyCode> = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR',
    '₪': 'ILS',
  };
  
  if (symbolMap[normalized]) {
    return symbolMap[normalized];
  }
  
  return null;
}

/**
 * Detect currency from a single amount string
 */
export function detectCurrencyFromAmount(amountString: string): CurrencyCode | null {
  if (!amountString || amountString.trim() === '') {
    return null;
  }
  
  const symbols = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR',
    '₪': 'ILS',
  };
  
  // Check for currency symbols
  for (const [symbol, currency] of Object.entries(symbols)) {
    if (amountString.includes(symbol)) {
      return currency as CurrencyCode;
    }
  }
  
  return null;
}

/**
 * Detect currency from dataset
 */
export function detectCurrencyFromDataset(
  data: Record<string, string>[], 
  amountField: string, 
  currencyField?: string
): CurrencyCode | null {
  if (!data.length) return null;
  
  // If currency field exists, check for consistent currency
  if (currencyField) {
    const currencies = new Set<string>();
    
    for (const row of data) {
      const currencyValue = row[currencyField];
      if (currencyValue) {
        const normalized = normalizeCurrencyCode(currencyValue);
        if (normalized) {
          currencies.add(normalized);
        }
      }
    }
    
    // If we found a single consistent currency, return it
    if (currencies.size === 1) {
      return Array.from(currencies)[0] as CurrencyCode;
    }
  }
  
  // Try to detect from amount field symbols
  const symbolCounts: Record<string, number> = {};
  
  for (const row of data) {
    const amountValue = row[amountField];
    if (amountValue) {
      const detected = detectCurrencyFromAmount(amountValue);
      if (detected) {
        symbolCounts[detected] = (symbolCounts[detected] || 0) + 1;
      }
    }
  }
  
  // Return the most common detected currency
  if (Object.keys(symbolCounts).length > 0) {
    const mostCommon = Object.entries(symbolCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
    return mostCommon as CurrencyCode;
  }
  
  return null;
}

/**
 * Suggest currency mapping based on field names
 */
export function suggestCurrencyMapping(headers: string[]): string | null {
  const currencyPatterns = [
    'currency', 'curr', 'ccy', 'currency_code', 'cur', 'money_type', 'denomination'
  ];
  
  const lowercaseHeaders = headers.map(h => h.toLowerCase());
  
  for (const pattern of currencyPatterns) {
    const matchingHeader = lowercaseHeaders.find(header => 
      header.includes(pattern) || pattern.includes(header)
    );
    
    if (matchingHeader) {
      return headers[lowercaseHeaders.indexOf(matchingHeader)];
    }
  }
  
  return null;
} 