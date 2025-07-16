-- Currency Setup Script
-- Run this in your Supabase SQL Editor

-- Create currency_rates table
CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS (Row Level Security)
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on currency_rates" ON currency_rates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anonymous access for reading (needed for conversion)
CREATE POLICY "Allow anonymous read on currency_rates" ON currency_rates
  FOR SELECT TO anon
  USING (true);

-- Insert initial currency rates
INSERT INTO currency_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'ILS', 3.60),
  ('EUR', 'ILS', 3.95),
  ('GBP', 'ILS', 4.50),
  ('ILS', 'USD', 0.278),
  ('ILS', 'EUR', 0.253),
  ('ILS', 'GBP', 0.222),
  ('USD', 'EUR', 0.91),
  ('EUR', 'USD', 1.10),
  ('USD', 'GBP', 0.80),
  ('GBP', 'USD', 1.25),
  ('EUR', 'GBP', 0.88),
  ('GBP', 'EUR', 1.14)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET 
  rate = EXCLUDED.rate,
  last_updated = NOW();

-- Create user_preferences table for currency settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_currency TEXT NOT NULL DEFAULT 'ILS',
  show_converted_amounts BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add currency fields to transactions table if they don't exist
DO $$
BEGIN
  -- Add currency column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'transactions' AND column_name = 'currency') THEN
    ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'ILS';
  END IF;
  
  -- Add original_amount and original_currency for converted transactions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'transactions' AND column_name = 'original_amount') THEN
    ALTER TABLE transactions ADD COLUMN original_amount DECIMAL(15,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'transactions' AND column_name = 'original_currency') THEN
    ALTER TABLE transactions ADD COLUMN original_currency TEXT;
  END IF;
END $$;

-- Create helper functions
CREATE OR REPLACE FUNCTION get_currency_rate(from_curr TEXT, to_curr TEXT)
RETURNS DECIMAL(10,6) AS $$
DECLARE
  rate_value DECIMAL(10,6);
BEGIN
  -- If same currency, return 1
  IF from_curr = to_curr THEN
    RETURN 1.0;
  END IF;
  
  -- Get direct rate
  SELECT rate INTO rate_value 
  FROM currency_rates 
  WHERE from_currency = from_curr AND to_currency = to_curr;
  
  IF rate_value IS NOT NULL THEN
    RETURN rate_value;
  END IF;
  
  -- If no direct rate, try inverse
  SELECT 1.0 / rate INTO rate_value 
  FROM currency_rates 
  WHERE from_currency = to_curr AND to_currency = from_curr;
  
  IF rate_value IS NOT NULL THEN
    RETURN rate_value;
  END IF;
  
  -- If no rate found, raise exception
  RAISE EXCEPTION 'No conversion rate found for % to %', from_curr, to_curr;
END;
$$ LANGUAGE plpgsql;

-- Create conversion helper function
CREATE OR REPLACE FUNCTION convert_currency(amount DECIMAL(15,2), from_curr TEXT, to_curr TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  rate_value DECIMAL(10,6);
BEGIN
  rate_value := get_currency_rate(from_curr, to_curr);
  RETURN ROUND(amount * rate_value, 2);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically convert amounts when needed
CREATE OR REPLACE FUNCTION auto_convert_transaction_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- If original_currency is set and different from currency, store conversion
  IF NEW.original_currency IS NOT NULL AND NEW.original_currency != NEW.currency THEN
    NEW.amount := convert_currency(NEW.original_amount, NEW.original_currency, NEW.currency);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_convert_currency_trigger ON transactions;
CREATE TRIGGER auto_convert_currency_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_convert_transaction_currency();

-- Verify the setup
SELECT 'Currency rates table created' as status;
SELECT count(*) as currency_rates_count FROM currency_rates;
SELECT 'Testing USD to ILS conversion:' as test, convert_currency(100, 'USD', 'ILS') as result;
SELECT 'Setup complete!' as status; 