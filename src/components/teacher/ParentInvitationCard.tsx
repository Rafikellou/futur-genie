'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Copy, 
  Mail, 
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface InvitationLink {
  id: string
  token: string
  school_id: string
  classroom_id: string
  intended_role: string
  expires_at: string
  created_at: string
  used_at: string | null
}

export function ParentInvitationCard() {
  const { profile } = useAuth()
  const [invitation, setInvitation] = useState<InvitationLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (profile?.classroom_id && profile?.school_id) {
      ensureInvitation()
    }
  }, [profile?.classroom_id, profile?.school_id])

  const ensureInvitation = async () => {
    if (!profile?.classroom_id || !profile?.school_id) return

    try {
      setLoading(true)
      
      // Get Supabase client and session
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session')
      }

      // Call teacher invitation API
      const response = await fetch('/api/teacher/invitation', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get invitation link')
      }

      const { invitation } = await response.json()
      setInvitation(invitation)
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la création du lien d\'invitation')
    } finally {
      setLoading(false)
    }
  }

  const getInvitationUrl = () => {
    if (!invitation) return ''
    return `${window.location.origin}/signup?token=${invitation.token}`
  }

  const copyToClipboard = async () => {
    const url = getInvitationUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const sendEmailInvitation = () => {
    const url = getInvitationUrl()
    const subject = 'Invitation à rejoindre Futur-Genie'
    const body = `Bonjour,

Vous êtes invité(e) à rejoindre la plateforme Futur-Genie pour suivre les progrès de votre enfant.

Cliquez sur le lien suivant pour créer votre compte :
${url}

Ce lien est réutilisable et peut être partagé avec tous les parents de la classe.

Cordialement,
L'équipe enseignante`

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!profile?.classroom_id) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/10 to-slate-500/10 rounded-2xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8">
          <div className="text-center">
            <div className="bg-slate-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Aucune classe assignée</h3>
            <p className="text-slate-400">Vous devez être assigné à une classe pour inviter des parents</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-blue-400" />
            <span className="text-white font-medium">Préparation du lien d'invitation...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-600/10 rounded-2xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8">
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={ensureInvitation} 
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-600/25 transition-all duration-300 hover:scale-105"
          >
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-red-600/10 rounded-2xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8">
          <div className="text-center">
            <div className="bg-orange-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Aucun lien disponible</h3>
            <p className="text-slate-400">Impossible de créer le lien d'invitation</p>
          </div>
        </div>
      </div>
    )
  }

  const expired = isExpired(invitation.expires_at)

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-3xl"></div>
      <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Lien d'Invitation Parents</h3>
              <p className="text-slate-400">Partagez avec tous les parents de votre classe</p>
            </div>
          </div>
          
          <div className="text-right">
            <Badge 
              variant={expired ? "destructive" : "default"} 
              className={`mb-2 ${expired ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}
            >
              {expired ? "Expiré" : "Actif"}
            </Badge>
            <p className="text-sm text-slate-400">
              {expired 
                ? `Expiré le ${formatDate(invitation.expires_at)}`
                : `Valide jusqu'au ${formatDate(invitation.expires_at)}`
              }
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-500/50 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-500/20 rounded-lg p-2 mt-1">
                <ExternalLink className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Lien réutilisable</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Ce lien peut être utilisé par <span className="font-semibold text-blue-400">tous les parents</span> de votre classe. 
                  Il est réutilisable et ne s'épuise pas après la première utilisation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* URL Display */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/10 to-slate-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-gradient-to-r from-slate-700/30 to-slate-600/30 border border-slate-500/30 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-3 font-medium">Lien d'invitation :</p>
            <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4">
              <p className="text-sm font-mono text-slate-200 break-all leading-relaxed">
                {getInvitationUrl()}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={copyToClipboard}
            disabled={expired}
            className={`group relative overflow-hidden ${
              copied 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            } text-white border-0 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105 py-3`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center space-x-2">
              {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              <span className="font-semibold">{copied ? 'Copié!' : 'Copier le lien'}</span>
            </div>
          </Button>
          
          <Button
            onClick={sendEmailInvitation}
            disabled={expired}
            className="group relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white border-0 shadow-lg shadow-slate-600/25 transition-all duration-300 hover:scale-105 py-3"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center space-x-2">
              <Mail className="h-5 w-5" />
              <span className="font-semibold">Envoyer par email</span>
            </div>
          </Button>
        </div>

        {/* Instructions */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-slate-500/5 rounded-xl blur-lg"></div>
          <div className="relative bg-slate-700/20 border border-slate-600/30 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <div className="bg-blue-500/20 rounded-lg p-1 mr-3">
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
              Instructions d'utilisation
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Partagez ce lien avec tous les parents de votre classe</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Chaque parent pourra créer son compte individuel</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Le lien reste actif pendant 1 an</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
