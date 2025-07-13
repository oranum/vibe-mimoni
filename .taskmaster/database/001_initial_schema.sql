-- Personal Finance Management App - Initial Database Schema
-- This migration creates the core tables with Row Level Security policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'approved');

-- ===============================
-- TRANSACTIONS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    identifier TEXT, -- external id for bank imports
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    source TEXT, -- bank, manual, import, etc.
    status transaction_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_user_status ON transactions(user_id, status);

-- ===============================
-- LABELS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    recurring BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#3B82F6', -- hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique label names per user
    UNIQUE(user_id, name)
);

-- Add indexes for performance
CREATE INDEX idx_labels_user_id ON labels(user_id);
CREATE INDEX idx_labels_name ON labels(user_id, name);

-- ===============================
-- TRANSACTION_LABELS TABLE (Many-to-Many)
-- ===============================
CREATE TABLE IF NOT EXISTS transaction_labels (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate label assignments
    PRIMARY KEY (transaction_id, label_id)
);

-- Add indexes for performance
CREATE INDEX idx_transaction_labels_transaction ON transaction_labels(transaction_id);
CREATE INDEX idx_transaction_labels_label ON transaction_labels(label_id);

-- ===============================
-- RULES TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    conditions JSONB NOT NULL, -- array of condition objects
    labels_to_apply UUID[] NOT NULL, -- array of label IDs
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique rule names per user
    UNIQUE(user_id, name)
);

-- Add indexes for performance
CREATE INDEX idx_rules_user_id ON rules(user_id);
CREATE INDEX idx_rules_order ON rules(user_id, order_index);
CREATE INDEX idx_rules_active ON rules(user_id, is_active);

-- ===============================
-- ENABLE ROW LEVEL SECURITY
-- ===============================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- ===============================
-- RLS POLICIES FOR TRANSACTIONS
-- ===============================
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own transactions
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own transactions
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own transactions
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- ===============================
-- RLS POLICIES FOR LABELS
-- ===============================
-- Users can only see their own labels
CREATE POLICY "Users can view own labels" ON labels
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own labels
CREATE POLICY "Users can insert own labels" ON labels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own labels
CREATE POLICY "Users can update own labels" ON labels
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own labels
CREATE POLICY "Users can delete own labels" ON labels
    FOR DELETE USING (auth.uid() = user_id);

-- ===============================
-- RLS POLICIES FOR TRANSACTION_LABELS
-- ===============================
-- Users can only see transaction-label relationships for their own transactions
CREATE POLICY "Users can view own transaction labels" ON transaction_labels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE transactions.id = transaction_labels.transaction_id 
            AND transactions.user_id = auth.uid()
        )
    );

-- Users can only insert transaction-label relationships for their own transactions
CREATE POLICY "Users can insert own transaction labels" ON transaction_labels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE transactions.id = transaction_labels.transaction_id 
            AND transactions.user_id = auth.uid()
        )
    );

-- Users can only update transaction-label relationships for their own transactions
CREATE POLICY "Users can update own transaction labels" ON transaction_labels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE transactions.id = transaction_labels.transaction_id 
            AND transactions.user_id = auth.uid()
        )
    );

-- Users can only delete transaction-label relationships for their own transactions
CREATE POLICY "Users can delete own transaction labels" ON transaction_labels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE transactions.id = transaction_labels.transaction_id 
            AND transactions.user_id = auth.uid()
        )
    );

-- ===============================
-- RLS POLICIES FOR RULES
-- ===============================
-- Users can only see their own rules
CREATE POLICY "Users can view own rules" ON rules
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own rules
CREATE POLICY "Users can insert own rules" ON rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own rules
CREATE POLICY "Users can update own rules" ON rules
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own rules
CREATE POLICY "Users can delete own rules" ON rules
    FOR DELETE USING (auth.uid() = user_id);

-- ===============================
-- TRIGGERS FOR UPDATED_AT
-- ===============================
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON labels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- SAMPLE DATA (Optional - for testing)
-- ===============================
-- Note: This will only work if there's an authenticated user
-- You can uncomment these after testing authentication

-- Insert sample labels
-- INSERT INTO labels (user_id, name, recurring, color) VALUES 
--     (auth.uid(), 'Groceries', false, '#10B981'),
--     (auth.uid(), 'Utilities', true, '#F59E0B'),
--     (auth.uid(), 'Transportation', false, '#EF4444'),
--     (auth.uid(), 'Entertainment', false, '#8B5CF6'),
--     (auth.uid(), 'Income', false, '#059669');

-- Insert sample transactions
-- INSERT INTO transactions (user_id, amount, description, date, source, status) VALUES 
--     (auth.uid(), -45.67, 'Supermarket grocery shopping', '2024-01-15 10:30:00', 'bank_import', 'pending'),
--     (auth.uid(), -120.00, 'Electric bill', '2024-01-15 08:00:00', 'bank_import', 'pending'),
--     (auth.uid(), 3500.00, 'Salary deposit', '2024-01-01 09:00:00', 'bank_import', 'approved'); 