'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DirectorSignup } from './DirectorSignup'
import { TeacherSignup } from './TeacherSignup'
import { ParentSignup } from './ParentSignup'
import { StudentSignup } from './StudentSignup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { School, GraduationCap, Users, BookOpen } from 'lucide-react'

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
    if (roleParam && ['teacher', 'parent', 'student'].includes(roleParam.toLowerCase())) {
      setSelectedRole(roleParam.toLowerCase())
    }
  }, [roleParam])

  // If we have a token, try to determine the role from it or show the appropriate signup
  if (token) {
    if (selectedRole === 'teacher' || roleParam === 'teacher') {
      return <TeacherSignup token={token} onBack={onBack} />
    }
    if (selectedRole === 'parent' || roleParam === 'parent') {
      return <ParentSignup token={token} onBack={onBack} />
    }
    if (selectedRole === 'student' || roleParam === 'student') {
      return <StudentSignup token={token} onBack={onBack} />
    }
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
  if (selectedRole === 'student') {
    return <StudentSignup onBack={() => setSelectedRole(null)} />
  }

  // Show role selection
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Choisissez votre rôle pour commencer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full h-16 flex items-center justify-start space-x-4 text-left"
          onClick={() => setSelectedRole('director')}
        >
          <School className="h-6 w-6 text-blue-600" />
          <div>
            <div className="font-medium">Directeur d'école</div>
            <div className="text-sm text-gray-500">Créer une nouvelle école</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 flex items-center justify-start space-x-4 text-left"
          onClick={() => setSelectedRole('teacher')}
        >
          <GraduationCap className="h-6 w-6 text-green-600" />
          <div>
            <div className="font-medium">Enseignant</div>
            <div className="text-sm text-gray-500">Rejoindre une école existante</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 flex items-center justify-start space-x-4 text-left"
          onClick={() => setSelectedRole('parent')}
        >
          <Users className="h-6 w-6 text-purple-600" />
          <div>
            <div className="font-medium">Parent</div>
            <div className="text-sm text-gray-500">Suivre la scolarité de mon enfant</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 flex items-center justify-start space-x-4 text-left"
          onClick={() => setSelectedRole('student')}
        >
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div>
            <div className="font-medium">Élève</div>
            <div className="text-sm text-gray-500">Accéder à mes cours et quiz</div>
          </div>
        </Button>

        {onBack && (
          <div className="text-center pt-4">
            <Button
              type="button"
              variant="link"
              onClick={onBack}
              className="text-sm"
            >
              Retour à la connexion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}