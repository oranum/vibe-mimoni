'use client'

import { useAuth } from '@/context/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthStatus() {
  const { user, loading, initialized, signOut } = useAuth()

  if (!initialized) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Initializing authentication...</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Authentication Status</CardTitle>
        <CardDescription>
          Current authentication state
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700 font-medium">✅ Signed In</p>
              <p className="text-sm text-green-600 mt-1">
                Email: {user.email}
              </p>
              <p className="text-xs text-green-500 mt-1">
                User ID: {user.id}
              </p>
            </div>
            <Button 
              onClick={signOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-700 font-medium">❌ Not Signed In</p>
            <p className="text-sm text-gray-600 mt-1">
              Use the authentication forms to sign in
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 