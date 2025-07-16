const { createClient } = require('@supabase/supabase-js');

// Load environment variables - try both .env and .env.local
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

async function createCurrencyTables() {
  console.log('🚀 Creating currency tables and seeding data...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.error('Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Create currency_rates table
    console.log('📊 Creating currency_rates table...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS currency_rates (
          id SERIAL PRIMARY KEY,
          from_currency VARCHAR(3) NOT NULL,
          to_currency VARCHAR(3) NOT NULL,
          rate DECIMAL(10, 6) NOT NULL,
          effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(from_currency, to_currency, effective_date)
        );
      `
    });
    
    if (createTableError) {
      console.error('❌ Error creating currency_rates table:', createTableError);
      console.log('ℹ️  This might be because the table already exists or RPC access is restricted.');
      console.log('Try inserting rates directly instead...');
    } else {
      console.log('✅ Currency_rates table created successfully');
    }
    
    // Step 2: Add initial currency rates
    console.log('💱 Adding initial currency rates...');
    
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
    
    const { error: insertError } = await supabase
      .from('currency_rates')
      .insert(ratesWithDate);
    
    if (insertError) {
      console.error('❌ Error inserting currency rates:', insertError);
      
      // If table doesn't exist, provide manual instructions
      if (insertError.message.includes('does not exist')) {
        console.log('\n🔧 Manual Steps Required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to the SQL Editor');
        console.log('3. Run this SQL script:');
        console.log('\n```sql');
        console.log('CREATE TABLE currency_rates (');
        console.log('  id SERIAL PRIMARY KEY,');
        console.log('  from_currency VARCHAR(3) NOT NULL,');
        console.log('  to_currency VARCHAR(3) NOT NULL,');
        console.log('  rate DECIMAL(10, 6) NOT NULL,');
        console.log('  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  UNIQUE(from_currency, to_currency, effective_date)');
        console.log(');');
        console.log('');
        console.log('-- Insert initial rates');
        console.log("INSERT INTO currency_rates (from_currency, to_currency, rate) VALUES");
        console.log("('USD', 'ILS', 3.60),");
        console.log("('USD', 'EUR', 0.85),");
        console.log("('USD', 'GBP', 0.73),");
        console.log("('USD', 'USD', 1.00),");
        console.log("('EUR', 'ILS', 4.24),");
        console.log("('EUR', 'USD', 1.18),");
        console.log("('EUR', 'GBP', 0.86),");
        console.log("('EUR', 'EUR', 1.00),");
        console.log("('GBP', 'ILS', 4.93),");
        console.log("('GBP', 'USD', 1.37),");
        console.log("('GBP', 'EUR', 1.16),");
        console.log("('GBP', 'GBP', 1.00),");
        console.log("('ILS', 'USD', 0.28),");
        console.log("('ILS', 'EUR', 0.24),");
        console.log("('ILS', 'GBP', 0.20),");
        console.log("('ILS', 'ILS', 1.00);");
        console.log('```');
        console.log('\n4. Run the script to create the table and add the rates');
        console.log('5. Then try importing your data again');
        return;
      }
      
      throw insertError;
    }
    
    console.log(`✅ Successfully added ${rates.length} currency rates`);
    
    // Step 3: Verify the rates were added
    console.log('🔍 Verifying currency rates...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('currency_rates')
      .select('from_currency, to_currency, rate')
      .eq('from_currency', 'USD')
      .eq('to_currency', 'ILS');
    
    if (verifyError) {
      console.error('❌ Error verifying rates:', verifyError);
    } else if (verifyData && verifyData.length > 0) {
      console.log(`✅ USD to ILS rate verified: ${verifyData[0].rate}`);
      console.log('🎉 Currency system is ready!');
    } else {
      console.log('⚠️  USD to ILS rate not found after insertion');
    }
    
  } catch (error) {
    console.error('❌ Error creating currency tables:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createCurrencyTables();
}

module.exports = { createCurrencyTables }; 