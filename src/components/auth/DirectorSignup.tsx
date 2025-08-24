'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, School } from 'lucide-react'
import { createSchool } from '@/lib/database'

interface DirectorSignupProps {
  onBack?: () => void
}

export function DirectorSignup({ onBack }: DirectorSignupProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    schoolName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { signUp } = useAuth()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.fullName) {
        setError('Veuillez remplir tous les champs')
        return
      }
    }
    setError(null)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.schoolName) {
      setError('Le nom de l\'école est requis')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First create the school
      const school = await createSchool(formData.schoolName)
      
      // Then create the director account
      await signUp(formData.email, formData.password, {
        role: 'DIRECTOR',
        school_id: school.id,
        full_name: formData.fullName
      })
      
      // Success - user will be redirected automatically by auth context
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <School className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Création d'École</CardTitle>
        <CardDescription>
          {step === 1 ? 'Créez votre compte directeur' : 'Configurez votre école'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                placeholder="Votre nom complet"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@ecole.fr"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button onClick={handleNextStep} className="w-full" disabled={loading}>
              Continuer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">Nom de l'école</Label>
              <Input
                id="schoolName"
                placeholder="École Primaire Jean Moulin"
                value={formData.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
                disabled={loading}
              >
                Retour
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer l'école
              </Button>
            </div>
          </form>
        )}
        
        {onBack && (
          <div className="text-center mt-4">
            <Button
              type="button"
              variant="link"
              onClick={onBack}
              className="text-sm"
              disabled={loading}
            >
              Retour à la connexion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}