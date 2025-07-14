import { supabase } from './supabase'
import { Transaction, Rule, RuleCondition } from '@/types/database'

/**
 * Evaluates a text condition against a transaction field
 */
const evaluateTextCondition = (fieldValue: string, operator: string, conditionValue: string): boolean => {
  if (!fieldValue || !conditionValue) return false
  
  const field = fieldValue.toLowerCase()
  const value = conditionValue.toLowerCase()
  
  switch (operator) {
    case 'equals':
      return field === value
    case 'contains':
      return field.includes(value)
    case 'starts_with':
      return field.startsWith(value)
    case 'ends_with':
      return field.endsWith(value)
    default:
      return false
  }
}

/**
 * Evaluates a number condition against a transaction field
 */
const evaluateNumberCondition = (fieldValue: number, operator: string, conditionValue: number | [number, number]): boolean => {
  if (fieldValue === null || fieldValue === undefined) return false
  
  switch (operator) {
    case 'equals':
      return fieldValue === conditionValue
    case 'greater_than':
      return fieldValue > (conditionValue as number)
    case 'less_than':
      return fieldValue < (conditionValue as number)
    case 'between':
      if (Array.isArray(conditionValue)) {
        return fieldValue >= conditionValue[0] && fieldValue <= conditionValue[1]
      }
      return false
    default:
      return false
  }
}

/**
 * Evaluates a date condition against a transaction field
 */
const evaluateDateCondition = (fieldValue: Date | string, operator: string, conditionValue: string): boolean => {
  if (!fieldValue || !conditionValue) return false
  
  const transactionDate = new Date(fieldValue)
  const conditionDate = new Date(conditionValue)
  
  if (isNaN(transactionDate.getTime()) || isNaN(conditionDate.getTime())) return false
  
  switch (operator) {
    case 'equals':
      return transactionDate.toDateString() === conditionDate.toDateString()
    case 'greater_than':
      return transactionDate > conditionDate
    case 'less_than':
      return transactionDate < conditionDate
    default:
      return false
  }
}

/**
 * Evaluates a single rule condition against a transaction
 */
const evaluateCondition = (transaction: Transaction, condition: RuleCondition): boolean => {
  const { field, operator, value } = condition
  
  switch (field) {
    case 'description':
      return evaluateTextCondition(transaction.description, operator, value as string)
    case 'amount':
      return evaluateNumberCondition(transaction.amount, operator, value as number | [number, number])
    case 'identifier':
      return evaluateTextCondition(transaction.identifier || '', operator, value as string)
    case 'date':
      return evaluateDateCondition(transaction.date, operator, value as string)
    case 'source':
      return evaluateTextCondition(transaction.source || '', operator, value as string)
    default:
      return false
  }
}

/**
 * Evaluates a complete rule against a transaction
 * Returns true if ALL conditions match (AND logic)
 */
export const evaluateRule = (transaction: Transaction, rule: Rule): boolean => {
  if (!rule.is_active) return false
  
  return rule.conditions.every(condition => evaluateCondition(transaction, condition))
}

/**
 * Applies a label to a transaction if it doesn't already have it
 */
const applyLabelToTransaction = async (transactionId: string, labelId: string): Promise<boolean> => {
  try {
    // Check if label is already applied
    const { data: existing } = await supabase
      .from('transaction_labels')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('label_id', labelId)
      .single()
    
    if (existing) return false // Label already applied
    
    // Apply the label
    const { error } = await supabase
      .from('transaction_labels')
      .insert({ transaction_id: transactionId, label_id: labelId })
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error applying label to transaction:', error)
    return false
  }
}

/**
 * Applies all matching rules to a single transaction
 */
export const applyRulesToTransaction = async (transaction: Transaction): Promise<{
  rulesApplied: string[]
  labelsApplied: string[]
}> => {
  const rulesApplied: string[] = []
  const labelsApplied: string[] = []
  
  try {
    // Fetch all active rules ordered by priority
    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    
    if (error) throw error
    if (!rules || rules.length === 0) return { rulesApplied, labelsApplied }
    
    // Apply each matching rule
    for (const rule of rules) {
      if (evaluateRule(transaction, rule)) {
        rulesApplied.push(rule.id)
        
        // Apply each label from the rule
        for (const labelId of rule.labels_to_apply) {
          const applied = await applyLabelToTransaction(transaction.id, labelId)
          if (applied) {
            labelsApplied.push(labelId)
          }
        }
      }
    }
    
    return { rulesApplied, labelsApplied }
  } catch (error) {
    console.error('Error applying rules to transaction:', error)
    return { rulesApplied, labelsApplied }
  }
}

/**
 * Applies rules to multiple transactions
 */
export const applyRulesToTransactions = async (transactions: Transaction[]): Promise<{
  totalProcessed: number
  rulesApplied: Record<string, string[]>
  labelsApplied: Record<string, string[]>
}> => {
  const rulesApplied: Record<string, string[]> = {}
  const labelsApplied: Record<string, string[]> = {}
  
  for (const transaction of transactions) {
    const result = await applyRulesToTransaction(transaction)
    
    if (result.rulesApplied.length > 0) {
      rulesApplied[transaction.id] = result.rulesApplied
    }
    
    if (result.labelsApplied.length > 0) {
      labelsApplied[transaction.id] = result.labelsApplied
    }
  }
  
  return {
    totalProcessed: transactions.length,
    rulesApplied,
    labelsApplied
  }
}

/**
 * Tests which rules would match a given transaction (without applying them)
 */
export const testRulesAgainstTransaction = async (transaction: Transaction): Promise<{
  matchingRules: Rule[]
  labelsToApply: string[]
}> => {
  const matchingRules: Rule[] = []
  const labelsToApply: string[] = []
  
  try {
    // Fetch all active rules
    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    
    if (error) throw error
    if (!rules) return { matchingRules, labelsToApply }
    
    // Test each rule
    for (const rule of rules) {
      if (evaluateRule(transaction, rule)) {
        matchingRules.push(rule)
        labelsToApply.push(...rule.labels_to_apply)
      }
    }
    
    // Remove duplicate labels
    const uniqueLabelsToApply = [...new Set(labelsToApply)]
    
    return {
      matchingRules,
      labelsToApply: uniqueLabelsToApply
    }
  } catch (error) {
    console.error('Error testing rules against transaction:', error)
    return { matchingRules, labelsToApply }
  }
}

/**
 * Automatically applies rules to all pending transactions
 */
export const processAllPendingTransactions = async (): Promise<{
  totalProcessed: number
  rulesApplied: Record<string, string[]>
  labelsApplied: Record<string, string[]>
}> => {
  try {
    // Fetch all pending transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
    
    if (error) throw error
    if (!transactions || transactions.length === 0) {
      return {
        totalProcessed: 0,
        rulesApplied: {},
        labelsApplied: {}
      }
    }
    
    return await applyRulesToTransactions(transactions)
  } catch (error) {
    console.error('Error processing pending transactions:', error)
    return {
      totalProcessed: 0,
      rulesApplied: {},
      labelsApplied: {}
    }
  }
}

/**
 * Utility to format rule conditions for display
 */
export const formatRuleCondition = (condition: RuleCondition): string => {
  const field = condition.field.charAt(0).toUpperCase() + condition.field.slice(1)
  const operator = condition.operator.replace(/_/g, ' ')
  let value = condition.value
  
  if (condition.operator === 'between' && Array.isArray(value)) {
    value = `${value[0]} - ${value[1]}`
  }
  
  return `${field} ${operator} "${value}"`
}

/**
 * Utility to get a human-readable description of a rule
 */
export const getRuleDescription = (rule: Rule): string => {
  const conditionDescriptions = rule.conditions.map(formatRuleCondition)
  const conditionText = conditionDescriptions.join(' AND ')
  
  return `When ${conditionText}, apply ${rule.labels_to_apply.length} label${rule.labels_to_apply.length !== 1 ? 's' : ''}`
} 