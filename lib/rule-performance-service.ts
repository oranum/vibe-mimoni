import { supabase } from './supabase'
import { RulePerformance, RuleExecutionLog, RulePerformanceStats, RulePerformanceWithRule, Rule, Transaction } from '@/types/database'

export class RulePerformanceService {
  /**
   * Logs a rule execution with performance metrics
   */
  static async logRuleExecution(
    userId: string,
    ruleId: string,
    transactionId: string,
    matched: boolean,
    executionTimeMs: number,
    labelsApplied: string[],
    ruleConditions: any,
    transactionData: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('rule_execution_logs')
        .insert({
          user_id: userId,
          rule_id: ruleId,
          transaction_id: transactionId,
          matched,
          execution_time_ms: executionTimeMs,
          labels_applied: labelsApplied,
          rule_conditions: ruleConditions,
          transaction_data: transactionData
        })

      if (error) {
        console.error('Error logging rule execution:', error)
      }
    } catch (error) {
      console.error('Error logging rule execution:', error)
    }
  }

  /**
   * Retrieves performance metrics for a specific rule
   */
  static async getRulePerformance(ruleId: string): Promise<RulePerformance | null> {
    try {
      const { data, error } = await supabase
        .from('rule_performance')
        .select('*')
        .eq('rule_id', ruleId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching rule performance:', error)
        return null
      }

      return data ? {
        ...data,
        last_execution_at: data.last_execution_at ? new Date(data.last_execution_at) : null,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      } : null
    } catch (error) {
      console.error('Error fetching rule performance:', error)
      return null
    }
  }

  /**
   * Retrieves performance metrics for all rules with rule details
   */
  static async getAllRulePerformance(): Promise<RulePerformanceWithRule[]> {
    try {
      const { data, error } = await supabase
        .from('rule_performance')
        .select(`
          *,
          rule:rules(*)
        `)
        .order('total_executions', { ascending: false })

      if (error) {
        console.error('Error fetching all rule performance:', error)
        return []
      }

      return data ? data.map(item => ({
        ...item,
        last_execution_at: item.last_execution_at ? new Date(item.last_execution_at) : null,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
        rule: item.rule as Rule
      })) : []
    } catch (error) {
      console.error('Error fetching all rule performance:', error)
      return []
    }
  }

  /**
   * Retrieves comprehensive performance statistics
   */
  static async getPerformanceStats(): Promise<RulePerformanceStats> {
    try {
      const allPerformance = await this.getAllRulePerformance()
      
      if (allPerformance.length === 0) {
        return {
          totalExecutions: 0,
          totalMatches: 0,
          totalLabelsApplied: 0,
          averageMatchRate: 0,
          mostActiveRule: null,
          mostEffectiveRule: null,
          executionsToday: 0,
          matchesToday: 0,
          recentActivity: []
        }
      }

      const totalExecutions = allPerformance.reduce((sum, p) => sum + p.total_executions, 0)
      const totalMatches = allPerformance.reduce((sum, p) => sum + p.total_matches, 0)
      const totalLabelsApplied = allPerformance.reduce((sum, p) => sum + p.total_labels_applied, 0)
      const averageMatchRate = totalExecutions > 0 ? totalMatches / totalExecutions : 0
      const executionsToday = allPerformance.reduce((sum, p) => sum + p.executions_today, 0)
      const matchesToday = allPerformance.reduce((sum, p) => sum + p.matches_today, 0)

      // Find most active rule (highest executions)
      const mostActiveRule = allPerformance.reduce((prev, current) => 
        prev.total_executions > current.total_executions ? prev : current
      )

      // Find most effective rule (highest match rate with minimum executions)
      const mostEffectiveRule = allPerformance
        .filter(p => p.total_executions >= 5) // Only consider rules with at least 5 executions
        .reduce((prev, current) => 
          prev.match_rate > current.match_rate ? prev : current
        )

      // Get recent activity
      const recentActivity = await this.getRecentActivity(10)

      return {
        totalExecutions,
        totalMatches,
        totalLabelsApplied,
        averageMatchRate,
        mostActiveRule,
        mostEffectiveRule: mostEffectiveRule || null,
        executionsToday,
        matchesToday,
        recentActivity
      }
    } catch (error) {
      console.error('Error fetching performance stats:', error)
      return {
        totalExecutions: 0,
        totalMatches: 0,
        totalLabelsApplied: 0,
        averageMatchRate: 0,
        mostActiveRule: null,
        mostEffectiveRule: null,
        executionsToday: 0,
        matchesToday: 0,
        recentActivity: []
      }
    }
  }

  /**
   * Retrieves recent rule execution activity
   */
  static async getRecentActivity(limit: number = 20): Promise<RuleExecutionLog[]> {
    try {
      const { data, error } = await supabase
        .from('rule_execution_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent activity:', error)
        return []
      }

      return data ? data.map(item => ({
        ...item,
        executed_at: new Date(item.executed_at)
      })) : []
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return []
    }
  }

  /**
   * Retrieves execution logs for a specific rule
   */
  static async getRuleExecutionLogs(ruleId: string, limit: number = 50): Promise<RuleExecutionLog[]> {
    try {
      const { data, error } = await supabase
        .from('rule_execution_logs')
        .select('*')
        .eq('rule_id', ruleId)
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching rule execution logs:', error)
        return []
      }

      return data ? data.map(item => ({
        ...item,
        executed_at: new Date(item.executed_at)
      })) : []
    } catch (error) {
      console.error('Error fetching rule execution logs:', error)
      return []
    }
  }

  /**
   * Retrieves performance metrics for rules executed today
   */
  static async getTodayPerformance(): Promise<RulePerformanceWithRule[]> {
    try {
      const { data, error } = await supabase
        .from('rule_performance')
        .select(`
          *,
          rule:rules(*)
        `)
        .gt('executions_today', 0)
        .order('executions_today', { ascending: false })

      if (error) {
        console.error('Error fetching today performance:', error)
        return []
      }

      return data ? data.map(item => ({
        ...item,
        last_execution_at: item.last_execution_at ? new Date(item.last_execution_at) : null,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
        rule: item.rule as Rule
      })) : []
    } catch (error) {
      console.error('Error fetching today performance:', error)
      return []
    }
  }

  /**
   * Retrieves underperforming rules (low match rate)
   */
  static async getUnderperformingRules(minExecutions: number = 10): Promise<RulePerformanceWithRule[]> {
    try {
      const { data, error } = await supabase
        .from('rule_performance')
        .select(`
          *,
          rule:rules(*)
        `)
        .gte('total_executions', minExecutions)
        .lt('match_rate', 0.1) // Less than 10% match rate
        .order('match_rate', { ascending: true })

      if (error) {
        console.error('Error fetching underperforming rules:', error)
        return []
      }

      return data ? data.map(item => ({
        ...item,
        last_execution_at: item.last_execution_at ? new Date(item.last_execution_at) : null,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
        rule: item.rule as Rule
      })) : []
    } catch (error) {
      console.error('Error fetching underperforming rules:', error)
      return []
    }
  }

  /**
   * Clears performance data for a specific rule
   */
  static async clearRulePerformance(ruleId: string): Promise<void> {
    try {
      // Clear performance metrics
      await supabase
        .from('rule_performance')
        .delete()
        .eq('rule_id', ruleId)

      // Clear execution logs
      await supabase
        .from('rule_execution_logs')
        .delete()
        .eq('rule_id', ruleId)
    } catch (error) {
      console.error('Error clearing rule performance:', error)
    }
  }

  /**
   * Formats performance metrics for display
   */
  static formatPerformanceMetrics(performance: RulePerformance): {
    matchRate: string;
    executionsToday: string;
    totalExecutions: string;
    totalMatches: string;
    avgExecutionTime: string;
    lastExecution: string;
  } {
    return {
      matchRate: `${(performance.match_rate * 100).toFixed(1)}%`,
      executionsToday: performance.executions_today.toString(),
      totalExecutions: performance.total_executions.toString(),
      totalMatches: performance.total_matches.toString(),
      avgExecutionTime: `${performance.avg_execution_time_ms.toFixed(1)}ms`,
      lastExecution: performance.last_execution_at 
        ? performance.last_execution_at.toLocaleDateString()
        : 'Never'
    }
  }

  /**
   * Calculates performance trend (improving/declining)
   */
  static async getPerformanceTrend(ruleId: string): Promise<'improving' | 'declining' | 'stable'> {
    try {
      const logs = await this.getRuleExecutionLogs(ruleId, 20)
      if (logs.length < 10) return 'stable'

      const recentLogs = logs.slice(0, 10)
      const olderLogs = logs.slice(10)

      const recentMatchRate = recentLogs.filter(l => l.matched).length / recentLogs.length
      const olderMatchRate = olderLogs.filter(l => l.matched).length / olderLogs.length

      const difference = recentMatchRate - olderMatchRate
      
      if (difference > 0.05) return 'improving'
      if (difference < -0.05) return 'declining'
      return 'stable'
    } catch (error) {
      console.error('Error calculating performance trend:', error)
      return 'stable'
    }
  }
} 