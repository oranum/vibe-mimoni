'use client'

import { AuthRequired } from '@/components/auth/AuthRequired'
import { useAuth } from '@/context/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import Link from 'next/link'

export default function TransactionsPage() {
  return (
    <AuthRequired>
      <TransactionsContent />
    </AuthRequired>
  )
}

function TransactionsContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💰 Transactions</h1>
              <p className="text-sm text-gray-600">Manage your financial transactions</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">← Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Demo Notice */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">🚧 Demo Page</CardTitle>
            <CardDescription>
              This is a protected transactions page demonstrating route protection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This page is protected by the middleware we just implemented. Only authenticated users can access it.
              </p>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-medium text-green-800">✅ Authentication Status</h3>
                <p className="text-sm text-green-700 mt-1">
                  User: {user?.email} | Status: Authenticated
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-medium text-blue-800">🔒 Route Protection</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Try accessing this page while logged out - you'll be redirected to /auth with a redirectTo parameter.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Transactions</CardTitle>
            <CardDescription>
              Your latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">Sample Transaction 1 (USD)</p>
                  <p className="text-sm text-gray-600">January 15, 2024</p>
                </div>
                <div className="text-green-600 font-medium">
                  <CurrencyDisplay amount={1200.00} currency="USD" size="md" />
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">Sample Transaction 2 (EUR)</p>
                  <p className="text-sm text-gray-600">January 14, 2024</p>
                </div>
                <div className="text-red-600 font-medium">
                  <CurrencyDisplay amount={45.99} currency="EUR" size="md" />
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">Sample Transaction 3 (GBP)</p>
                  <p className="text-sm text-gray-600">January 13, 2024</p>
                </div>
                <div className="text-red-600 font-medium">
                  <CurrencyDisplay amount={120.00} currency="GBP" size="md" />
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">Sample Transaction 4 (ILS)</p>
                  <p className="text-sm text-gray-600">January 12, 2024</p>
                </div>
                <div className="text-green-600 font-medium">
                  <CurrencyDisplay amount={350.00} currency="ILS" size="md" />
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-4">
                This demo shows multi-currency transactions with automatic conversion. Configure your currency preferences in settings.
              </p>
              <Link href="/settings">
                <Button variant="outline">Currency Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 