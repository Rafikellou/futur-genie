'use client'

import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/database'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [],
  fallback = <div>Accès non autorisé</div>
}: ProtectedRouteProps) {
  const { user, profile, loading, isNewDirector } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  console.log('ProtectedRoute check:', { 
    pathname, 
    loading, 
    user: !!user, 
    profile: profile ? { id: profile.id, role: profile.role } : null, 
    allowedRoles, 
    isNewDirector 
  })

  if (loading) {
    console.log('ProtectedRoute: Still loading auth state')
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    console.log('ProtectedRoute: No user or profile, redirecting to /')
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      router.push('/')
    }
    return fallback
  }

  // Check if user is a new director and needs to create a school (fallback)
  if (isNewDirector && pathname !== '/create-school') {
    console.log('ProtectedRoute: New director, redirecting to /create-school')
    // Redirect to school creation page as fallback
    if (typeof window !== 'undefined') {
      router.push('/create-school')
    }
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Redirection vers la création d'école...</span>
      </div>
    )
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    console.log('ProtectedRoute: Role not allowed', { userRole: profile.role, allowedRoles })
    return fallback
  }

  console.log('ProtectedRoute: Access granted, rendering children')
  return <>{children}</>
}