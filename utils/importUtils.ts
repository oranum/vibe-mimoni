/**
 * Utility functions for importing transaction data from CSV files
 */

import { CurrencyCode } from '@/types/database';
import { 
  detectCurrencyFromDataset, 
  detectCurrencyFromAmount,
  suggestCurrencyMapping, 
  cleanAmountString,
  normalizeCurrencyCode
} from '@/lib/currency/detection';

export interface CSVParseResult {
  headers: string[];
  data: Record<string, string>[];
  errors: string[];
  rowCount: number;
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredFields: string[];
  detectedFields: string[];
}

/**
 * Detect the delimiter used in a CSV file
 */
export function detectCSVDelimiter(csvContent: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const sample = csvContent.split('\n')[0]; // Use first line for detection
  
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const delimiter of delimiters) {
    const count = sample.split(delimiter).length - 1;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

/**
 * Parse CSV content handling quoted fields properly
 */
export function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV content into structured data
 */
export function parseCSV(csvContent: string): CSVParseResult {
  const errors: string[] = [];
  
  if (!csvContent || csvContent.trim() === '') {
    return {
      headers: [],
      data: [],
      errors: ['CSV content is empty'],
      rowCount: 0
    };
  }
  
  try {
    const delimiter = detectCSVDelimiter(csvContent);
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        headers: [],
        data: [],
        errors: ['No valid lines found in CSV'],
        rowCount: 0
      };
    }
    
    // Parse headers
    const headers = parseCSVLine(lines[0], delimiter).map(header => header.trim());
    
    if (headers.length === 0) {
      return {
        headers: [],
        data: [],
        errors: ['No headers found in CSV'],
        rowCount: 0
      };
    }
    
    // Parse data rows
    const data: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = parseCSVLine(line, delimiter);
        
        // Handle rows with different column counts
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
          continue;
        }
        
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
    
    return {
      headers,
      data,
      errors,
      rowCount: data.length
    };
    
  } catch (error) {
    return {
      headers: [],
      data: [],
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
      rowCount: 0
    };
  }
}

/**
 * Normalize date strings to ISO format
 */
export function normalizeDate(dateString: string): string | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  // Common date formats to try
  const formats = [
    // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
  ];
  
  const dateStr = dateString.trim();
  
  // Try parsing as Date first (handles many formats)
  const directDate = new Date(dateStr);
  if (!isNaN(directDate.getTime())) {
    return directDate.toISOString().split('T')[0];
  }
  
  // Try common formats
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, part1, part2, part3] = match;
      
      // Try different interpretations
      const interpretations = [
        new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2)), // MM/DD/YYYY
        new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1)), // DD/MM/YYYY
        new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3)), // YYYY-MM-DD
      ];
      
      for (const date of interpretations) {
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
  }
  
  return null;
}

/**
 * Normalize amount strings to numbers
 */
export function normalizeAmount(amountString: string): number | null {
  if (!amountString || amountString.trim() === '') {
    return null;
  }
  
  // Remove common currency symbols and formatting
  const cleaned = amountString
    .replace(/[$£€¥₹]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();
  
  // Handle parentheses as negative indicator
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const numStr = isNegative ? cleaned.slice(1, -1) : cleaned;
  
  const num = parseFloat(numStr);
  if (isNaN(num)) {
    return null;
  }
  
  return isNegative ? -num : num;
}

/**
 * Normalize CSV data by applying type conversions (enhanced with currency support)
 */
export function normalizeCSVData(
  data: Record<string, string>[], 
  fieldMappings: Record<string, string>,
  defaultCurrency: CurrencyCode = 'ILS'
): Record<string, any>[] {
  return data.map(row => {
    const normalized: Record<string, any> = {};
    
    for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
      const value = row[sourceField];
      
      if (!value || value.trim() === '') {
        normalized[targetField] = null;
        continue;
      }
      
      // Apply type-specific normalization
      switch (targetField) {
        case 'amount':
          // Clean the amount and store the cleaned value
          const cleanedAmount = cleanAmountString(value);
          normalized[targetField] = parseFloat(cleanedAmount) || 0;
          break;
        case 'date':
          normalized[targetField] = normalizeDate(value);
          break;
        case 'currency':
          // Normalize currency code
          const normalizedCurrency = normalizeCurrencyCode(value);
          normalized[targetField] = normalizedCurrency || defaultCurrency;
          break;
        default:
          normalized[targetField] = value.trim();
      }
    }
    
    // If no currency field was mapped, try to detect from amount field
    if (!normalized.currency && fieldMappings.amount) {
      const amountValue = row[fieldMappings.amount];
      if (amountValue) {
        const detectedCurrency = detectCurrencyFromAmount(amountValue);
        normalized.currency = detectedCurrency || defaultCurrency;
      } else {
        normalized.currency = defaultCurrency;
      }
    }
    
    // Ensure currency is always set
    if (!normalized.currency) {
      normalized.currency = defaultCurrency;
    }
    
    return normalized;
  });
}

/**
 * Validate CSV structure for transaction import
 */
export function validateCSVStructure(parseResult: CSVParseResult): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredFields = ['description', 'amount', 'date'];
  const optionalFields = ['identifier', 'source', 'notes'];
  const allFields = [...requiredFields, ...optionalFields];
  
  // Check for parsing errors
  if (parseResult.errors.length > 0) {
    errors.push(...parseResult.errors);
  }
  
  // Check if we have data
  if (parseResult.rowCount === 0) {
    errors.push('No valid data rows found');
  }
  
  // Check for required fields in headers
  const lowercaseHeaders = parseResult.headers.map(h => h.toLowerCase());
  const detectedFields: string[] = [];
  
  for (const field of allFields) {
    const fieldFound = lowercaseHeaders.some(header => 
      header.includes(field.toLowerCase()) || 
      field.toLowerCase().includes(header)
    );
    
    if (fieldFound) {
      detectedFields.push(field);
    } else if (requiredFields.includes(field)) {
      errors.push(`Required field '${field}' not found in CSV headers`);
    }
  }
  
  // Check for common field variations
  const commonVariations = {
    'amount': ['value', 'price', 'total', 'sum', 'balance'],
    'description': ['desc', 'title', 'name', 'details', 'memo'],
    'date': ['timestamp', 'time', 'created', 'transaction_date'],
    'identifier': ['id', 'transaction_id', 'ref', 'reference'],
    'source': ['bank', 'account', 'origin', 'from']
  };
  
  for (const [field, variations] of Object.entries(commonVariations)) {
    if (!detectedFields.includes(field)) {
      const matchingVariation = variations.find(variation =>
        lowercaseHeaders.some(header => header.includes(variation))
      );
      
      if (matchingVariation) {
        warnings.push(`Consider mapping '${matchingVariation}' to '${field}' field`);
      }
    }
  }
  
  // Data quality checks
  if (parseResult.data.length > 0) {
    const sampleRow = parseResult.data[0];
    
    // Check if amount field looks numeric
    const amountFields = parseResult.headers.filter(h => 
      h.toLowerCase().includes('amount') || 
      h.toLowerCase().includes('value') ||
      h.toLowerCase().includes('price')
    );
    
    for (const field of amountFields) {
      const sampleValue = sampleRow[field];
      if (sampleValue && normalizeAmount(sampleValue) === null) {
        warnings.push(`Amount field '${field}' may not contain valid numeric values`);
      }
    }
    
    // Check if date field looks like dates
    const dateFields = parseResult.headers.filter(h => 
      h.toLowerCase().includes('date') || 
      h.toLowerCase().includes('time')
    );
    
    for (const field of dateFields) {
      const sampleValue = sampleRow[field];
      if (sampleValue && normalizeDate(sampleValue) === null) {
        warnings.push(`Date field '${field}' may not contain valid date values`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    requiredFields,
    detectedFields
  };
}

/**
 * Generate field mapping suggestions based on headers (enhanced with currency support)
 */
export function suggestFieldMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};
  const lowercaseHeaders = headers.map(h => h.toLowerCase());
  
  const fieldPatterns = {
    'description': ['description', 'desc', 'title', 'name', 'details', 'memo', 'narrative'],
    'amount': ['amount', 'value', 'price', 'total', 'sum', 'balance'],
    'date': ['date', 'timestamp', 'time', 'created', 'transaction_date'],
    'identifier': ['id', 'transaction_id', 'ref', 'reference', 'identifier'],
    'source': ['source', 'bank', 'account', 'origin', 'from'],
    'currency': ['currency', 'curr', 'ccy', 'currency_code', 'cur', 'money_type', 'denomination']
  };
  
  for (const [targetField, patterns] of Object.entries(fieldPatterns)) {
    for (const pattern of patterns) {
      const matchingHeaderIndex = lowercaseHeaders.findIndex(header => 
        header.includes(pattern) || pattern.includes(header)
      );
      
      if (matchingHeaderIndex !== -1) {
        mappings[headers[matchingHeaderIndex]] = targetField;
        break;
      }
    }
  }
  
  return mappings;
}

/**
 * Analyze CSV data to detect currency and suggest default currency
 */
export function analyzeCurrencyFromCSV(
  parseResult: CSVParseResult, 
  mappings: Record<string, string>
): { detectedCurrency: CurrencyCode | null; confidence: number } {
  if (!parseResult.data.length || !mappings.amount) {
    return { detectedCurrency: null, confidence: 0 };
  }
  
  const detectedCurrency = detectCurrencyFromDataset(
    parseResult.data, 
    mappings.amount, 
    mappings.currency
  );
  
  // Calculate confidence based on detection success rate
  let successfulDetections = 0;
  const sampleSize = Math.min(parseResult.data.length, 10);
  
  for (let i = 0; i < sampleSize; i++) {
    const row = parseResult.data[i];
    const amountValue = row[mappings.amount];
    const currencyValue = mappings.currency ? row[mappings.currency] : null;
    
    if (currencyValue && normalizeCurrencyCode(currencyValue)) {
      successfulDetections++;
    } else if (amountValue && cleanAmountString(amountValue) !== amountValue) {
      successfulDetections++;
    }
  }
  
  const confidence = Math.round((successfulDetections / sampleSize) * 100);
  
  return { detectedCurrency, confidence };
}

/**
 * Validate currency data in imported rows
 */
export function validateCurrencyData(
  data: Record<string, string>[], 
  mappings: Record<string, string>
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!mappings.amount) {
    errors.push('Amount field mapping is required');
    return { isValid: false, errors, warnings };
  }
  
  const currencyField = mappings.currency;
  const amountField = mappings.amount;
  
  // Check each row for currency-related issues
  data.forEach((row, index) => {
    const rowNum = index + 1;
    const amountValue = row[amountField];
    const currencyValue = currencyField ? row[currencyField] : null;
    
    // Validate amount field
    if (!amountValue || amountValue.trim() === '') {
      errors.push(`Row ${rowNum}: Amount field is empty`);
      return;
    }
    
    const cleanedAmount = cleanAmountString(amountValue);
    if (isNaN(parseFloat(cleanedAmount))) {
      errors.push(`Row ${rowNum}: Amount "${amountValue}" is not a valid number`);
    }
    
    // Validate currency field if present
    if (currencyValue) {
      const normalizedCurrency = normalizeCurrencyCode(currencyValue);
      if (!normalizedCurrency) {
        warnings.push(`Row ${rowNum}: Currency "${currencyValue}" is not recognized, will use default`);
      }
    }
  });
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings 
  };
}

/**
 * Parse JSON content into structured data compatible with CSV import flow
 */
export function parseJSON(jsonContent: string): CSVParseResult {
  const errors: string[] = [];
  
  if (!jsonContent || jsonContent.trim() === '') {
    return {
      headers: [],
      data: [],
      errors: ['JSON content is empty'],
      rowCount: 0
    };
  }
  
  try {
    let parsedData: any;
    
    try {
      parsedData = JSON.parse(jsonContent);
    } catch (parseError) {
      return {
        headers: [],
        data: [],
        errors: ['Invalid JSON format: ' + (parseError instanceof Error ? parseError.message : 'Parse error')],
        rowCount: 0
      };
    }
    
    let dataArray: any[] = [];
    
    // Handle different JSON structures
    if (Array.isArray(parsedData)) {
      // Direct array of objects: [ { ... }, ... ]
      dataArray = parsedData;
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      // Object with transactions array: { transactions: [ ... ] } or similar
      const possibleArrayKeys = ['transactions', 'data', 'records', 'items', 'entries'];
      
      for (const key of possibleArrayKeys) {
        if (Array.isArray(parsedData[key])) {
          dataArray = parsedData[key];
          break;
        }
      }
      
      // If no array found in common keys, check if it's a single object
      if (dataArray.length === 0) {
        // Try to find any array property
        const arrayKeys = Object.keys(parsedData).filter(key => Array.isArray(parsedData[key]));
        if (arrayKeys.length === 1) {
          dataArray = parsedData[arrayKeys[0]];
        } else if (arrayKeys.length > 1) {
          errors.push(`Multiple arrays found in JSON. Use one of: ${arrayKeys.join(', ')}`);
        } else {
          // Single object - wrap in array
          dataArray = [parsedData];
        }
      }
    } else {
      return {
        headers: [],
        data: [],
        errors: ['JSON must be an array of objects or an object containing an array'],
        rowCount: 0
      };
    }
    
    if (dataArray.length === 0) {
      return {
        headers: [],
        data: [],
        errors: ['No data found in JSON'],
        rowCount: 0
      };
    }
    
    // Validate that all items are objects
    const nonObjects = dataArray.filter(item => typeof item !== 'object' || item === null);
    if (nonObjects.length > 0) {
      errors.push(`${nonObjects.length} non-object items found in data array`);
    }
    
    // Extract headers from all objects (union of all keys)
    const headerSet = new Set<string>();
    const validObjects = dataArray.filter(item => typeof item === 'object' && item !== null);
    
    validObjects.forEach(obj => {
      Object.keys(obj).forEach(key => headerSet.add(key));
    });
    
    const headers = Array.from(headerSet).sort();
    
    if (headers.length === 0) {
      return {
        headers: [],
        data: [],
        errors: ['No valid object properties found in JSON data'],
        rowCount: 0
      };
    }
    
    // Convert objects to string-based records (consistent with CSV format)
    const data: Record<string, string>[] = validObjects.map((obj, index) => {
      const record: Record<string, string> = {};
      
      headers.forEach(header => {
        const value = obj[header];
        
        // Convert various types to strings
        if (value === null || value === undefined) {
          record[header] = '';
        } else if (typeof value === 'object') {
          // Handle nested objects/arrays by stringifying
          record[header] = JSON.stringify(value);
        } else {
          record[header] = String(value);
        }
      });
      
      return record;
    });
    
    return {
      headers,
      data,
      errors,
      rowCount: data.length
    };
    
  } catch (error) {
    return {
      headers: [],
      data: [],
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
      rowCount: 0
    };
  }
}
