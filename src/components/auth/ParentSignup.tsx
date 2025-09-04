'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Users, CheckCircle } from 'lucide-react'
import { getInvitationLinkByToken } from '@/lib/database'

interface ParentSignupProps {
  token?: string
  onBack?: () => void
}

export function ParentSignup({ token, onBack }: ParentSignupProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    childFirstName: '',
    phone: ''
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
    if (!formData.email || !formData.password || !formData.fullName || !formData.childFirstName) {
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
        role: 'PARENT',
        school_id: invitationData?.school_id || null,
        full_name: formData.fullName,
        child_first_name: formData.childFirstName,
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="card-dark p-8 text-center">
          <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-white text-lg">Validation de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (token && !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="card-dark p-8 text-center">
          <div className="card-secondary p-4 rounded-lg border-red-500/20 bg-red-500/10 mb-6">
            <div className="flex items-center gap-2 text-red-400 justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
          {onBack && (
            <button 
              onClick={onBack}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all duration-200"
            >
              Retour
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="card-dark p-8 rounded-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="gradient-secondary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Inscription Parent</h1>
            <p className="text-slate-400">
              {invitationData ? 
                `Rejoignez ${invitationData.school.name}` : 
                'Créez votre compte parent'
              }
            </p>
            {invitationData && (
              <div className="text-sm text-slate-300 mt-4 p-4 card-secondary rounded-lg">
                <p className="font-medium text-blue-400 mb-2">📝 Important :</p>
                <p className="text-left">• Un compte parent = un enfant</p>
                <p className="text-left">• Pour un deuxième enfant, créez un nouveau compte avec un email différent</p>
              </div>
            )}
          </div>

          {invitationData && (
            <div className="card-secondary p-4 rounded-lg border-green-500/20 bg-green-500/10 mb-6">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">
                  Invitation valide pour {invitationData.school.name}
                  {invitationData.classroom && ` - Classe ${invitationData.classroom.name}`}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="card-secondary p-4 rounded-lg border-red-500/20 bg-red-500/10 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300">
                  Votre nom complet *
                </label>
                <input
                  id="fullName"
                  placeholder="Votre nom et prénom"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="childFirstName" className="block text-sm font-medium text-slate-300">
                  Prénom de votre enfant *
                </label>
                <input
                  id="childFirstName"
                  placeholder="Prénom de l'enfant"
                  value={formData.childFirstName}
                  onChange={(e) => handleChange('childFirstName', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email *
              </label>
              <input
                id="email"
                type="email"
                placeholder="votre.email@exemple.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                Téléphone (optionnel)
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Mot de passe *
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                  Confirmer le mot de passe *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 px-4 btn-gradient gradient-secondary text-white rounded-lg font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer mon compte
            </button>
          </form>
          
          {onBack && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="text-slate-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retour
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}