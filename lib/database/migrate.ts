// Database testing utility for Supabase
// This script tests that the database schema is working correctly

// Load environment variables from .env.local when running directly
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

import { supabase } from '../supabase';

// Simple and robust logging utility
const logger = {
  log: (message: string, data?: any) => {
    try {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    } catch (e) {
      // Fallback - just use basic console if available
      if (typeof window !== 'undefined' && window.console && window.console.log) {
        if (data) {
          window.console.log(message, data);
        } else {
          window.console.log(message);
        }
      }
    }
  },
  error: (message: string, data?: any) => {
    try {
      if (data) {
        console.error(message, data);
      } else {
        console.error(message);
      }
    } catch (e) {
      // Fallback - just use basic console if available
      if (typeof window !== 'undefined' && window.console && window.console.error) {
        if (data) {
          window.console.error(message, data);
        } else {
          window.console.error(message);
        }
      }
    }
  }
};

// Test database connection and tables
export async function testDatabaseConnection(customLogger?: { log: (msg: string) => void; error: (msg: string, error?: any) => void }) {
  const log = customLogger || logger;
  
  log.log('🚀 Testing database connection...');
  
  try {
    // Test basic Supabase connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      log.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    log.log('✅ Supabase connection successful');
    return true;
    
  } catch (error) {
    log.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Verify all required tables exist
export async function verifyTables(customLogger?: { log: (msg: string) => void; error: (msg: string, error?: any) => void }) {
  const log = customLogger || logger;
  
  log.log('🔍 Verifying database tables...');
  
  const tables = ['transactions', 'labels', 'transaction_labels', 'rules'];
  const results = [];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        log.error(`❌ Table '${table}' is not accessible: ${error.message}`);
        results.push({ table, exists: false, error: error.message });
      } else {
        log.log(`✅ Table '${table}' is accessible`);
        results.push({ table, exists: true });
      }
    } catch (error) {
      log.error(`❌ Failed to check table '${table}': ${(error as Error).message}`);
      results.push({ table, exists: false, error: (error as Error).message });
    }
  }
  
  const allTablesExist = results.every(result => result.exists);
  
  if (allTablesExist) {
    log.log('✅ All required tables are accessible!');
  } else {
    log.error('❌ Some tables are missing or inaccessible');
    log.log('Missing tables: ' + results.filter(r => !r.exists).map(r => r.table).join(', '));
  }
  
  return { success: allTablesExist, results };
}

// Test RLS policies with current user
export async function testRLSPolicies(customLogger?: { log: (msg: string) => void; error: (msg: string, error?: any) => void }) {
  const log = customLogger || logger;
  
  log.log('🔒 Testing Row Level Security policies...');
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      log.error('❌ User not authenticated. Please sign in first.');
      log.log('💡 Go to http://localhost:3000/auth to sign in');
      return false;
    }
    
    log.log(`👤 Testing with user: ${user.email}`);
    
    // Test each table
    const tables = ['transactions', 'labels', 'rules'];
    const results = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          log.error(`❌ RLS test failed for '${table}': ${error.message}`);
          results.push({ table, accessible: false, error: error.message });
        } else {
          log.log(`✅ RLS working for '${table}' (returned ${data?.length || 0} rows)`);
          results.push({ table, accessible: true, rowCount: data?.length || 0 });
        }
      } catch (error) {
        log.error(`❌ RLS test error for '${table}': ${(error as Error).message}`);
        results.push({ table, accessible: false, error: (error as Error).message });
      }
    }
    
    const allAccessible = results.every(result => result.accessible);
    
    if (allAccessible) {
      log.log('✅ RLS policies are working correctly!');
    } else {
      log.error('❌ Some RLS policies are not working');
    }
    
    return { success: allAccessible, results };
    
  } catch (error) {
    log.error('❌ RLS testing failed:', error);
    return false;
  }
}

// Create sample data for testing
export async function createSampleData(customLogger?: { log: (msg: string) => void; error: (msg: string, error?: any) => void }) {
  const log = customLogger || logger;
  
  log.log('📊 Creating sample data...');
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      log.error('❌ Authentication error:', authError);
      return false;
    }
    
    if (!user) {
      log.error('❌ User not authenticated. Please sign in first.');
      return false;
    }
    
    log.log(`👤 Creating sample data for user: ${user.email}`);

    // Create sample labels
    const sampleLabels = [
      { name: 'Groceries', recurring: false, color: '#10B981', user_id: user.id },
      { name: 'Utilities', recurring: true, color: '#F59E0B', user_id: user.id },
      { name: 'Transportation', recurring: false, color: '#EF4444', user_id: user.id },
      { name: 'Entertainment', recurring: false, color: '#8B5CF6', user_id: user.id },
      { name: 'Income', recurring: false, color: '#059669', user_id: user.id },
    ];

    log.log('🏷️ Creating sample labels...');
    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .insert(sampleLabels)
      .select();

    if (labelsError) {
      // Check if error is due to duplicate names (which is okay)
      if (labelsError.code === '23505') {
        log.log('ℹ️ Some labels already exist, fetching existing labels...');
        // Get existing labels instead
        const { data: existingLabels, error: fetchError } = await supabase
          .from('labels')
          .select('*')
          .in('name', sampleLabels.map(l => l.name));
        
        if (fetchError) {
          log.error('❌ Error fetching existing labels:', fetchError);
          return false;
        }
        
        if (existingLabels && existingLabels.length > 0) {
          log.log(`✅ Using ${existingLabels.length} existing labels`);
        } else {
          log.log('⚠️ No existing labels found, this is unexpected');
        }
      } else {
        log.error('❌ Error creating labels:', labelsError);
        log.error('Error details: ' + JSON.stringify(labelsError, null, 2));
        return false;
      }
    } else {
      log.log(`✅ Created ${labels?.length || 0} sample labels`);
    }

    // Create sample transactions
    const sampleTransactions = [
      {
        amount: -45.67,
        description: 'Supermarket grocery shopping',
        date: '2024-01-15T10:30:00Z',
        source: 'bank_import',
        status: 'pending' as const,
        user_id: user.id,
      },
      {
        amount: -120.00,
        description: 'Electric bill',
        date: '2024-01-15T08:00:00Z',
        source: 'bank_import',
        status: 'pending' as const,
        user_id: user.id,
      },
      {
        amount: 3500.00,
        description: 'Salary deposit',
        date: '2024-01-01T09:00:00Z',
        source: 'bank_import',
        status: 'approved' as const,
        user_id: user.id,
      },
    ];

    log.log('💰 Creating sample transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .insert(sampleTransactions)
      .select();

    if (transError) {
      log.error('❌ Error creating transactions:', transError);
      log.error('Transaction error details: ' + JSON.stringify(transError, null, 2));
      return false;
    }

    log.log(`✅ Created ${transactions?.length || 0} sample transactions`);

    // Get labels for linking
    const { data: allLabels, error: labelsGetError } = await supabase
      .from('labels')
      .select('*');
    
    if (labelsGetError) {
      log.error('❌ Error fetching labels for linking:', labelsGetError);
      return false;
    }

    // Link some transactions to labels
    if (allLabels && transactions && allLabels.length > 0 && transactions.length > 0) {
      log.log('🔗 Linking transactions to labels...');
      
      const groceryLabel = allLabels.find(l => l.name === 'Groceries');
      const utilityLabel = allLabels.find(l => l.name === 'Utilities');
      const incomeLabel = allLabels.find(l => l.name === 'Income');
      
      const transactionLabels = [];
      if (groceryLabel && transactions[0]) {
        transactionLabels.push({ transaction_id: transactions[0].id, label_id: groceryLabel.id });
      }
      if (utilityLabel && transactions[1]) {
        transactionLabels.push({ transaction_id: transactions[1].id, label_id: utilityLabel.id });
      }
      if (incomeLabel && transactions[2]) {
        transactionLabels.push({ transaction_id: transactions[2].id, label_id: incomeLabel.id });
      }
      
      if (transactionLabels.length > 0) {
        log.log(`🔗 Attempting to link ${transactionLabels.length} transactions to labels...`);
        const { error: linkError } = await supabase
          .from('transaction_labels')
          .insert(transactionLabels);

        if (linkError) {
          log.error('❌ Error linking transactions to labels:', linkError);
          log.error('Link error details: ' + JSON.stringify(linkError, null, 2));
          return false;
        }

        log.log(`✅ Successfully linked ${transactionLabels.length} transactions to labels`);
      } else {
        log.log('⚠️ No transaction-label links could be created');
      }
    } else {
      log.log('⚠️ Skipping transaction-label linking due to missing data');
      log.log(`Labels count: ${allLabels?.length || 0}, Transactions count: ${transactions?.length || 0}`);
    }

    log.log('🎉 Sample data created successfully!');
    return true;

  } catch (error) {
    log.error('❌ Failed to create sample data:', error);
    log.error('Full error details: ' + JSON.stringify(error, null, 2));
    return false;
  }
}

// Main function to run all tests
export async function runDatabaseTests() {
  logger.log('🧪 Running database tests...\n');
  
  try {
    // Test connection
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      logger.error('❌ Database connection failed. Cannot continue.');
      return false;
    }
    
    logger.log('');
    
    // Test tables
    const { success: tablesOk } = await verifyTables();
    if (!tablesOk) {
      logger.error('❌ Required tables are missing. Please apply the migration first.');
      logger.log('💡 Run the SQL migration in .taskmaster/database/001_initial_schema.sql');
      return false;
    }
    
    logger.log('');
    
         // Test RLS policies
     const rlsResult = await testRLSPolicies();
     if (!rlsResult || (typeof rlsResult === 'object' && !rlsResult.success)) {
       logger.error('❌ RLS policies are not working correctly.');
       return false;
     }
    
    logger.log('\n🎉 All database tests passed!');
    logger.log('💡 Your database is ready for the application.');
    
    return true;
    
  } catch (error) {
    logger.error('❌ Database testing failed:', error);
    return false;
  }
}

// Functions are already exported above

// If this file is run directly
if (require.main === module) {
  runDatabaseTests();
} 