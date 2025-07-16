'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CurrencySetupPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const setupCurrencyRates = async () => {
    setLoading(true);
    setStatus('Setting up currency rates...');

    try {
      const response = await fetch('/api/seed-currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setStatus(`✅ ${result.message}`);
      } else {
        setStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testCurrencyConversion = async () => {
    setLoading(true);
    setStatus('Testing currency conversion...');

    try {
      const response = await fetch('/api/seed-currency', {
        method: 'GET',
      });

      const result = await response.json();

      if (result.success) {
        setStatus(`✅ ${result.message}. Rate: ${result.testResult.rate}`);
      } else {
        setStatus(`❌ Test failed: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Currency Setup Admin</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Currency Database Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This page will help you set up the currency conversion rates in your database.
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={setupCurrencyRates}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Setting up...' : 'Setup Currency Rates'}
              </Button>
              
              <Button 
                onClick={testCurrencyConversion}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test USD to ILS Conversion'}
              </Button>
            </div>
          </div>
          
          {status && (
            <div className="mt-4 p-3 bg-gray-100 rounded border">
              <p className="text-sm font-mono whitespace-pre-wrap">{status}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual SQL Setup (if needed)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            If the automated setup doesn't work, you can manually run this SQL in your Supabase dashboard:
          </p>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
{`-- Create currency_rates table
CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- Insert initial rates
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
  last_updated = NOW();`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
} 