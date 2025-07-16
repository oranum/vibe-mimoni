import { createClient } from '@/utils/supabase/server';

export async function seedCurrencyRates() {
  const supabase = await createClient();

  // Create the currency_rates table using raw SQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS currency_rates (
      id SERIAL PRIMARY KEY,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate DECIMAL(10,6) NOT NULL,
      last_updated TIMESTAMP DEFAULT NOW(),
      UNIQUE(from_currency, to_currency)
    );
  `;

  try {
    // Execute the create table SQL - this will fail if we don't have permissions
    // but that's OK, we'll handle it gracefully
    await supabase.rpc('sql', { query: createTableSQL });
  } catch (error) {
    // If RPC doesn't work, we need to handle table creation manually
    console.log('RPC method failed, trying direct insert approach...');
  }

  // Clear existing rates first (this will fail if table doesn't exist)
  try {
    await supabase.from('currency_rates').delete().neq('id', 0);
  } catch (error) {
    console.log('Could not clear existing rates (table might not exist)');
  }

  // Insert initial currency rates
  const currencyRates = [
    { from_currency: 'USD', to_currency: 'ILS', rate: 3.60 },
    { from_currency: 'EUR', to_currency: 'ILS', rate: 3.95 },
    { from_currency: 'GBP', to_currency: 'ILS', rate: 4.50 },
    { from_currency: 'ILS', to_currency: 'USD', rate: 0.278 },
    { from_currency: 'ILS', to_currency: 'EUR', rate: 0.253 },
    { from_currency: 'ILS', to_currency: 'GBP', rate: 0.222 },
    { from_currency: 'USD', to_currency: 'EUR', rate: 0.91 },
    { from_currency: 'EUR', to_currency: 'USD', rate: 1.10 },
    { from_currency: 'USD', to_currency: 'GBP', rate: 0.80 },
    { from_currency: 'GBP', to_currency: 'USD', rate: 1.25 },
    { from_currency: 'EUR', to_currency: 'GBP', rate: 0.88 },
    { from_currency: 'GBP', to_currency: 'EUR', rate: 1.14 },
  ];

  const { error: insertError } = await supabase
    .from('currency_rates')
    .upsert(currencyRates, {
      onConflict: 'from_currency,to_currency',
      ignoreDuplicates: false
    });

  if (insertError) {
    console.error('Error inserting currency rates:', insertError);
    throw new Error(`Failed to seed currency rates: ${insertError.message}`);
  }

  // Verify the rates were inserted
  const { data: rates, error: verifyError } = await supabase
    .from('currency_rates')
    .select('*');

  if (verifyError) {
    console.error('Error verifying currency rates:', verifyError);
    throw new Error(`Failed to verify currency rates: ${verifyError.message}`);
  }

  console.log(`✅ Successfully seeded ${rates?.length || 0} currency rates`);
  return rates;
}

export async function testCurrencyConversion() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('currency_rates')
    .select('*')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'ILS')
    .single();

  if (error) {
    console.error('Test failed:', error);
    throw new Error(`Currency conversion test failed: ${error.message}`);
  }

  console.log(`✅ Currency conversion test passed! USD to ILS rate: ${data.rate}`);
  return data;
} 