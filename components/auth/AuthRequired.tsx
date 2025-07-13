'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthLoading } from '@/context/auth'

interface AuthRequiredProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export function AuthRequired({ 
  children, 
  fallback = null, 
  redirectTo = '/auth' 
}: AuthRequiredProps) {
  const { user } = useAuth()
  const isLoading = useAuthLoading()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = window.location.pathname
      const redirectUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    }
  }, [user, isLoading, router, redirectTo])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and not loading, show fallback or redirect
  if (!user) {
    return fallback
  }

  // If authenticated, render the protected content
  return <>{children}</>
}

export default AuthRequired 