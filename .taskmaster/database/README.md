# Database Migration Instructions

This guide walks you through setting up the database schema for your Vibe Mimoni personal finance app.

## 📋 Prerequisites

- ✅ Supabase project created and configured
- ✅ Environment variables set up in `.env.local`
- ✅ Authentication working (test at http://localhost:3000/auth)

## 🚀 Step 1: Apply the Database Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase project dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration SQL**
   - Open the file `.taskmaster/database/001_initial_schema.sql`
   - Copy the entire contents
   - Paste it into the SQL editor

4. **Run the migration**
   - Click "Run" to execute the SQL
   - Wait for all statements to complete
   - You should see "Success. No rows returned" or similar success messages

### Option 2: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /Users/oran/Dev/vibe-mimoni

# Apply the migration
supabase db push

# Or run the SQL file directly
supabase db reset --debug
```

## 🧪 Step 2: Test the Database Setup

After applying the migration, test that everything is working:

1. **Test the database connection**
   ```bash
   # In your project directory
   npx tsx lib/database/migrate.ts
   ```

2. **Or test from within your app**
   ```typescript
   import { runDatabaseTests } from '../lib/database/migrate';
   
   // Run this in a component or page
   runDatabaseTests();
   ```

## 🔍 Step 3: Verify the Setup

The migration should have created these tables:

### Tables Created:
- **`transactions`** - Core financial transactions
- **`labels`** - Tags for categorizing transactions  
- **`transaction_labels`** - Many-to-many relationship between transactions and labels
- **`rules`** - Automation rules for auto-labeling transactions

### Security Features:
- **Row Level Security (RLS)** enabled on all tables
- **Policies** ensure users can only see their own data
- **Proper indexes** for query performance
- **Triggers** for automatic timestamp updates

## 🛠 Step 4: Create Sample Data (Optional)

To test the system with sample data:

1. **Make sure you're signed in** at http://localhost:3000/auth

2. **Run the sample data creation**:
   ```typescript
   import { createSampleData } from '../lib/database/migrate';
   
   await createSampleData();
   ```

This creates:
- 5 sample labels (Groceries, Utilities, Transportation, Entertainment, Income)
- 3 sample transactions (grocery purchase, electric bill, salary)
- Links between transactions and appropriate labels

## 🔧 Troubleshooting

### Common Issues:

**"Permission denied for table"**
- Make sure you're signed in to the application
- Check that RLS policies are applied correctly
- Verify your user authentication is working

**"Table does not exist"**
- The migration may not have run completely
- Check the Supabase dashboard for any error messages
- Try running the migration again

**"Duplicate key value violates unique constraint"**
- This usually means sample data already exists
- This is normal and can be ignored

### Testing Commands:

```bash
# Test database connection
npx tsx lib/database/migrate.ts

# Test specific functions
npx tsx -e "import { testDatabaseConnection } from './lib/database/migrate'; testDatabaseConnection()"
```

## 📊 Database Schema Overview

```sql
-- Core tables structure:
transactions (id, user_id, amount, description, date, status, ...)
labels (id, user_id, name, color, recurring, ...)
transaction_labels (transaction_id, label_id)
rules (id, user_id, name, conditions, labels_to_apply, ...)
```

## 🎯 Next Steps

Once the database is set up and tested:

1. ✅ **Database schema applied**
2. ✅ **RLS policies working**
3. ✅ **Sample data created (optional)**
4. ⏳ **Continue with Subtask 2.5: Protected Routes and Middleware**

## 📝 Notes

- All data is automatically scoped to the authenticated user
- Tables include proper created_at/updated_at timestamps
- Foreign key constraints ensure data integrity
- Indexes are optimized for common query patterns

For any issues, check the Supabase dashboard logs or run the test functions to diagnose problems. 