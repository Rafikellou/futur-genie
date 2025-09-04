'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, School } from 'lucide-react'

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
      // Utiliser la nouvelle route serveur pour signup directeur
      const res = await fetch('/api/auth/signup-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          schoolName: formData.schoolName
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Échec de la création du compte')
      }

      const { needRefresh } = await res.json()
      
      // Rafraîchir la session pour obtenir le JWT avec app_metadata
      if (needRefresh) {
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.signOut()
        await supabase.auth.signInWithPassword({ 
          email: formData.email, 
          password: formData.password 
        })
      }
      
      // Success - user will be redirected automatically by auth context
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="card-dark p-8 rounded-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <School className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Création d'École</h1>
            <p className="text-slate-400">
              {step === 1 ? 'Créez votre compte directeur' : 'Configurez votre école'}
            </p>
          </div>

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

          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300">
                  Nom complet *
                </label>
                <input
                  id="fullName"
                  placeholder="Votre nom complet"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="votre.email@ecole.fr"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
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
              
              <button 
                onClick={handleNextStep} 
                disabled={loading}
                className="w-full py-3 px-4 btn-gradient gradient-primary text-white rounded-lg font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="schoolName" className="block text-sm font-medium text-slate-300">
                  Nom de l'école *
                </label>
                <input
                  id="schoolName"
                  placeholder="École Primaire Jean Moulin"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 card-secondary border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retour
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3 px-4 btn-gradient gradient-primary text-white rounded-lg font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Créer l'école
                </button>
              </div>
            </form>
          )}
          
          {onBack && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="text-slate-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}