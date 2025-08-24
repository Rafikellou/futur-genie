'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { DirectorSignup } from '@/components/auth/DirectorSignup'
import { DirectorDashboard } from '@/components/dashboards/DirectorDashboard'
import { TeacherDashboard } from '@/components/dashboards/TeacherDashboard'
import { StudentDashboard } from '@/components/dashboards/StudentDashboard'
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Futur Génie</h1>
            <p className="text-gray-600">Plateforme éducative interactive</p>
          </div>
          
          {showDirectorSignup ? (
            <DirectorSignup onBack={() => setShowDirectorSignup(false)} />
          ) : (
            <>
              <LoginForm />
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-3">Pas encore de compte ?</p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDirectorSignup(true)}
                    className="w-full"
                  >
                    Créer une nouvelle école
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => window.location.href = '/signup'}
                    className="w-full text-sm"
                  >
                    Autres types de comptes
                  </Button>
                </div>
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
    case 'STUDENT':
      return <StudentDashboard />
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
