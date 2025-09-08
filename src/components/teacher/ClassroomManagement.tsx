'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Copy, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getClassroomsByTeacher, getUsersBySchool, getSubmissionsByTeacher } from '@/lib/database'

interface Student {
  id: string
  child_first_name: string | null
  full_name: string | null
  classroom_id: string | null
}

interface Submission {
  id: string
  parent_id: string
  quiz_id: string
  score: number
  total_questions: number
  created_at: string
}

interface Classroom {
  id: string
  name: string
  level: string
  school_id: string
}

interface StudentStats {
  id: string
  child_first_name: string
  quizzes_completed: number
  correct_percentage: number
}

export function ClassroomManagement() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [studentStats, setStudentStats] = useState<StudentStats[]>([])
  const [invitationLink, setInvitationLink] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (profile?.id) {
      fetchClassroomData()
    }
  }, [profile?.id])

  const fetchClassroomData = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)

      const [classroomsData, studentsData, submissionsData] = await Promise.all([
        getClassroomsByTeacher(profile.id),
        getUsersBySchool(profile.school_id || ''),
        getSubmissionsByTeacher(profile.id)
      ])

      setClassrooms(classroomsData || [])
      setStudents(studentsData || [])
      setSubmissions(submissionsData || [])

      // Calculate student statistics
      const stats = calculateStudentStats(studentsData || [], submissionsData || [])
      setStudentStats(stats)

      // Generate invitation link (placeholder for now)
      if (classroomsData && classroomsData.length > 0) {
        const classroomId = classroomsData[0].id
        setInvitationLink(`${window.location.origin}/invitation?classroom=${classroomId}&role=parent`)
      }

    } catch (err) {
      console.error('Error fetching classroom data:', err)
      setError('Erreur lors du chargement des données de la classe')
    } finally {
      setLoading(false)
    }
  }

  const calculateStudentStats = (students: Student[], submissions: Submission[]): StudentStats[] => {
    return students.map(student => {
      // Filter submissions by parent_id (not user_id) since submissions table uses parent_id
      const studentSubmissions = submissions.filter(sub => sub.parent_id === student.id)
      const quizzes_completed = studentSubmissions.length
      
      let correct_percentage = 0
      if (studentSubmissions.length > 0) {
        const totalCorrect = studentSubmissions.reduce((sum, sub) => sum + sub.score, 0)
        const totalQuestions = studentSubmissions.reduce((sum, sub) => sum + sub.total_questions, 0)
        correct_percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
      }

      return {
        id: student.id,
        child_first_name: student.child_first_name || student.full_name || 'Nom non renseigné',
        quizzes_completed,
        correct_percentage
      }
    })
  }

  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const sendInvitationByEmail = () => {
    const subject = encodeURIComponent('Invitation à rejoindre Futur Génie')
    const body = encodeURIComponent(`Bonjour,\n\nVous êtes invité(e) à rejoindre la classe de votre enfant sur Futur Génie.\n\nCliquez sur ce lien pour vous inscrire :\n${invitationLink}\n\nCordialement`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">

      {/* Students List */}
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Liste des Élèves</span>
            <Badge variant="secondary" className="ml-2">
              {studentStats.length} élève{studentStats.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentStats.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">Aucun élève inscrit</p>
              <p className="text-slate-500 text-sm">Utilisez le lien d'invitation ci-dessous pour inviter des parents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentStats.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-all duration-200 border border-slate-600/30"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {student.child_first_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{student.child_first_name}</h3>
                      <p className="text-slate-400 text-sm">Élève</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-white font-semibold">{student.quizzes_completed}</div>
                      <div className="text-slate-400 text-xs">Quiz effectués</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`font-semibold ${
                        student.correct_percentage >= 80 ? 'text-green-400' :
                        student.correct_percentage >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {student.correct_percentage}%
                      </div>
                      <div className="text-slate-400 text-xs">Bonnes réponses</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation Link */}
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Lien d'Invitation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            Partagez ce lien avec les parents pour qu'ils puissent inscrire leur enfant dans votre classe.
          </p>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <code className="text-blue-400 text-sm break-all">{invitationLink}</code>
            </div>
            <Button
              onClick={copyInvitationLink}
              variant="outline"
              size="sm"
              className="bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50 text-white"
            >
              {copySuccess ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={sendInvitationByEmail}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              Envoyer par Email
            </Button>
          </div>
          
          {copySuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Lien copié dans le presse-papiers !</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
