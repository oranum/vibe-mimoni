'use client'

import { AuthRequired } from '@/components/auth/AuthRequired'
import { useAuth } from '@/context/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <AuthRequired>
      <DashboardContent />
    </AuthRequired>
  )
}

function DashboardContent() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/test-db">
                <Button variant="outline">Test Database</Button>
              </Link>
              <Button onClick={handleSignOut} variant="destructive">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">🎉 Welcome!</CardTitle>
              <CardDescription>
                You have successfully accessed a protected route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                This dashboard is protected by authentication middleware and can only be accessed by authenticated users.
              </p>
            </CardContent>
          </Card>

          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">👤 User Information</CardTitle>
              <CardDescription>
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {user?.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">User ID:</span> {user?.id}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Created:</span> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">⚡ Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/inbox">
                  <Button variant="outline" className="w-full justify-start">
                    📥 Transaction Inbox
                  </Button>
                </Link>
                <Link href="/transactions">
                  <Button variant="outline" className="w-full justify-start">
                    💰 Transactions
                  </Button>
                </Link>
                <Link href="/labels">
                  <Button variant="outline" className="w-full justify-start">
                    🏷️ Labels
                  </Button>
                </Link>
                <Link href="/rules">
                  <Button variant="outline" className="w-full justify-start">
                    🔧 Rules Engine
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full justify-start">
                    ⚙️ Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Protected Route Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">🔒 Protected Route Features</CardTitle>
            <CardDescription>
              This page demonstrates the protected route functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-medium text-green-800">✅ Authentication Required</h3>
                <p className="text-sm text-green-700 mt-1">
                  This page can only be accessed by authenticated users. Unauthenticated users are automatically redirected to the login page.
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-medium text-blue-800">🔄 Middleware Protection</h3>
                <p className="text-sm text-blue-700 mt-1">
                  The route is protected by Next.js middleware that checks authentication status before rendering the page.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                <h3 className="font-medium text-purple-800">🎯 Redirect Support</h3>
                <p className="text-sm text-purple-700 mt-1">
                  After signing in, users are automatically redirected back to the page they were trying to access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 