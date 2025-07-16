'use client'

import AuthContainer from '@/components/auth/AuthContainer'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthPageContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        {redirectTo && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              🔒 You need to sign in to access this page. You'll be redirected after authentication.
            </p>
          </div>
        )}
        <AuthContainer />
      </div>
    </div>
  )
}

export default function AuthPage() {
  // Note: Authenticated users are redirected by middleware before reaching this component

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthContainer />
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
} 