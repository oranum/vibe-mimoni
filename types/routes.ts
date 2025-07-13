// Route protection types
export interface RouteConfig {
  path: string
  requiresAuth: boolean
  redirectTo?: string
  allowedRoles?: string[]
}

// Middleware route types
export interface MiddlewareRouteConfig {
  protectedRoutes: string[]
  publicRoutes: string[]
  authRoutes: string[]
}

// Auth requirement props
export interface AuthRequiredProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requiredRoles?: string[]
}

// Route protection error types
export interface RouteProtectionError {
  type: 'UNAUTHORIZED' | 'FORBIDDEN' | 'EXPIRED_SESSION'
  message: string
  redirectTo?: string
}

// Route protection status
export interface RouteProtectionStatus {
  isAuthenticated: boolean
  isAuthorized: boolean
  isLoading: boolean
  error?: RouteProtectionError
}

// Layout props for protected sections
export interface ProtectedLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showHeader?: boolean
  showFooter?: boolean
} 