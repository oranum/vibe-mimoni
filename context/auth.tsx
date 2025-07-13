'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { AuthState, AuthContextType, AuthProviderProps } from '@/types/auth'

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: AuthProviderProps) {
  // Create SSR-compatible Supabase client
  const supabase = createClient()
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false
  })

  // Update auth state helper
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }))
  }, [])

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        updateAuthState({
          user: null,
          session: null,
          loading: false,
          initialized: true
        })
        return
      }

      updateAuthState({
        user: session?.user ?? null,
        session: session,
        loading: false,
        initialized: true
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      updateAuthState({
        user: null,
        session: null,
        loading: false,
        initialized: true
      })
    }
  }, [updateAuthState])

  // Set up auth state listener
  useEffect(() => {
    // Initialize auth state
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('Auth event:', event, session?.user?.email)

        updateAuthState({
          user: session?.user ?? null,
          session: session,
          loading: false,
          initialized: true
        })

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          // Clear any cached data here if needed
          console.log('User signed out')
        }

        // Handle sign in
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email)
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed')
        }
      }
    )

    // Cleanup subscription
    return () => subscription.unsubscribe()
  }, [initializeAuth, updateAuthState])

  // Authentication methods
  const signUp = useCallback(async (email: string, password: string) => {
    updateAuthState({ loading: true })
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        updateAuthState({ loading: false })
        return { error: error.message }
      }

      // Note: User will be null until email is verified
      updateAuthState({ loading: false })
      return {}
    } catch (error) {
      updateAuthState({ loading: false })
      return { error: 'An unexpected error occurred' }
    }
  }, [updateAuthState])

  const signIn = useCallback(async (email: string, password: string) => {
    updateAuthState({ loading: true })
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        updateAuthState({ loading: false })
        return { error: error.message }
      }

      // Auth state will be updated by the listener
      return {}
    } catch (error) {
      updateAuthState({ loading: false })
      return { error: 'An unexpected error occurred' }
    }
  }, [updateAuthState])

  const signOut = useCallback(async () => {
    updateAuthState({ loading: true })
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
      }
      
      // Auth state will be updated by the listener
    } catch (error) {
      console.error('Unexpected sign out error:', error)
      updateAuthState({ loading: false })
    }
  }, [updateAuthState])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
      }
    } catch (error) {
      console.error('Unexpected session refresh error:', error)
    }
  }, [])

  // Context value
  const value: AuthContextType = {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Custom hook for auth loading state
export function useAuthLoading(): boolean {
  const { loading, initialized } = useAuth()
  return loading || !initialized
}

// Custom hook to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { user, initialized } = useAuth()
  return initialized && !!user
}

// Custom hook to require authentication
export function useRequireAuth(): AuthContextType {
  const auth = useAuth()
  
  if (!auth.initialized) {
    throw new Error('Authentication not initialized')
  }
  
  if (!auth.user) {
    throw new Error('Authentication required')
  }
  
  return auth
} 