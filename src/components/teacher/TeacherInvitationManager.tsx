'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { UserPlus, Link as LinkIcon, Copy, Mail, Calendar, Clock, Users, Loader2 } from 'lucide-react'
import { createInvitationLink, getInvitationLinksByClassroom } from '@/lib/database'

interface InvitationLink {
  id: string
  school_id: string
  classroom_id: string | null
  intended_role: 'TEACHER' | 'PARENT' | 'DIRECTOR'
  token: string
  expires_at: string
  used_at: string | null
  created_by: string
  created_at: string
  classroom?: {
    id: string
    name: string
    grade: string
  }
  creator: {
    id: string
    full_name: string | null
  }
}

interface CreateInvitationData {
  expiresInDays: number
  customMessage: string
}

export function TeacherInvitationManager() {
  const { profile } = useAuth()
  const [invitations, setInvitations] = useState<InvitationLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateInvitationData>({
    expiresInDays: 7,
    customMessage: ''
  })

  useEffect(() => {
    if (profile?.classroom_id) {
      fetchInvitations()
    }
  }, [profile?.classroom_id])

  const fetchInvitations = async () => {
    if (!profile?.classroom_id) return
    
    setLoading(true)
    try {
      const invitationsData = await getInvitationLinksByClassroom(profile.classroom_id)
      setInvitations(invitationsData as InvitationLink[])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setError('Erreur lors du chargement des invitations')
    } finally {
      setLoading(false)
    }
  }

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const calculateExpiresAt = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id || !profile?.school_id || !profile?.classroom_id) return

    setSaving(true)
    setError(null)

    try {
      const token = generateToken()
      const expiresAt = calculateExpiresAt(formData.expiresInDays)

      await createInvitationLink({
        school_id: profile.school_id,
        classroom_id: profile.classroom_id, // Always use teacher's classroom
        intended_role: 'PARENT', // Always PARENT for teachers
        token,
        expires_at: expiresAt,
        created_by: profile.id
      })

      await fetchInvitations()
      setFormData({
        expiresInDays: 7,
        customMessage: ''
      })
      setShowCreateDialog(false)
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la création du lien d\'invitation')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (invitation: InvitationLink) => {
    const url = `${window.location.origin}/signup?token=${invitation.token}&role=parent`
    
    try {
      await navigator.clipboard.writeText(url)
      setCopiedTokenId(invitation.id)
      setTimeout(() => setCopiedTokenId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getInvitationUrl = (invitation: InvitationLink) => {
    return `${window.location.origin}/signup?token=${invitation.token}&role=parent`
  }

  const sendEmailInvitation = (invitation: InvitationLink) => {
    const url = getInvitationUrl(invitation)
    const subject = `Invitation à rejoindre la classe`
    const body = `Bonjour,

Vous êtes invité(e) à rejoindre notre classe sur notre plateforme éducative.

Cliquez sur le lien suivant pour créer votre compte parent :
${url}

Ce lien expire le ${new Date(invitation.expires_at).toLocaleDateString('fr-FR')}.

${formData.customMessage ? `Message personnalisé :\n${formData.customMessage}` : ''}

Cordialement,
${profile?.full_name || 'L\'équipe enseignante'}`

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const getStatusBadge = (invitation: InvitationLink) => {
    if (invitation.used_at) {
      return <Badge variant="outline" className="bg-green-50 text-green-700">Utilisé</Badge>
    }
    if (isExpired(invitation.expires_at)) {
      return <Badge variant="destructive">Expiré</Badge>
    }
    return <Badge className="bg-blue-50 text-blue-700">Actif</Badge>
  }

  if (!profile?.classroom_id) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune classe assignée</h3>
          <p className="text-gray-600">Vous devez être assigné à une classe pour créer des invitations</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invitations Parents</h2>
          <p className="text-gray-600">Invitez les parents d'élèves à rejoindre votre classe</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvelle invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Inviter un parent</DialogTitle>
              <DialogDescription>
                Créez un lien d'invitation pour un parent d'élève de votre classe
              </DialogDescription>
            </DialogHeader>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <Label>Classe</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded border text-sm text-gray-600">
                  Votre classe
                </div>
              </div>

              <div>
                <Label>Type d'utilisateur</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded border text-sm text-gray-600">
                  Parent d'élève
                </div>
              </div>

              <div>
                <Label htmlFor="expires">Expire dans (jours)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 7 }))}
                  required
                />
              </div>

              <div>
                <Label>Message personnalisé (optionnel)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ajoutez un message personnalisé pour l'invitation..."
                  value={formData.customMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer l\'invitation'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <LinkIcon className="h-4 w-4 mr-2" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
            <p className="text-gray-600 text-sm">invitations créées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invitations.filter(inv => !inv.used_at && !isExpired(inv.expires_at)).length}
            </div>
            <p className="text-gray-600 text-sm">en attente</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Utilisées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {invitations.filter(inv => inv.used_at).length}
            </div>
            <p className="text-gray-600 text-sm">parents inscrits</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Expirées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {invitations.filter(inv => !inv.used_at && isExpired(inv.expires_at)).length}
            </div>
            <p className="text-gray-600 text-sm">liens expirés</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Invitations List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune invitation</h3>
                <p className="text-gray-600 mb-4">Créez votre première invitation pour inviter des parents</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer une invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusBadge(invitation)}
                      <Badge variant="outline">Parent</Badge>
                      {invitation.classroom && (
                        <Badge variant="secondary">
                          {invitation.classroom.name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Créé le {formatDate(invitation.created_at)}</p>
                      <p>Expire le {formatDate(invitation.expires_at)}</p>
                      {invitation.used_at && (
                        <p className="text-green-600">Utilisé le {formatDate(invitation.used_at)}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(invitation)}
                      disabled={invitation.used_at !== null || isExpired(invitation.expires_at)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copiedTokenId === invitation.id ? 'Copié!' : 'Copier'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendEmailInvitation(invitation)}
                      disabled={invitation.used_at !== null || isExpired(invitation.expires_at)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
