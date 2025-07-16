// Migration runner for applying database migrations
// This script helps apply the multi-currency migration to the Supabase database

import { promises as fs } from 'fs';
import { join } from 'path';
import { supabase } from '../supabase';

// Load environment variables from .env.local when running directly
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

// Logger utility
const logger = {
  log: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
  },
  error: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, data || '');
  },
  success: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`, data || '');
  }
};

// Function to read SQL migration file
async function readMigrationFile(fileName: string): Promise<string> {
  try {
    const migrationPath = join(process.cwd(), '.taskmaster', 'database', fileName);
    const migrationContent = await fs.readFile(migrationPath, 'utf-8');
    return migrationContent;
  } catch (error) {
    logger.error(`Failed to read migration file: ${fileName}`, error);
    throw error;
  }
}

// Function to verify migration was applied correctly
async function verifyMigration(): Promise<boolean> {
  try {
    logger.log('🔍 Verifying migration...');
    
    // Check if new columns exist in transactions table by trying to select them
    const { data: transactionTest, error: transactionError } = await supabase
      .from('transactions')
      .select('original_currency, converted_amount, base_currency')
      .limit(1);
    
    if (transactionError) {
      logger.error('Failed to verify transactions table columns:', transactionError);
      return false;
    }
    
    // Check if new tables exist
    const { data: currencyRates, error: ratesError } = await supabase
      .from('currency_rates')
      .select('*')
      .limit(1);
    
    if (ratesError) {
      logger.error('Failed to verify currency_rates table:', ratesError);
      return false;
    }
    
    const { data: userPreferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
    
    if (preferencesError) {
      logger.error('Failed to verify user_preferences table:', preferencesError);
      return false;
    }
    
    // Check if currency rates were seeded
    const { count: ratesCount, error: countError } = await supabase
      .from('currency_rates')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      logger.error('Failed to count currency rates:', countError);
      return false;
    }
    
    logger.success(`✅ Migration verified successfully! Found ${ratesCount || 0} currency rates`);
    return true;
    
  } catch (error) {
    logger.error('❌ Migration verification failed:', error);
    return false;
  }
}

// Function to display migration instructions
async function displayMigrationInstructions(): Promise<void> {
  try {
    logger.log('📋 Migration Instructions:');
    logger.log('');
    logger.log('To apply the multi-currency migration, follow these steps:');
    logger.log('');
    logger.log('1. Open your Supabase dashboard');
    logger.log('2. Navigate to the SQL Editor');
    logger.log('3. Copy and paste the contents of:');
    logger.log('   .taskmaster/database/002_multi_currency_support.sql');
    logger.log('4. Execute the SQL migration');
    logger.log('5. Run this script again to verify the migration');
    logger.log('');
    logger.log('Alternatively, if you have the Supabase CLI installed:');
    logger.log('  supabase db reset');
    logger.log('  # Then apply both migrations in order');
    logger.log('');
    
    // Display the migration file content
    const migrationContent = await readMigrationFile('002_multi_currency_support.sql');
    logger.log('📄 Migration file content:');
    logger.log('='.repeat(50));
    console.log(migrationContent);
    logger.log('='.repeat(50));
    
  } catch (error) {
    logger.error('Failed to display migration instructions:', error);
  }
}

// Main migration function
export async function runMultiCurrencyMigration(): Promise<boolean> {
  try {
    logger.log('🎯 Starting multi-currency migration verification...');
    
    // Check database connection
    const { error: connectionError } = await supabase.auth.getSession();
    if (connectionError) {
      logger.error('Database connection failed:', connectionError);
      return false;
    }
    
    // Try to verify if migration is already applied
    const verificationSuccess = await verifyMigration();
    
    if (verificationSuccess) {
      logger.success('🎉 Multi-currency migration is already applied!');
      return true;
    } else {
      logger.log('Migration not yet applied. Displaying instructions...');
      await displayMigrationInstructions();
      return false;
    }
    
  } catch (error) {
    logger.error('❌ Migration verification failed:', error);
    return false;
  }
}

// If this file is run directly
if (require.main === module) {
  runMultiCurrencyMigration()
    .then((success) => {
      if (success) {
        logger.success('Migration is already applied!');
        process.exit(0);
      } else {
        logger.log('Please apply the migration manually and run this script again.');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('Migration runner crashed:', error);
      process.exit(1);
    });
} 