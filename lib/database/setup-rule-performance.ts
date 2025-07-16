import { supabase } from '../supabase'

/**
 * Sets up the rule performance monitoring tables in the database
 * This should be run once to create the necessary tables and triggers
 */
export async function setupRulePerformanceTables(): Promise<void> {
  try {
    console.log('Setting up rule performance monitoring tables...')

    // Read the SQL schema file content
    const schemaSQL = `
      -- Rule Performance Tracking Schema
      -- This tracks rule execution statistics for performance monitoring

      -- Table to store rule performance metrics
      CREATE TABLE IF NOT EXISTS rule_performance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
          
          -- Execution metrics
          total_executions INTEGER DEFAULT 0,
          total_matches INTEGER DEFAULT 0,
          total_labels_applied INTEGER DEFAULT 0,
          
          -- Performance metrics
          avg_execution_time_ms DECIMAL(10,3) DEFAULT 0,
          last_execution_at TIMESTAMP WITH TIME ZONE,
          
          -- Time-based metrics
          executions_today INTEGER DEFAULT 0,
          executions_this_week INTEGER DEFAULT 0,
          executions_this_month INTEGER DEFAULT 0,
          
          matches_today INTEGER DEFAULT 0,
          matches_this_week INTEGER DEFAULT 0,
          matches_this_month INTEGER DEFAULT 0,
          
          -- Effectiveness metrics
          match_rate DECIMAL(5,4) DEFAULT 0,
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Table to store detailed rule execution logs
      CREATE TABLE IF NOT EXISTS rule_execution_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
          transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
          
          -- Execution details
          matched BOOLEAN NOT NULL DEFAULT false,
          execution_time_ms DECIMAL(10,3) DEFAULT 0,
          labels_applied TEXT[] DEFAULT '{}',
          
          -- Context
          rule_conditions JSONB,
          transaction_data JSONB,
          
          -- Timestamps
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create the tables
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: schemaSQL })
    if (tableError) {
      console.error('Error creating tables:', tableError)
      throw tableError
    }

    // Create indexes
    const indexSQL = `
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_rule_performance_user_id ON rule_performance(user_id);
      CREATE INDEX IF NOT EXISTS idx_rule_performance_rule_id ON rule_performance(rule_id);
      CREATE INDEX IF NOT EXISTS idx_rule_performance_last_execution ON rule_performance(last_execution_at);
      
      CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_user_id ON rule_execution_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule_id ON rule_execution_logs(rule_id);
      CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_transaction_id ON rule_execution_logs(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_executed_at ON rule_execution_logs(executed_at);
      CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_matched ON rule_execution_logs(matched);
    `

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL })
    if (indexError) {
      console.error('Error creating indexes:', indexError)
      throw indexError
    }

    // Create unique constraints
    const constraintSQL = `
      -- Unique constraint to ensure one performance record per user per rule
      ALTER TABLE rule_performance ADD CONSTRAINT IF NOT EXISTS unique_user_rule_performance 
          UNIQUE (user_id, rule_id);
    `

    const { error: constraintError } = await supabase.rpc('exec_sql', { sql: constraintSQL })
    if (constraintError) {
      console.error('Error creating constraints:', constraintError)
      throw constraintError
    }

    // Enable RLS
    const rlsSQL = `
      ALTER TABLE rule_performance ENABLE ROW LEVEL SECURITY;
      ALTER TABLE rule_execution_logs ENABLE ROW LEVEL SECURITY;
    `

    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSQL })
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError)
      throw rlsError
    }

    // Create RLS policies
    const policySQL = `
      CREATE POLICY IF NOT EXISTS rule_performance_user_policy ON rule_performance
          FOR ALL USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS rule_execution_logs_user_policy ON rule_execution_logs
          FOR ALL USING (auth.uid() = user_id);
    `

    const { error: policyError } = await supabase.rpc('exec_sql', { sql: policySQL })
    if (policyError) {
      console.error('Error creating policies:', policyError)
      throw policyError
    }

    console.log('✅ Rule performance monitoring tables created successfully!')
  } catch (error) {
    console.error('❌ Error setting up rule performance tables:', error)
    throw error
  }
}

/**
 * Checks if the rule performance tables exist and are properly set up
 */
export async function checkRulePerformanceTables(): Promise<boolean> {
  try {
    // Check if tables exist by querying them
    const { data: performanceData, error: performanceError } = await supabase
      .from('rule_performance')
      .select('id')
      .limit(1)

    const { data: logsData, error: logsError } = await supabase
      .from('rule_execution_logs')
      .select('id')
      .limit(1)

    // If both queries succeed (even if no data), tables exist
    return !performanceError && !logsError
  } catch (error) {
    console.error('Error checking rule performance tables:', error)
    return false
  }
}

/**
 * Initializes rule performance monitoring if not already set up
 */
export async function initializeRulePerformanceMonitoring(): Promise<void> {
  try {
    const tablesExist = await checkRulePerformanceTables()
    
    if (!tablesExist) {
      console.log('Rule performance tables not found. Setting up...')
      await setupRulePerformanceTables()
    } else {
      console.log('Rule performance tables already exist.')
    }
  } catch (error) {
    console.error('Error initializing rule performance monitoring:', error)
    throw error
  }
}

/**
 * Utility function to manually run the setup (for testing or initial setup)
 */
export async function runSetup(): Promise<void> {
  try {
    await initializeRulePerformanceMonitoring()
    console.log('Setup completed successfully!')
  } catch (error) {
    console.error('Setup failed:', error)
  }
} 