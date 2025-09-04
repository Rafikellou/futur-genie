'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Plus, Users, Trash2, Edit, Loader2, AlertTriangle } from 'lucide-react'
import { createClassroom, getClassroomsBySchool, getUsersBySchool, updateClassroom, deleteClassroom } from '@/lib/database'
import type { Database } from '@/types/database'

type Classroom = Database['public']['Tables']['classrooms']['Row'] & {
  teacher?: { id: string; full_name: string | null; email: string | null }
}
type User = Database['public']['Tables']['users']['Row']

const GRADE_LEVELS = [
  { value: 'CP', label: 'CP' },
  { value: 'CE1', label: 'CE1' },
  { value: 'CE2', label: 'CE2' },
  { value: 'CM1', label: 'CM1' },
  { value: 'CM2', label: 'CM2' },
  { value: '6EME', label: '6ème' },
  { value: '5EME', label: '5ème' },
  { value: '4EME', label: '4ème' },
  { value: '3EME', label: '3ème' }
]

export function ClassroomManagement() {
  const { profile } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    grade: ''
  })

  useEffect(() => {
    fetchData()
  }, [profile?.school_id])

  const fetchData = async () => {
    if (!profile?.school_id) return
    
    try {
      const [classroomsData, usersData] = await Promise.all([
        getClassroomsBySchool(profile.school_id),
        getUsersBySchool(profile.school_id)
      ])
      
      setClassrooms(classroomsData as Classroom[])
      setTeachers((usersData as User[]).filter(user => user.role === 'TEACHER'))
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.school_id) return

    setCreating(true)
    setError(null)

    try {
      await createClassroom({
        name: formData.name,
        grade: formData.grade as any,
        school_id: profile.school_id
      })
      
      // Reset form and close dialog
      setFormData({ name: '', grade: '' })
      setShowCreateDialog(false)
      
      // Refresh data
      await fetchData()
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la création de la classe')
    } finally {
      setCreating(false)
    }
  }

  const openEditDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setFormData({
      name: classroom.name,
      grade: classroom.grade
    })
    setShowEditDialog(true)
    setError(null)
  }

  const handleEditClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassroom) return

    setEditing(true)
    setError(null)

    try {
      await updateClassroom(selectedClassroom.id, {
        name: formData.name,
        grade: formData.grade
      })
      
      // Reset form and close dialog
      setFormData({ name: '', grade: '' })
      setSelectedClassroom(null)
      setShowEditDialog(false)
      
      // Refresh data
      await fetchData()
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la modification de la classe')
    } finally {
      setEditing(false)
    }
  }

  const openDeleteDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setShowDeleteDialog(true)
    setError(null)
  }

  const handleDeleteClassroom = async () => {
    if (!selectedClassroom) return

    setDeleting(true)
    setError(null)

    try {
      await deleteClassroom(selectedClassroom.id)
      
      // Close dialog and reset
      setSelectedClassroom(null)
      setShowDeleteDialog(false)
      
      // Refresh data
      await fetchData()
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression de la classe')
    } finally {
      setDeleting(false)
    }
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
          <h2 className="text-2xl font-bold">Gestion des Classes</h2>
          <p className="text-gray-600">Créez et gérez les classes de votre école</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Classe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle classe</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle classe à votre école
              </DialogDescription>
            </DialogHeader>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="className">Nom de la classe</Label>
                <Input
                  id="className"
                  placeholder="ex: CP-A, CE1 Bleu"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grade">Niveau</Label>
                <Select 
                  value={formData.grade} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
                  required
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Teacher assignment handled separately via TeacherManagement */}
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer la classe
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Classroom Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la classe</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la classe
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleEditClassroom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editClassName">Nom de la classe</Label>
              <Input
                id="editClassName"
                placeholder="ex: CP-A, CE1 Bleu"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={editing}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editGrade">Niveau</Label>
              <Select 
                value={formData.grade} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
                required
                disabled={editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Teacher assignment handled separately via TeacherManagement */}
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false)
                  setFormData({ name: '', grade: '' })
                  setSelectedClassroom(null)
                }}
                disabled={editing}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={editing}>
                {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Modifier la classe
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la classe "{selectedClassroom?.name}" ?
              <br /><br />
              <strong>Cette action est irréversible.</strong> Tous les quiz associés à cette classe 
              et les données des élèves seront également affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedClassroom(null)
              }}
              disabled={deleting}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClassroom}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Classrooms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune classe</h3>
                <p className="text-gray-600 mb-4">Commencez par créer votre première classe</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une classe
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          classrooms.map((classroom) => (
            <Card key={classroom.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {classroom.grade}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(classroom)}
                      title="Modifier la classe"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openDeleteDialog(classroom)}
                      title="Supprimer la classe"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {classroom.teacher ? (
                  <div>
                    <p className="text-sm text-gray-600">Enseignant:</p>
                    <p className="font-medium">{classroom.teacher.full_name}</p>
                    <p className="text-sm text-gray-500">{classroom.teacher.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun enseignant assigné</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}