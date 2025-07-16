const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables - try both .env and .env.local
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

async function applyCurrencyMigration() {
  console.log('🚀 Starting currency migration...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.error('Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Check if currency_rates table exists
    console.log('📋 Checking if currency_rates table exists...');
    const { data: existingData, error: checkError } = await supabase
      .from('currency_rates')
      .select('*')
      .limit(1);
    
    if (checkError && checkError.message.includes('does not exist')) {
      console.log('⚠️  Currency tables do not exist. You need to apply the full migration first.');
      console.log('Please run the SQL migration file manually in your Supabase dashboard:');
      console.log('📁 File: .taskmaster/database/002_multi_currency_support.sql');
      process.exit(1);
    }
    
    // Step 2: Check if we already have rates
    console.log('🔍 Checking existing currency rates...');
    const { data: rates, error: ratesError } = await supabase
      .from('currency_rates')
      .select('*');
    
    if (ratesError) {
      console.error('❌ Error checking currency rates:', ratesError);
      process.exit(1);
    }
    
    if (rates && rates.length > 0) {
      console.log(`✅ Found ${rates.length} existing currency rates`);
      console.log('Currency rates already exist. Migration may have been applied already.');
      
      // Check specifically for USD to ILS
      const usdToIls = rates.find(r => r.from_currency === 'USD' && r.to_currency === 'ILS');
      if (usdToIls) {
        console.log(`💱 USD to ILS rate: ${usdToIls.rate}`);
        console.log('✅ USD to ILS conversion rate is available');
      } else {
        console.log('⚠️  USD to ILS rate not found, adding it...');
        await addMissingRates(supabase);
      }
    } else {
      console.log('📝 No currency rates found. Adding initial rates...');
      await addInitialRates(supabase);
    }
    
    console.log('🎉 Migration check complete!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

async function addInitialRates(supabase) {
  console.log('💾 Adding initial currency rates...');
  
  const rates = [
    // USD to other currencies
    { from_currency: 'USD', to_currency: 'ILS', rate: 3.60 },
    { from_currency: 'USD', to_currency: 'EUR', rate: 0.85 },
    { from_currency: 'USD', to_currency: 'GBP', rate: 0.73 },
    { from_currency: 'USD', to_currency: 'USD', rate: 1.00 },
    
    // EUR to other currencies
    { from_currency: 'EUR', to_currency: 'ILS', rate: 4.24 },
    { from_currency: 'EUR', to_currency: 'USD', rate: 1.18 },
    { from_currency: 'EUR', to_currency: 'GBP', rate: 0.86 },
    { from_currency: 'EUR', to_currency: 'EUR', rate: 1.00 },
    
    // GBP to other currencies
    { from_currency: 'GBP', to_currency: 'ILS', rate: 4.93 },
    { from_currency: 'GBP', to_currency: 'USD', rate: 1.37 },
    { from_currency: 'GBP', to_currency: 'EUR', rate: 1.16 },
    { from_currency: 'GBP', to_currency: 'GBP', rate: 1.00 },
    
    // ILS to other currencies
    { from_currency: 'ILS', to_currency: 'USD', rate: 0.28 },
    { from_currency: 'ILS', to_currency: 'EUR', rate: 0.24 },
    { from_currency: 'ILS', to_currency: 'GBP', rate: 0.20 },
    { from_currency: 'ILS', to_currency: 'ILS', rate: 1.00 }
  ];
  
  const ratesWithDate = rates.map(rate => ({
    ...rate,
    effective_date: new Date().toISOString()
  }));
  
  const { error } = await supabase
    .from('currency_rates')
    .insert(ratesWithDate);
  
  if (error) {
    console.error('❌ Error inserting currency rates:', error);
    throw error;
  }
  
  console.log(`✅ Successfully added ${rates.length} currency rates`);
}

async function addMissingRates(supabase) {
  console.log('🔧 Adding missing USD to ILS rate...');
  
  const { error } = await supabase
    .from('currency_rates')
    .insert([
      { 
        from_currency: 'USD', 
        to_currency: 'ILS', 
        rate: 3.60, 
        effective_date: new Date().toISOString() 
      }
    ]);
  
  if (error) {
    console.error('❌ Error adding USD to ILS rate:', error);
    throw error;
  }
  
  console.log('✅ Added USD to ILS conversion rate');
}

// Run the migration
if (require.main === module) {
  applyCurrencyMigration();
}

module.exports = { applyCurrencyMigration }; 