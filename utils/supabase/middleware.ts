import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set on request for current request
            request.cookies.set(name, value)
            // Set on response for future requests
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Get pathname for routing decisions
  const { pathname } = request.nextUrl
  
  // Use getUser() for security - this authenticates with Supabase Auth server
  const { data: { user }, error } = await supabase.auth.getUser()

  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/transactions', '/labels', '/settings', '/profile']
  
  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/auth', '/test-db']
  
  // Define auth routes that should redirect to dashboard if user is already authenticated
  const authRoutes = ['/auth']
  
  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // If user is not authenticated and trying to access a protected route
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (user && isAuthRoute) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    const destination = redirectTo || '/dashboard'
    const redirectUrl = new URL(destination, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
} 