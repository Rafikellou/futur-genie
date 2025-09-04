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
import { ensureParentInvitationLink } from '@/lib/database'

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
      const invitationData = await ensureParentInvitationLink(
        profile.classroom_id, 
        profile.school_id
      )
      setInvitation(invitationData)
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
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune classe assignée</h3>
          <p className="text-gray-600">Vous devez être assigné à une classe pour inviter des parents</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Préparation du lien d'invitation...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={ensureInvitation} className="mt-4 w-full">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!invitation) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lien disponible</h3>
          <p className="text-gray-600">Impossible de créer le lien d'invitation</p>
        </CardContent>
      </Card>
    )
  }

  const expired = isExpired(invitation.expires_at)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Lien d'Invitation Parents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant={expired ? "destructive" : "default"} className="mb-2">
              {expired ? "Expiré" : "Actif"}
            </Badge>
            <p className="text-sm text-gray-600">
              {expired 
                ? `Expiré le ${formatDate(invitation.expires_at)}`
                : `Valide jusqu'au ${formatDate(invitation.expires_at)}`
              }
            </p>
          </div>
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>

        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            Ce lien peut être utilisé par <strong>tous les parents</strong> de votre classe. 
            Il est réutilisable et ne s'épuise pas après la première utilisation.
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Lien d'invitation :</p>
          <p className="text-sm font-mono break-all bg-white p-2 rounded border">
            {getInvitationUrl()}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={copyToClipboard}
            disabled={expired}
            className="flex-1"
            variant="outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copié!' : 'Copier le lien'}
          </Button>
          
          <Button
            onClick={sendEmailInvitation}
            disabled={expired}
            className="flex-1"
            variant="outline"
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer par email
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Partagez ce lien avec tous les parents de votre classe</p>
          <p>• Chaque parent pourra créer son compte individuel</p>
          <p>• Le lien reste actif pendant 1 an</p>
        </div>
      </CardContent>
    </Card>
  )
}
