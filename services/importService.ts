import { CurrencyCode, Transaction } from '@/types/database'
import { normalizeCSVData } from '@/utils/importUtils'
import { convertAmount } from '@/lib/currency/conversion'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'

export interface ImportProgress {
  currentBatch: number
  totalBatches: number
  processed: number
  total: number
  percentage: number
  status: 'processing' | 'validating' | 'checking-duplicates' | 'inserting' | 'complete' | 'error'
  message: string
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: ImportError[]
  duplicates: DuplicateInfo[]
}

export interface ImportError {
  row: number
  field?: string
  message: string
  data?: any
}

export interface DuplicateInfo {
  importIndex: number
  existingTransaction: {
    id: string
    description: string
    amount: number
    date: string
  }
  similarity: number
}

export interface ImportOptions {
  batchSize?: number
  duplicateStrategy?: 'skip' | 'import-anyway' | 'replace'
  duplicateThreshold?: number
  onProgress?: (progress: ImportProgress) => void
}

export class ImportService {
  private supabase = createClient()
  
  /**
   * Validates transaction data against schema requirements
   */
  static validateTransactionData(
    normalizedData: Record<string, any>[], 
    mappings: Record<string, string>
  ): ImportError[] {
    const errors: ImportError[] = []
    const requiredFields = ['description', 'amount', 'date']
    
    normalizedData.forEach((row, index) => {
      // Check required fields
      requiredFields.forEach(field => {
        if (mappings[field] && (!row[field] || row[field] === null || row[field] === '')) {
          errors.push({
            row: index + 1,
            field,
            message: `Required field '${field}' is missing or empty`,
            data: row
          })
        }
      })
      
      // Validate amount is a number
      if (row.amount !== null && (isNaN(row.amount) || typeof row.amount !== 'number')) {
        errors.push({
          row: index + 1,
          field: 'amount',
          message: 'Amount must be a valid number',
          data: { value: row.amount }
        })
      }
      
      // Validate date format
      if (row.date) {
        const date = new Date(row.date)
        if (isNaN(date.getTime())) {
          errors.push({
            row: index + 1,
            field: 'date',
            message: 'Date is not in a valid format',
            data: { value: row.date }
          })
        }
        
        // Check if date is too far in the future or past
        const now = new Date()
        const maxPastYears = 10
        const maxFutureMonths = 3
        
        if (date < new Date(now.getFullYear() - maxPastYears, 0, 1)) {
          errors.push({
            row: index + 1,
            field: 'date',
            message: `Date is more than ${maxPastYears} years in the past`,
            data: { value: row.date }
          })
        }
        
        if (date > new Date(now.getFullYear(), now.getMonth() + maxFutureMonths, now.getDate())) {
          errors.push({
            row: index + 1,
            field: 'date',
            message: `Date is more than ${maxFutureMonths} months in the future`,
            data: { value: row.date }
          })
        }
      }
      
      // Validate currency code if present
      if (row.currency) {
        const validCurrencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'ILS']
        if (!validCurrencies.includes(row.currency)) {
          errors.push({
            row: index + 1,
            field: 'currency',
            message: `Invalid currency code '${row.currency}'. Supported: ${validCurrencies.join(', ')}`,
            data: { value: row.currency }
          })
        }
      }
      
      // Validate description length
      if (row.description && row.description.length > 500) {
        errors.push({
          row: index + 1,
          field: 'description',
          message: 'Description is too long (max 500 characters)',
          data: { length: row.description.length }
        })
      }
    })
    
    return errors
  }
  
  /**
   * Detects potential duplicate transactions
   */
  async detectDuplicateTransactions(
    normalizedData: Record<string, any>[],
    userId: string,
    threshold: number = 0.8
  ): Promise<DuplicateInfo[]> {
    const duplicates: DuplicateInfo[] = []
    
    // Get user's transactions from the last 90 days for duplicate checking
    const since = new Date()
    since.setDate(since.getDate() - 90)
    
    const { data: existingTransactions, error } = await this.supabase
      .from('transactions')
      .select('id, description, amount, date, converted_amount')
      .eq('user_id', userId)
      .gte('date', format(since, 'yyyy-MM-dd'))
    
    if (error || !existingTransactions) {
      console.warn('Could not fetch existing transactions for duplicate detection:', error)
      return duplicates
    }
    
    // Check each import record against existing transactions
    normalizedData.forEach((importRow, importIndex) => {
      if (!importRow.description || !importRow.amount || !importRow.date) {
        return // Skip invalid rows
      }
      
      existingTransactions.forEach(existing => {
        const similarity = this.calculateTransactionSimilarity(importRow, existing)
        
        if (similarity >= threshold) {
          duplicates.push({
            importIndex,
            existingTransaction: {
              id: existing.id,
              description: existing.description,
              amount: existing.converted_amount || existing.amount,
              date: existing.date
            },
            similarity
          })
        }
      })
    })
    
    return duplicates
  }
  
  /**
   * Calculates similarity between two transactions (0.0 to 1.0)
   */
  private calculateTransactionSimilarity(
    importRow: Record<string, any>,
    existingTransaction: any
  ): number {
    let score = 0
    let factors = 0
    
    // Date similarity (most important - 40%)
    const importDate = new Date(importRow.date)
    const existingDate = new Date(existingTransaction.date)
    const daysDiff = Math.abs((importDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === 0) {
      score += 0.4
    } else if (daysDiff <= 1) {
      score += 0.3
    } else if (daysDiff <= 3) {
      score += 0.2
    } else if (daysDiff <= 7) {
      score += 0.1
    }
    factors += 0.4
    
    // Amount similarity (35%)
    const importAmount = Math.abs(importRow.amount || 0)
    const existingAmount = Math.abs(existingTransaction.converted_amount || existingTransaction.amount || 0)
    
    if (importAmount === existingAmount) {
      score += 0.35
    } else {
      const amountDiff = Math.abs(importAmount - existingAmount)
      const avgAmount = (importAmount + existingAmount) / 2
      const amountSimilarity = Math.max(0, 1 - (amountDiff / avgAmount))
      score += amountSimilarity * 0.35
    }
    factors += 0.35
    
    // Description similarity (25%)
    const importDesc = (importRow.description || '').toLowerCase().trim()
    const existingDesc = (existingTransaction.description || '').toLowerCase().trim()
    
    if (importDesc === existingDesc) {
      score += 0.25
    } else if (importDesc && existingDesc) {
      const descSimilarity = this.calculateStringSimilarity(importDesc, existingDesc)
      score += descSimilarity * 0.25
    }
    factors += 0.25
    
    return factors > 0 ? score / factors : 0
  }
  
  /**
   * Simple string similarity using Jaccard index
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2))
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
  
  /**
   * Transforms normalized data to transaction format
   */
  static async transformToTransactionFormat(
    normalizedData: Record<string, any>[],
    userId: string,
    defaultCurrency: CurrencyCode = 'ILS'
  ): Promise<Partial<Transaction>[]> {
    const transactions: Partial<Transaction>[] = []
    
    for (const item of normalizedData) {
      const originalCurrency = (item.currency as CurrencyCode) || defaultCurrency
      const baseCurrency = 'ILS' // Could be from user preferences
      
      // Convert amount to base currency if needed
      let convertedAmount = item.amount || 0
      if (originalCurrency !== baseCurrency) {
        try {
          convertedAmount = await convertAmount(item.amount || 0, originalCurrency, baseCurrency)
        } catch (error) {
          console.warn(`Failed to convert ${originalCurrency} to ${baseCurrency}, using original amount`, error)
          convertedAmount = item.amount || 0
        }
      }
      
      transactions.push({
        user_id: userId,
        description: item.description || '',
        amount: item.amount || 0,
        original_currency: originalCurrency,
        converted_amount: convertedAmount,
        base_currency: baseCurrency,
        date: item.date || new Date().toISOString().split('T')[0],
        identifier: item.identifier || null,
        source: item.source || 'import',
        notes: item.notes || null,
        status: 'pending'
      })
    }
    
    return transactions
  }
  
  /**
   * Imports transactions in batches with progress tracking
   */
  async importTransactionsInBatches(
    data: any[],
    mappings: Record<string, string>,
    defaultCurrency: CurrencyCode,
    userId: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const {
      batchSize = 50,
      duplicateStrategy = 'skip',
      duplicateThreshold = 0.8,
      onProgress
    } = options
    
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: []
    }
    
    try {
      // Step 1: Normalize data
      onProgress?.({
        currentBatch: 0,
        totalBatches: 0,
        processed: 0,
        total: data.length,
        percentage: 0,
        status: 'validating',
        message: 'Normalizing import data...'
      })
      
      const normalizedData = normalizeCSVData(data, mappings, defaultCurrency)
      
      // Step 2: Validate data
      onProgress?.({
        currentBatch: 0,
        totalBatches: 0,
        processed: 0,
        total: normalizedData.length,
        percentage: 10,
        status: 'validating',
        message: 'Validating transaction data...'
      })
      
      const validationErrors = ImportService.validateTransactionData(normalizedData, mappings)
      if (validationErrors.length > 0) {
        result.errors = validationErrors
        return result
      }
      
      // Step 3: Check for duplicates
      onProgress?.({
        currentBatch: 0,
        totalBatches: 0,
        processed: 0,
        total: normalizedData.length,
        percentage: 20,
        status: 'checking-duplicates',
        message: 'Checking for duplicate transactions...'
      })
      
      const duplicates = await this.detectDuplicateTransactions(normalizedData, userId, duplicateThreshold)
      result.duplicates = duplicates
      
      // Filter out duplicates based on strategy
      let dataToImport = normalizedData
      if (duplicateStrategy === 'skip' && duplicates.length > 0) {
        const duplicateIndices = new Set(duplicates.map(d => d.importIndex))
        dataToImport = normalizedData.filter((_, index) => !duplicateIndices.has(index))
        result.skipped = duplicates.length
      }
      
      if (dataToImport.length === 0) {
        result.success = true
        return result
      }
      
      // Step 4: Transform to transaction format
      onProgress?.({
        currentBatch: 0,
        totalBatches: 0,
        processed: 0,
        total: dataToImport.length,
        percentage: 30,
        status: 'processing',
        message: 'Converting data to transaction format...'
      })
      
      const transactions = await ImportService.transformToTransactionFormat(dataToImport, userId, defaultCurrency)
      
      // Step 5: Import in batches
      const totalBatches = Math.ceil(transactions.length / batchSize)
      
      for (let i = 0; i < transactions.length; i += batchSize) {
        const currentBatch = Math.floor(i / batchSize) + 1
        const batch = transactions.slice(i, i + batchSize)
        
        onProgress?.({
          currentBatch,
          totalBatches,
          processed: i,
          total: transactions.length,
          percentage: 30 + (i / transactions.length) * 60,
          status: 'inserting',
          message: `Importing batch ${currentBatch} of ${totalBatches}...`
        })
        
        try {
          const { error } = await this.supabase
            .from('transactions')
            .insert(batch)
          
          if (error) {
            throw error
          }
          
          result.imported += batch.length
        } catch (error) {
          console.error('Batch import error:', error)
          result.errors.push({
            row: i + 1,
            message: `Batch import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { batchSize: batch.length }
          })
        }
      }
      
      // Step 6: Complete
      onProgress?.({
        currentBatch: totalBatches,
        totalBatches,
        processed: transactions.length,
        total: transactions.length,
        percentage: 100,
        status: 'complete',
        message: `Import complete! Imported ${result.imported} transactions.`
      })
      
      result.success = result.errors.length === 0
      return result
      
    } catch (error) {
      console.error('Import service error:', error)
      result.errors.push({
        row: 0,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return result
    }
  }
  
  /**
   * Handles and formats import errors for user display
   */
  static handleImportErrors(errors: ImportError[]): {
    summary: string
    details: string[]
    suggestions: string[]
  } {
    if (errors.length === 0) {
      return {
        summary: 'No errors found',
        details: [],
        suggestions: []
      }
    }
    
    const summary = `Found ${errors.length} error(s) in your import data`
    const details: string[] = []
    const suggestions: string[] = []
    
    // Group errors by type
    const errorsByType: Record<string, ImportError[]> = {}
    errors.forEach(error => {
      const key = error.field || 'general'
      if (!errorsByType[key]) errorsByType[key] = []
      errorsByType[key].push(error)
    })
    
    // Generate details and suggestions
    Object.entries(errorsByType).forEach(([field, fieldErrors]) => {
      details.push(`${field.toUpperCase()}: ${fieldErrors.length} error(s)`)
      
      fieldErrors.slice(0, 3).forEach(error => {
        details.push(`  Row ${error.row}: ${error.message}`)
      })
      
      if (fieldErrors.length > 3) {
        details.push(`  ... and ${fieldErrors.length - 3} more`)
      }
      
      // Add suggestions based on error type
      if (field === 'amount') {
        suggestions.push('Ensure all amount values are valid numbers')
        suggestions.push('Remove any currency symbols from amount columns')
      } else if (field === 'date') {
        suggestions.push('Use a consistent date format (YYYY-MM-DD, MM/DD/YYYY, etc.)')
        suggestions.push('Check for invalid dates like February 30th')
      } else if (field === 'description') {
        suggestions.push('Ensure descriptions are not empty and under 500 characters')
      } else if (field === 'currency') {
        suggestions.push('Use valid currency codes: USD, EUR, GBP, ILS')
      }
    })
    
    return {
      summary,
      details,
      suggestions: [...new Set(suggestions)] // Remove duplicates
    }
  }
} 