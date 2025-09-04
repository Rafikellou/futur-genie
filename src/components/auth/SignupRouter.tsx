'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DirectorSignup } from './DirectorSignup'
import { TeacherSignup } from './TeacherSignup'
import { ParentSignup } from './ParentSignup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { School, GraduationCap, Users } from 'lucide-react'

interface SignupRouterProps {
  onBack?: () => void
}

export function SignupRouter({ onBack }: SignupRouterProps) {
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  
  const token = searchParams?.get('token')
  const roleParam = searchParams?.get('role')

  useEffect(() => {
    // If there's a role in the URL params, auto-select it
    if (roleParam && ['teacher', 'parent'].includes(roleParam.toLowerCase())) {
      setSelectedRole(roleParam.toLowerCase())
    }
  }, [roleParam])

  // If we have a token, validate it and determine the role
  if (token) {
    // For now, we'll assume parent invitations and force parent signup
    // TODO: Add token validation to determine actual role from invitation
    return <ParentSignup token={token} onBack={onBack} />
  }

  // Show specific signup form if role is selected
  if (selectedRole === 'director') {
    return <DirectorSignup onBack={() => setSelectedRole(null)} />
  }
  if (selectedRole === 'teacher') {
    return <TeacherSignup onBack={() => setSelectedRole(null)} />
  }
  if (selectedRole === 'parent') {
    return <ParentSignup onBack={() => setSelectedRole(null)} />
  }

  // Show role selection
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Créer un compte</h2>
        <p className="text-slate-400">
          Seuls les directeurs peuvent créer un compte sans invitation. Choisissez votre rôle.
        </p>
      </div>
      <div className="space-y-4">
        <button
          className="w-full h-16 flex items-center justify-start space-x-4 text-left p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
          onClick={() => setSelectedRole('director')}
        >
          <School className="h-6 w-6 text-blue-400" />
          <div>
            <div className="font-medium">Directeur d'école</div>
            <div className="text-sm text-slate-400">Créer une nouvelle école (sans invitation)</div>
          </div>
        </button>

        <button
          className="w-full h-16 flex items-center justify-start space-x-4 text-left p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
          onClick={() => setSelectedRole('teacher')}
        >
          <GraduationCap className="h-6 w-6 text-green-400" />
          <div>
            <div className="font-medium">Enseignant</div>
            <div className="text-sm text-slate-400">Rejoindre une école existante</div>
          </div>
        </button>

        <button
          className="w-full h-16 flex items-center justify-start space-x-4 text-left p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
          onClick={() => setSelectedRole('parent')}
        >
          <Users className="h-6 w-6 text-purple-400" />
          <div>
            <div className="font-medium">Parent</div>
            <div className="text-sm text-slate-400">Suivre la scolarité de mon enfant</div>
          </div>
        </button>

        {onBack && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors duration-200 text-sm"
            >
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}