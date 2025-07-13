'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { runDatabaseTests, createSampleData } from '../../lib/database/migrate';
import { useAuth, useAuthLoading } from '../../context/auth';

export default function TestDatabasePage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();
  const isLoading = useAuthLoading();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runTests = async () => {
    setIsRunning(true);
    clearResults();
    
    try {
      addResult('🚀 Starting database tests...');
      
      // Create a custom logger that doesn't interfere with console
      const logger = {
        log: (message: string) => {
          addResult(message);
        },
        error: (message: string, error?: any) => {
          addResult(`❌ ${message}${error ? `: ${error}` : ''}`);
        }
      };
      
      // Use a modified version of the test function
      const success = await runDatabaseTestsWithLogger(logger);
      
      if (success) {
        addResult('✅ All tests passed! Database is ready.');
      } else {
        addResult('❌ Some tests failed. Check the logs above.');
      }
      
    } catch (error) {
      addResult(`❌ Error running tests: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const createSampleDataHandler = async () => {
    setIsRunning(true);
    
    try {
      addResult('🔄 Creating sample data...');
      
      const logger = {
        log: (message: string) => {
          addResult(message);
        },
        error: (message: string, error?: any) => {
          addResult(`❌ ${message}${error ? `: ${error}` : ''}`);
        }
      };
      
      const success = await createSampleDataWithLogger(logger);
      
      if (success) {
        addResult('✅ Sample data created successfully!');
      } else {
        addResult('❌ Failed to create sample data. Check the logs above.');
      }
      
    } catch (error) {
      addResult(`❌ Error creating sample data: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🧪 Database Test Suite</CardTitle>
            <CardDescription>
              Test your Supabase database connection, tables, and Row Level Security policies
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🔐 Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-green-700">Signed in as: {user.email}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-red-700">
                  Not signed in - <a href="/auth" className="underline text-blue-600">Sign in here</a>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🚀 Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? 'Running...' : 'Run Database Tests'}
              </Button>
              
              <Button 
                onClick={createSampleDataHandler} 
                disabled={isRunning || !user}
                variant="outline"
              >
                {isRunning ? 'Creating...' : 'Create Sample Data'}
              </Button>
              
              <Button 
                onClick={clearResults} 
                disabled={isRunning}
                variant="outline"
              >
                Clear Results
              </Button>
            </div>
            
            {!user && (
              <p className="text-sm text-amber-600">
                ⚠️ You need to be signed in to test RLS policies and create sample data
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500">No test results yet. Click "Run Database Tests" to start.</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Custom test functions that use our logger instead of console
async function runDatabaseTestsWithLogger(logger: { log: (msg: string) => void; error: (msg: string, error?: any) => void }) {
  logger.log('🧪 Running database tests...');
  
  try {
    // Import the functions we need
    const { testDatabaseConnection, verifyTables, testRLSPolicies } = await import('../../lib/database/migrate');
    
    // Test connection
    const connectionOk = await testDatabaseConnection(logger);
    if (!connectionOk) {
      logger.error('Database connection failed. Cannot continue.');
      return false;
    }
    
    // Test tables
    const tablesResult = await verifyTables(logger);
    if (!tablesResult.success) {
      logger.error('Required tables are missing. Please apply the migration first.');
      logger.log('💡 Run the SQL migration in .taskmaster/database/001_initial_schema.sql');
      return false;
    }
    
    // Test RLS policies
    const rlsResult = await testRLSPolicies(logger);
    if (!rlsResult || (typeof rlsResult === 'object' && !rlsResult.success)) {
      logger.error('RLS policies are not working correctly.');
      return false;
    }
    
    logger.log('🎉 All database tests passed!');
    return true;
    
  } catch (error) {
    logger.error('Database testing failed', error);
    return false;
  }
}

async function createSampleDataWithLogger(logger: { log: (msg: string) => void; error: (msg: string, error?: any) => void }) {
  try {
    const { createSampleData } = await import('../../lib/database/migrate');
    
    // Pass the custom logger to the createSampleData function
    const result = await createSampleData(logger);
    
    if (result) {
      return true;
    } else {
      logger.error('Failed to create sample data');
      return false;
    }
    
  } catch (error) {
    logger.error('Error creating sample data', error);
    return false;
  }
} 