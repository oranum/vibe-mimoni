-- Multi-Currency Support Migration
-- This migration adds multi-currency functionality to the finance management app

-- ===============================
-- UPDATE TRANSACTIONS TABLE
-- ===============================
-- Add currency-related columns to existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'ILS';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS converted_amount NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'ILS';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_original_currency ON transactions(original_currency);
CREATE INDEX IF NOT EXISTS idx_transactions_base_currency ON transactions(base_currency);

-- ===============================
-- CURRENCY_RATES TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS currency_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(10, 6) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique currency pair for each effective date
    UNIQUE(from_currency, to_currency, effective_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_currency_rates_effective_date ON currency_rates(effective_date);

-- ===============================
-- USER_PREFERENCES TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_currency TEXT NOT NULL DEFAULT 'ILS',
    show_converted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preferences record per user
    UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ===============================
-- ENABLE ROW LEVEL SECURITY FOR NEW TABLES
-- ===============================
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ===============================
-- RLS POLICIES FOR CURRENCY_RATES
-- ===============================
-- All authenticated users can view currency rates (public data)
CREATE POLICY "Anyone can view currency rates" ON currency_rates
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only authenticated users can insert currency rates (admin function)
CREATE POLICY "Authenticated users can insert currency rates" ON currency_rates
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can update currency rates (admin function)
CREATE POLICY "Authenticated users can update currency rates" ON currency_rates
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ===============================
-- RLS POLICIES FOR USER_PREFERENCES
-- ===============================
-- Users can only see their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own preferences
CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- ===============================
-- TRIGGERS FOR UPDATED_AT
-- ===============================
-- Add trigger for user_preferences updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- SEED INITIAL CURRENCY RATES
-- ===============================
-- Insert initial currency conversion rates (static rates for MVP)
-- These rates are approximate and should be updated with real-time data later
INSERT INTO currency_rates (from_currency, to_currency, rate, effective_date) VALUES
    -- USD to other currencies
    ('USD', 'ILS', 3.60, NOW()),
    ('USD', 'EUR', 0.85, NOW()),
    ('USD', 'GBP', 0.73, NOW()),
    ('USD', 'USD', 1.00, NOW()),
    
    -- EUR to other currencies
    ('EUR', 'ILS', 4.24, NOW()),
    ('EUR', 'USD', 1.18, NOW()),
    ('EUR', 'GBP', 0.86, NOW()),
    ('EUR', 'EUR', 1.00, NOW()),
    
    -- GBP to other currencies
    ('GBP', 'ILS', 4.93, NOW()),
    ('GBP', 'USD', 1.37, NOW()),
    ('GBP', 'EUR', 1.16, NOW()),
    ('GBP', 'GBP', 1.00, NOW()),
    
    -- ILS to other currencies
    ('ILS', 'USD', 0.28, NOW()),
    ('ILS', 'EUR', 0.24, NOW()),
    ('ILS', 'GBP', 0.20, NOW()),
    ('ILS', 'ILS', 1.00, NOW())
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

-- ===============================
-- HELPER FUNCTIONS FOR CURRENCY CONVERSION
-- ===============================
-- Function to get the latest currency rate between two currencies
CREATE OR REPLACE FUNCTION get_currency_rate(from_curr TEXT, to_curr TEXT)
RETURNS NUMERIC AS $$
DECLARE
    rate_value NUMERIC;
BEGIN
    -- If same currency, return 1
    IF from_curr = to_curr THEN
        RETURN 1.0;
    END IF;
    
    -- Get the latest rate
    SELECT rate INTO rate_value
    FROM currency_rates
    WHERE from_currency = from_curr AND to_currency = to_curr
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- If direct rate not found, try inverse
    IF rate_value IS NULL THEN
        SELECT 1.0 / rate INTO rate_value
        FROM currency_rates
        WHERE from_currency = to_curr AND to_currency = from_curr
        ORDER BY effective_date DESC
        LIMIT 1;
    END IF;
    
    -- Return rate or 1 if not found (fallback)
    RETURN COALESCE(rate_value, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(amount NUMERIC, from_curr TEXT, to_curr TEXT)
RETURNS NUMERIC AS $$
BEGIN
    RETURN amount * get_currency_rate(from_curr, to_curr);
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- TRIGGER TO AUTO-CONVERT CURRENCY
-- ===============================
-- Function to automatically set converted_amount when transaction is inserted/updated
CREATE OR REPLACE FUNCTION auto_convert_transaction_currency()
RETURNS TRIGGER AS $$
BEGIN
    -- Set base_currency to ILS if not provided
    IF NEW.base_currency IS NULL THEN
        NEW.base_currency := 'ILS';
    END IF;
    
    -- Set original_currency to ILS if not provided
    IF NEW.original_currency IS NULL THEN
        NEW.original_currency := 'ILS';
    END IF;
    
    -- Calculate converted amount
    NEW.converted_amount := convert_currency(NEW.amount, NEW.original_currency, NEW.base_currency);
    
    -- Update the updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-conversion
CREATE TRIGGER auto_convert_currency_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION auto_convert_transaction_currency();

-- ===============================
-- MIGRATION COMPLETE
-- ===============================
-- This migration adds:
-- 1. Currency fields to transactions table
-- 2. Currency rates table for conversion
-- 3. User preferences table for currency settings
-- 4. RLS policies for security
-- 5. Initial currency rate data
-- 6. Helper functions for currency conversion
-- 7. Automatic currency conversion trigger 