'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { UserPlus, Link as LinkIcon, Copy, Mail, Calendar, Clock, Users, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createInvitationLink, getInvitationLinksBySchool, getClassroomsBySchool } from '@/lib/database'

interface InvitationLink {
  id: string
  school_id: string
  classroom_id: string | null
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

interface Classroom {
  id: string
  name: string
  grade: string
  school_id: string
  teacher_id: string | null
  created_at: string
}

interface CreateInvitationData {
  userType: 'TEACHER' | 'PARENT' | 'STUDENT'
  classroomId: string
  expiresInDays: number
  customMessage: string
}

export function InvitationManagement() {
  const { profile } = useAuth()
  const [invitations, setInvitations] = useState<InvitationLink[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateInvitationData>({
    userType: 'TEACHER',
    classroomId: '', // empty means no specific classroom
    expiresInDays: 7,
    customMessage: ''
  })

  useEffect(() => {
    if (profile?.school_id) {
      fetchData()
    }
  }, [profile?.school_id])

  const fetchData = async () => {
    if (!profile?.school_id) return
    
    setLoading(true)
    try {
      const [invitationsData, classroomsData] = await Promise.all([
        getInvitationLinksBySchool(profile.school_id),
        getClassroomsBySchool(profile.school_id)
      ])
      
      setInvitations(invitationsData as InvitationLink[])
      setClassrooms(classroomsData as Classroom[])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Erreur lors du chargement des données')
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

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id || !profile?.school_id) return

    setSaving(true)
    setError(null)

    try {
      const token = generateToken()
      const expiresAt = calculateExpiresAt(formData.expiresInDays)

      await createInvitationLink({
        school_id: profile.school_id,
        classroom_id: formData.classroomId || null,
        token,
        expires_at: expiresAt,
        created_by: profile.id
      })

      // Refresh data
      await fetchData()
      
      // Reset form and close dialog
      setFormData({
        userType: 'TEACHER',
        classroomId: '',
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
    const url = `${window.location.origin}/signup?token=${invitation.token}&role=${getInvitationRole(invitation)}`
    
    try {
      await navigator.clipboard.writeText(url)
      setCopiedTokenId(invitation.id)
      setTimeout(() => setCopiedTokenId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      setError('Impossible de copier le lien')
    }
  }

  const getInvitationRole = (invitation: InvitationLink) => {
    // Determine role based on classroom assignment
    if (!invitation.classroom_id) return 'teacher'
    return 'parent' // Default for classroom-specific invitations
  }

  const getInvitationUrl = (invitation: InvitationLink) => {
    return `${window.location.origin}/signup?token=${invitation.token}&role=${getInvitationRole(invitation)}`
  }

  const sendEmailInvitation = (invitation: InvitationLink) => {
    const url = getInvitationUrl(invitation)
    const subject = `Invitation à rejoindre ${profile?.school_id ? 'l\'école' : 'la plateforme'}`
    const body = `Bonjour,

Vous êtes invité(e) à rejoindre notre plateforme éducative.

Cliquez sur le lien suivant pour créer votre compte :
${url}

Ce lien expire le ${new Date(invitation.expires_at).toLocaleDateString('fr-FR')}.

${formData.customMessage ? `Message personnalisé :\n${formData.customMessage}` : ''}

Cordialement,
L'équipe pédagogique`

    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Liens d'Invitation</h2>
          <p className="text-gray-600">Créez et gérez les invitations pour enseignants, parents et élèves</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Créer une Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un lien d'invitation</DialogTitle>
              <DialogDescription>
                Générez un lien sécurisé pour inviter de nouveaux utilisateurs
              </DialogDescription>
            </DialogHeader>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label>Type d'utilisateur</Label>
                <Select 
                  value={formData.userType} 
                  onValueChange={(value: 'TEACHER' | 'PARENT' | 'STUDENT') => 
                    setFormData(prev => ({ ...prev, userType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">Enseignant</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="STUDENT">Élève</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(formData.userType === 'PARENT' || formData.userType === 'STUDENT') && (
                <div className="space-y-2">
                  <Label>Classe (optionnel)</Label>
                  <Select 
                    value={formData.classroomId || 'none'}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, classroomId: value === 'none' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune classe spécifique</SelectItem>
                      {classrooms.map(classroom => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name} ({classroom.grade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select 
                  value={formData.expiresInDays.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, expiresInDays: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 jour</SelectItem>
                    <SelectItem value="3">3 jours</SelectItem>
                    <SelectItem value="7">1 semaine</SelectItem>
                    <SelectItem value="14">2 semaines</SelectItem>
                    <SelectItem value="30">1 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Message personnalisé (optionnel)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ajoutez un message personnalisé pour l'invitation..."
                  value={formData.customMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LinkIcon className="h-5 w-5 mr-2" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
            <p className="text-gray-600 text-sm">invitations créées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invitations.filter(inv => !inv.used_at && !isExpired(inv.expires_at)).length}
            </div>
            <p className="text-gray-600 text-sm">en attente d'utilisation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Utilisées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {invitations.filter(inv => inv.used_at).length}
            </div>
            <p className="text-gray-600 text-sm">comptes créés</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
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
        {invitations.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune invitation</h3>
                <p className="text-gray-600 mb-4">Créez votre première invitation pour commencer</p>
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
                      <Badge variant="outline">
                        {getInvitationRole(invitation) === 'teacher' ? 'Enseignant' : 
                         getInvitationRole(invitation) === 'parent' ? 'Parent' : 'Élève'}
                      </Badge>
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
                      <p>Créé par {invitation.creator.full_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(invitation)}
                      disabled={invitation.used_at !== null || isExpired(invitation.expires_at)}
                    >
                      {copiedTokenId === invitation.id ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Copié!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copier
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendEmailInvitation(invitation)}
                      disabled={invitation.used_at !== null || isExpired(invitation.expires_at)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
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