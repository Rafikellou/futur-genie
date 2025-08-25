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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      router.push('/')
    }
    return fallback
  }

  // Check if user is a new director and needs to create a school
  if (isNewDirector && pathname !== '/create-school') {
    // Redirect to school creation page
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
    return fallback
  }

  return <>{children}</>
}