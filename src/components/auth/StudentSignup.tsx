'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, BookOpen, CheckCircle } from 'lucide-react'
import { getInvitationLinkByToken } from '@/lib/database'

interface StudentSignupProps {
  token?: string
  onBack?: () => void
}

export function StudentSignup({ token, onBack }: StudentSignupProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    birthDate: ''
  })
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(!!token)
  const [error, setError] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<any>(null)
  
  const { signUp } = useAuth()

  useEffect(() => {
    if (token) {
      validateInvitationToken()
    }
  }, [token])

  const validateInvitationToken = async () => {
    try {
      const invitation = await getInvitationLinkByToken(token!)
      setInvitationData(invitation)
    } catch (error: any) {
      setError('Lien d\'invitation invalide ou expiré')
    } finally {
      setValidatingToken(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Veuillez remplir tous les champs obligatoires')
      return false
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return false
    }
    
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      await signUp(formData.email, formData.password, {
        role: 'STUDENT',
        school_id: invitationData?.school_id || null,
        full_name: formData.fullName,
        invitation_token: token
      })
      
      // Success - user will be redirected automatically by auth context
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Validation de l'invitation...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (token && !invitationData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertDescription>{error}</AlertDescription>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Retour
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Inscription Élève</CardTitle>
        <CardDescription>
          {invitationData ? 
            `Rejoins ${invitationData.school.name}` : 
            'Crée ton compte élève'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitationData && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Invitation valide pour {invitationData.school.name}
              {invitationData.classroom && ` - Classe ${invitationData.classroom.name} (${invitationData.classroom.grade})`}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet *</Label>
            <Input
              id="fullName"
              placeholder="Ton nom complet"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="ton.email@exemple.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="birthDate">Date de naissance (optionnel)</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
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
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer mon compte
          </Button>
        </form>
        
        {onBack && (
          <div className="text-center mt-4">
            <Button
              type="button"
              variant="link"
              onClick={onBack}
              className="text-sm"
              disabled={loading}
            >
              Retour
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}