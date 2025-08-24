'use client'

import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/database'
import { Loader2 } from 'lucide-react'

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
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return fallback
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return fallback
  }

  return <>{children}</>
}