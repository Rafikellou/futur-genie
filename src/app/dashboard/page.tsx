'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { profile, loading, isNewDirector } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        // Not authenticated, redirect to login
        router.push('/')
      } else if (isNewDirector) {
        // New director needs to create a school
        router.push('/create-school')
      } else {
        // Redirect based on user role
        switch (profile.role) {
          case 'DIRECTOR':
            router.push('/director')
            break
          case 'TEACHER':
            router.push('/teacher')
            break
          case 'PARENT':
            router.push('/parent')
            break
          case 'STUDENT':
            router.push('/student')
            break
          default:
            router.push('/')
        }
      }
    }
  }, [profile, loading, isNewDirector, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirection vers votre tableau de bord...</span>
    </div>
  )
}