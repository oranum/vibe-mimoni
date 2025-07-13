'use client'

import { useState } from 'react'
import SignUpForm from './SignUpForm'
import LoginForm from './LoginForm'
import PasswordResetForm from './PasswordResetForm'

type AuthMode = 'login' | 'signup' | 'reset'

interface AuthContainerProps {
  initialMode?: AuthMode
  onSuccess?: () => void
}

export default function AuthContainer({ initialMode = 'login', onSuccess }: AuthContainerProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const handleAuthSuccess = () => {
    console.log('Authentication successful!')
    onSuccess?.()
  }

  const renderAuthForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )
      case 'reset':
        return (
          <PasswordResetForm
            onSuccess={() => setMode('login')}
            onBackToLogin={() => setMode('login')}
          />
        )
      case 'login':
      default:
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setMode('signup')}
            onForgotPassword={() => setMode('reset')}
          />
        )
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {renderAuthForm()}
      </div>
    </div>
  )
} 