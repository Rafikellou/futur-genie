'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { DirectorSignup } from '@/components/auth/DirectorSignup'
import { DirectorDashboard } from '@/components/dashboards/DirectorDashboard'
import { TeacherDashboard } from '@/components/dashboards/TeacherDashboard'
import { ParentDashboard } from '@/components/dashboards/ParentDashboard'
import { Loader2, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const [showDirectorSignup, setShowDirectorSignup] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full">
          {showDirectorSignup ? (
            <DirectorSignup onBack={() => setShowDirectorSignup(false)} />
          ) : (
            <>
              <LoginForm />
              <div className="mt-6 text-center text-sm text-slate-400">
                <p>
                  Seuls les directeurs peuvent créer un compte sans invitation. Si vous êtes directeur,
                  <Button variant="link" className="px-1 text-blue-400 hover:text-blue-300" onClick={() => setShowDirectorSignup(true)}>
                    cliquez ici
                  </Button>
                  pour créer votre école.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Route to appropriate dashboard based on user role
  switch (profile.role) {
    case 'DIRECTOR':
      return <DirectorDashboard />
    case 'TEACHER':
      return <TeacherDashboard />
    case 'PARENT':
      return <ParentDashboard />
    default:
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Rôle non reconnu</h1>
            <p className="text-gray-600">Veuillez contacter l'administrateur</p>
          </div>
        </div>
      )
  }
}

