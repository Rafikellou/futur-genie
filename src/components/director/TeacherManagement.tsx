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
import { Users, BookOpen, UserPlus, Mail, Edit, Trash2, Plus, Loader2 } from 'lucide-react'
import { getUsersBySchool, getClassroomsBySchool, updateClassroom } from '@/lib/database'
import { updateUserClassroom, removeUserFromClassroom } from '@/lib/user-management'

interface Teacher {
  id: string
  full_name: string | null
  email: string | null
  assignedClassrooms: Classroom[]
}

interface Classroom {
  id: string
  name: string
  grade: string
  school_id: string
  teacher_id: string | null
  created_at: string
}

interface AssignmentData {
  teacherId: string
  classroomId: string
}

export function TeacherManagement() {
  const { profile } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [assignmentData, setAssignmentData] = useState<AssignmentData>({
    teacherId: '',
    classroomId: ''
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
      const [usersData, classroomsData] = await Promise.all([
        getUsersBySchool(profile.school_id),
        getClassroomsBySchool(profile.school_id)
      ])
      
      // Filter teachers and attach their assigned classrooms
      const teachersData = (usersData as any[])
        .filter(user => user.role === 'TEACHER')
        .map(teacher => ({
          ...teacher,
          assignedClassrooms: (classroomsData as Classroom[]).filter(
            classroom => classroom.teacher_id === teacher.id
          )
        }))
      
      setTeachers(teachersData)
      setClassrooms(classroomsData as Classroom[])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignmentData.teacherId || !assignmentData.classroomId) return

    setSaving(true)
    try {
      // Update teacher's classroom_id directly in users table
      await updateUserClassroom(assignmentData.teacherId, assignmentData.classroomId)
      
      // Refresh data
      await fetchData()
      
      // Reset form
      setAssignmentData({ teacherId: '', classroomId: '' })
      setShowAssignDialog(false)
      setSelectedTeacher(null)
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'assignation')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveFromClassroom = async (teacherId: string, classroomId: string) => {
    setSaving(true)
    try {
      await removeUserFromClassroom(teacherId)
      
      // Refresh data
      await fetchData()
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression')
    } finally {
      setSaving(false)
    }
  }

  const getUnassignedClassrooms = () => {
    return classrooms.filter(classroom => !classroom.teacher_id)
  }

  // Calculate statistics
  const totalTeachers = teachers.length
  const teachersWithClasses = teachers.filter(teacher => teacher.assignedClassrooms.length > 0).length
  const teachersWithoutClasses = totalTeachers - teachersWithClasses
  const unassignedClassrooms = getUnassignedClassrooms().length

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
          <h2 className="text-2xl font-bold">Gestion des Enseignants</h2>
          <p className="text-gray-600">Gérez votre équipe pédagogique et les assignations de classes</p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Assigner une Classe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assigner un enseignant à une classe</DialogTitle>
                <DialogDescription>
                  Sélectionnez un enseignant et une classe pour créer l'assignation
                </DialogDescription>
              </DialogHeader>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleAssignClassroom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher">Enseignant</Label>
                  <Select 
                    value={assignmentData.teacherId} 
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, teacherId: value }))}
                    required
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un enseignant" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name} ({teacher.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="classroom">Classe</Label>
                  <Select 
                    value={assignmentData.classroomId} 
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, classroomId: value }))}
                    required
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUnassignedClassrooms().map(classroom => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name} ({classroom.grade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAssignDialog(false)}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assigner
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Inviter un Enseignant
          </Button>
        </div>
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
              <Users className="h-5 w-5 mr-2" />
              Total Enseignants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
            <p className="text-gray-600 text-sm">dans votre école</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Avec Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teachersWithClasses}</div>
            <p className="text-gray-600 text-sm">enseignants assignés</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Sans Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{teachersWithoutClasses}</div>
            <p className="text-gray-600 text-sm">en attente d'assignation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Classes Libres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unassignedClassrooms}</div>
            <p className="text-gray-600 text-sm">sans enseignant</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Teachers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun enseignant</h3>
                <p className="text-gray-600 mb-4">Commencez par inviter vos premiers enseignants</p>
                <Button>
                  <Mail className="h-4 w-4 mr-2" />
                  Inviter un enseignant
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          teachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{teacher.full_name}</CardTitle>
                    <p className="text-sm text-gray-600">{teacher.email}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-2">Classes assignées:</div>
                    {teacher.assignedClassrooms.length > 0 ? (
                      <div className="space-y-2">
                        {teacher.assignedClassrooms.map((classroom) => (
                          <div key={classroom.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div>
                              <Badge variant="outline">
                                {classroom.name} ({classroom.grade})
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromClassroom(teacher.id, classroom.id)}
                              disabled={saving}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">Aucune classe assignée</div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedTeacher(teacher)
                        setAssignmentData(prev => ({ ...prev, teacherId: teacher.id }))
                        setShowAssignDialog(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Assigner
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Warning for unassigned classrooms */}
      {unassignedClassrooms > 0 && (
        <Alert>
          <AlertDescription>
            <strong>{unassignedClassrooms} classe(s)</strong> n'ont pas encore d'enseignant assigné. 
            Utilisez le bouton "Assigner une Classe" pour les attribuer.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}