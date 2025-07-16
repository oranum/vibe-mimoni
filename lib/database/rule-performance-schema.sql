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
    match_rate DECIMAL(5,4) DEFAULT 0, -- percentage of executions that result in matches
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rule_performance_user_id ON rule_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_performance_rule_id ON rule_performance(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_performance_last_execution ON rule_performance(last_execution_at);

-- Unique constraint to ensure one performance record per user per rule
ALTER TABLE rule_performance ADD CONSTRAINT unique_user_rule_performance 
    UNIQUE (user_id, rule_id);

-- Table to store detailed rule execution logs (for detailed analytics)
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
    rule_conditions JSONB, -- snapshot of rule conditions at time of execution
    transaction_data JSONB, -- snapshot of relevant transaction data
    
    -- Timestamps
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for execution logs
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_user_id ON rule_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule_id ON rule_execution_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_transaction_id ON rule_execution_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_executed_at ON rule_execution_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_matched ON rule_execution_logs(matched);

-- Row Level Security (RLS) policies
ALTER TABLE rule_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy for rule_performance table
CREATE POLICY rule_performance_user_policy ON rule_performance
    FOR ALL USING (auth.uid() = user_id);

-- Policy for rule_execution_logs table
CREATE POLICY rule_execution_logs_user_policy ON rule_execution_logs
    FOR ALL USING (auth.uid() = user_id);

-- Function to update rule performance metrics
CREATE OR REPLACE FUNCTION update_rule_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert performance metrics
    INSERT INTO rule_performance (
        user_id, 
        rule_id, 
        total_executions, 
        total_matches, 
        total_labels_applied,
        last_execution_at,
        executions_today,
        executions_this_week,
        executions_this_month,
        matches_today,
        matches_this_week,
        matches_this_month,
        match_rate,
        updated_at
    )
    VALUES (
        NEW.user_id,
        NEW.rule_id,
        1,
        CASE WHEN NEW.matched THEN 1 ELSE 0 END,
        CASE WHEN NEW.matched THEN array_length(NEW.labels_applied, 1) ELSE 0 END,
        NEW.executed_at,
        CASE WHEN NEW.executed_at::date = CURRENT_DATE THEN 1 ELSE 0 END,
        CASE WHEN NEW.executed_at >= date_trunc('week', CURRENT_DATE) THEN 1 ELSE 0 END,
        CASE WHEN NEW.executed_at >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END,
        CASE WHEN NEW.matched AND NEW.executed_at::date = CURRENT_DATE THEN 1 ELSE 0 END,
        CASE WHEN NEW.matched AND NEW.executed_at >= date_trunc('week', CURRENT_DATE) THEN 1 ELSE 0 END,
        CASE WHEN NEW.matched AND NEW.executed_at >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END,
        CASE WHEN NEW.matched THEN 1.0 ELSE 0.0 END,
        NOW()
    )
    ON CONFLICT (user_id, rule_id)
    DO UPDATE SET
        total_executions = rule_performance.total_executions + 1,
        total_matches = rule_performance.total_matches + CASE WHEN NEW.matched THEN 1 ELSE 0 END,
        total_labels_applied = rule_performance.total_labels_applied + CASE WHEN NEW.matched THEN COALESCE(array_length(NEW.labels_applied, 1), 0) ELSE 0 END,
        last_execution_at = NEW.executed_at,
        executions_today = CASE 
            WHEN NEW.executed_at::date = CURRENT_DATE THEN rule_performance.executions_today + 1 
            ELSE rule_performance.executions_today 
        END,
        executions_this_week = CASE 
            WHEN NEW.executed_at >= date_trunc('week', CURRENT_DATE) THEN rule_performance.executions_this_week + 1 
            ELSE rule_performance.executions_this_week 
        END,
        executions_this_month = CASE 
            WHEN NEW.executed_at >= date_trunc('month', CURRENT_DATE) THEN rule_performance.executions_this_month + 1 
            ELSE rule_performance.executions_this_month 
        END,
        matches_today = CASE 
            WHEN NEW.matched AND NEW.executed_at::date = CURRENT_DATE THEN rule_performance.matches_today + 1 
            ELSE rule_performance.matches_today 
        END,
        matches_this_week = CASE 
            WHEN NEW.matched AND NEW.executed_at >= date_trunc('week', CURRENT_DATE) THEN rule_performance.matches_this_week + 1 
            ELSE rule_performance.matches_this_week 
        END,
        matches_this_month = CASE 
            WHEN NEW.matched AND NEW.executed_at >= date_trunc('month', CURRENT_DATE) THEN rule_performance.matches_this_month + 1 
            ELSE rule_performance.matches_this_month 
        END,
        match_rate = CASE 
            WHEN (rule_performance.total_executions + 1) > 0 
            THEN (rule_performance.total_matches + CASE WHEN NEW.matched THEN 1 ELSE 0 END)::decimal / (rule_performance.total_executions + 1)
            ELSE 0 
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update performance metrics
CREATE TRIGGER update_rule_performance_trigger
    AFTER INSERT ON rule_execution_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_rule_performance_metrics();

-- Function to reset daily/weekly/monthly counters (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION reset_rule_performance_counters()
RETURNS void AS $$
BEGIN
    -- Reset daily counters
    UPDATE rule_performance 
    SET executions_today = 0, matches_today = 0
    WHERE last_execution_at::date < CURRENT_DATE;
    
    -- Reset weekly counters
    UPDATE rule_performance 
    SET executions_this_week = 0, matches_this_week = 0
    WHERE last_execution_at < date_trunc('week', CURRENT_DATE);
    
    -- Reset monthly counters
    UPDATE rule_performance 
    SET executions_this_month = 0, matches_this_month = 0
    WHERE last_execution_at < date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql; 