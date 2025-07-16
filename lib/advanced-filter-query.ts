import { SupabaseClient } from '@supabase/supabase-js'
import { Filter, FilterCondition, FilterField, FilterOperator } from '@/components/transactions/FilterBuilder'

/**
 * Converts a complex filter object into a Supabase query
 * Supports multiple conditions with AND/OR logic
 */
export function applyAdvancedFilterToQuery(
  supabase: SupabaseClient,
  filter: Filter,
  tableName: string = 'transactions'
) {
  let query = supabase
    .from(tableName)
    .select(`
      *,
      transaction_labels (
        label_id,
        labels (
          id,
          name,
          color
        )
      )
    `)

  // If no conditions, return the base query
  if (!filter.conditions || filter.conditions.length === 0) {
    return query
  }

  // Apply conditions based on conjunction (AND/OR)
  if (filter.conjunction === 'AND') {
    // For AND, we apply each condition directly to the query
    filter.conditions.forEach(condition => {
      query = applyConditionToQuery(query, condition)
    })
  } else {
    // For OR, we need to use the .or() method
    const orConditions = filter.conditions.map(condition => 
      buildConditionString(condition)
    ).filter(Boolean)
    
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
    }
  }

  return query
}

/**
 * Applies a single condition to a query (for AND logic)
 */
function applyConditionToQuery(query: any, condition: FilterCondition) {
  const { field, operator, value } = condition

  if (!value || (Array.isArray(value) && value.some(v => !v))) {
    return query
  }

  switch (field) {
    case 'description':
      return applyTextCondition(query, 'description', operator, value)
    
    case 'amount':
      return applyNumberCondition(query, 'amount', operator, value)
    
    case 'date':
      return applyDateCondition(query, 'date', operator, value)
    
    case 'source':
      return applyTextCondition(query, 'source', operator, value)
    
    case 'status':
      return applyStatusCondition(query, operator, value)
    
    case 'label':
      return applyLabelCondition(query, operator, value)
    
    default:
      return query
  }
}

/**
 * Builds a condition string for OR logic
 */
function buildConditionString(condition: FilterCondition): string {
  const { field, operator, value } = condition

  if (!value || (Array.isArray(value) && value.some(v => !v))) {
    return ''
  }

  switch (field) {
    case 'description':
      return buildTextConditionString('description', operator, value)
    
    case 'amount':
      return buildNumberConditionString('amount', operator, value)
    
    case 'date':
      return buildDateConditionString('date', operator, value)
    
    case 'source':
      return buildTextConditionString('source', operator, value)
    
    case 'status':
      return buildStatusConditionString(operator, value)
    
    case 'label':
      // Label conditions are complex and need special handling
      // For now, we'll skip them in OR conditions
      return ''
    
    default:
      return ''
  }
}

/**
 * Text field condition handlers
 */
function applyTextCondition(query: any, field: string, operator: FilterOperator, value: string) {
  switch (operator) {
    case 'equals':
      return query.eq(field, value)
    case 'contains':
      return query.ilike(field, `%${value}%`)
    case 'starts_with':
      return query.ilike(field, `${value}%`)
    case 'ends_with':
      return query.ilike(field, `%${value}`)
    default:
      return query
  }
}

function buildTextConditionString(field: string, operator: FilterOperator, value: string): string {
  switch (operator) {
    case 'equals':
      return `${field}.eq."${value}"`
    case 'contains':
      return `${field}.ilike."%${value}%"`
    case 'starts_with':
      return `${field}.ilike."${value}%"`
    case 'ends_with':
      return `${field}.ilike."%${value}"`
    default:
      return ''
  }
}

/**
 * Number field condition handlers
 */
function applyNumberCondition(query: any, field: string, operator: FilterOperator, value: number | number[]) {
  switch (operator) {
    case 'equals':
      return query.eq(field, value)
    case 'greater_than':
      return query.gt(field, value)
    case 'less_than':
      return query.lt(field, value)
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return query.gte(field, value[0]).lte(field, value[1])
      }
      return query
    default:
      return query
  }
}

function buildNumberConditionString(field: string, operator: FilterOperator, value: number | number[]): string {
  switch (operator) {
    case 'equals':
      return `${field}.eq.${value}`
    case 'greater_than':
      return `${field}.gt.${value}`
    case 'less_than':
      return `${field}.lt.${value}`
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return `${field}.gte.${value[0]},${field}.lte.${value[1]}`
      }
      return ''
    default:
      return ''
  }
}

/**
 * Date field condition handlers
 */
function applyDateCondition(query: any, field: string, operator: FilterOperator, value: string | string[]) {
  switch (operator) {
    case 'equals':
      return query.eq(field, value)
    case 'greater_than':
      return query.gt(field, value)
    case 'less_than':
      return query.lt(field, value)
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return query.gte(field, value[0]).lte(field, value[1])
      }
      return query
    default:
      return query
  }
}

function buildDateConditionString(field: string, operator: FilterOperator, value: string | string[]): string {
  switch (operator) {
    case 'equals':
      return `${field}.eq."${value}"`
    case 'greater_than':
      return `${field}.gt."${value}"`
    case 'less_than':
      return `${field}.lt."${value}"`
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return `${field}.gte."${value[0]}",${field}.lte."${value[1]}"`
      }
      return ''
    default:
      return ''
  }
}

/**
 * Status field condition handlers
 */
function applyStatusCondition(query: any, operator: FilterOperator, value: string) {
  switch (operator) {
    case 'equals':
      return query.eq('status', value)
    case 'not_in':
      return query.neq('status', value)
    default:
      return query
  }
}

function buildStatusConditionString(operator: FilterOperator, value: string): string {
  switch (operator) {
    case 'equals':
      return `status.eq."${value}"`
    case 'not_in':
      return `status.neq."${value}"`
    default:
      return ''
  }
}

/**
 * Label field condition handlers
 */
function applyLabelCondition(query: any, operator: FilterOperator, value: string) {
  switch (operator) {
    case 'equals':
      // Filter transactions that have this specific label
      return query.filter('transaction_labels.label_id', 'eq', value)
    case 'not_in':
      // Filter transactions that don't have this specific label
      return query.not('transaction_labels.label_id', 'eq', value)
    default:
      return query
  }
}

/**
 * Test a filter against sample data or existing transactions
 */
export async function testFilter(
  supabase: SupabaseClient,
  filter: Filter,
  sampleTransaction?: any
): Promise<{
  matches: boolean
  results?: any[]
  error?: string
}> {
  try {
    if (sampleTransaction) {
      // Test against a single sample transaction
      const matches = evaluateFilterAgainstTransaction(filter, sampleTransaction)
      return { matches }
    } else {
      // Test against actual database with a limit
      const query = applyAdvancedFilterToQuery(supabase, filter)
      const { data, error } = await query.limit(10)
      
      if (error) {
        return { matches: false, error: error.message }
      }
      
      return { matches: (data?.length || 0) > 0, results: data || [] }
    }
  } catch (error) {
    return { matches: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Evaluate a filter against a single transaction object
 */
function evaluateFilterAgainstTransaction(filter: Filter, transaction: any): boolean {
  if (!filter.conditions || filter.conditions.length === 0) {
    return true
  }

  const results = filter.conditions.map(condition => 
    evaluateConditionAgainstTransaction(condition, transaction)
  )

  if (filter.conjunction === 'AND') {
    return results.every(Boolean)
  } else {
    return results.some(Boolean)
  }
}

/**
 * Evaluate a single condition against a transaction
 */
function evaluateConditionAgainstTransaction(condition: FilterCondition, transaction: any): boolean {
  const { field, operator, value } = condition
  
  if (!value || (Array.isArray(value) && value.some(v => !v))) {
    return false
  }

  const fieldValue = transaction[field]

  switch (field) {
    case 'description':
    case 'source':
      return evaluateTextCondition(fieldValue, operator, value)
    case 'amount':
      return evaluateNumberCondition(parseFloat(fieldValue), operator, value)
    case 'date':
      return evaluateDateCondition(fieldValue, operator, value)
    case 'status':
      return evaluateStatusCondition(fieldValue, operator, value)
    case 'label':
      return evaluateLabelCondition(transaction.transaction_labels, operator, value)
    default:
      return false
  }
}

function evaluateTextCondition(fieldValue: string, operator: FilterOperator, value: string): boolean {
  if (!fieldValue) return false
  
  switch (operator) {
    case 'equals':
      return fieldValue.toLowerCase() === value.toLowerCase()
    case 'contains':
      return fieldValue.toLowerCase().includes(value.toLowerCase())
    case 'starts_with':
      return fieldValue.toLowerCase().startsWith(value.toLowerCase())
    case 'ends_with':
      return fieldValue.toLowerCase().endsWith(value.toLowerCase())
    default:
      return false
  }
}

function evaluateNumberCondition(fieldValue: number, operator: FilterOperator, value: number | number[]): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'greater_than':
      return fieldValue > (value as number)
    case 'less_than':
      return fieldValue < (value as number)
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return fieldValue >= value[0] && fieldValue <= value[1]
      }
      return false
    default:
      return false
  }
}

function evaluateDateCondition(fieldValue: string, operator: FilterOperator, value: string | string[]): boolean {
  const fieldDate = new Date(fieldValue)
  
  switch (operator) {
    case 'equals':
      return fieldDate.toISOString().split('T')[0] === value
    case 'greater_than':
      return fieldDate > new Date(value as string)
    case 'less_than':
      return fieldDate < new Date(value as string)
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return fieldDate >= new Date(value[0]) && fieldDate <= new Date(value[1])
      }
      return false
    default:
      return false
  }
}

function evaluateStatusCondition(fieldValue: string, operator: FilterOperator, value: string): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'not_in':
      return fieldValue !== value
    default:
      return false
  }
}

function evaluateLabelCondition(transactionLabels: any[], operator: FilterOperator, value: string): boolean {
  if (!transactionLabels || transactionLabels.length === 0) {
    return operator === 'not_in'
  }
  
  const hasLabel = transactionLabels.some(tl => tl.label_id === value)
  
  switch (operator) {
    case 'equals':
      return hasLabel
    case 'not_in':
      return !hasLabel
    default:
      return false
  }
} 