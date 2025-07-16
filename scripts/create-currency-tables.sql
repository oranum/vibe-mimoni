-- Minimal Currency Setup - Run this in Supabase SQL Editor

-- Create currency_rates table
CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write
CREATE POLICY "Allow authenticated access to currency_rates" ON currency_rates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to read (for conversion)
CREATE POLICY "Allow anonymous read on currency_rates" ON currency_rates
  FOR SELECT TO anon
  USING (true);

-- Insert currency rates
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

-- Test the setup
SELECT 'Setup complete! USD to ILS rate:' as message, rate 
FROM currency_rates 
WHERE from_currency = 'USD' AND to_currency = 'ILS'; 