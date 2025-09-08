'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { BookOpen, LogOut, Plus, Users, BarChart3, FileText, Eye, Edit, Trash2, Loader2, Bot, Clock, TrendingUp, Target, Calendar, Send, CheckCircle, Menu, X, MessageSquare } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  getClassroomsByTeacher, 
  getQuizzesByTeacher, 
  getTeacherEngagementStats,
  publishQuiz,
  deleteQuiz,
  getUsersBySchool
} from '@/lib/database'
import { AIQuizCreator } from '@/components/teacher/AIQuizCreator'
import { TeacherAnalytics } from '@/components/teacher/TeacherAnalytics'
import { ClassroomManagement } from '@/components/teacher/ClassroomManagement'
import { ParentInvitationCard } from '@/components/teacher/ParentInvitationCard'
import { QuizManagement } from '@/components/teacher/QuizManagement'
import { ParentInvitationPrompt } from '@/components/teacher/ParentInvitationPrompt'
import { OpenWidgetComponent } from '@/components/ui/OpenWidgetComponent'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description: string | null
  level: string
  is_published: boolean
  classroom_id: string | null
  created_at: string
  published_at?: string | null
  unpublish_at?: string | null
  classroom?: {
    id: string
    name: string
    grade: string
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

interface Student {
  id: string
  classroom_id: string | null
  user: {
    id: string
    full_name: string | null
    email: string | null
  }
}

interface User {
  id: string
  email?: string
  app_metadata: {
    role: string
  }
  user_metadata: {
    full_name?: string
    classroom_id?: string
  }
}

interface Submission {
  id: string
  quiz_id: string
  student_id: string
  score: number
  total_questions: number
  created_at: string
  student: {
    id: string
    full_name: string | null
  }
}

export function TeacherDashboard() {
  const { profile, schoolName, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('ai-quiz')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitationLink, setInvitationLink] = useState<string>('')
  
  // Data state
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  
  // Real-time engagement statistics
  const [engagementStats, setEngagementStats] = useState({
    totalQuizzes: 0,
    publishedQuizzes: 0,
    draftQuizzes: 0,
    totalSubmissions: 0,
    thisWeekSubmissions: 0
  })
  
  useEffect(() => {
    if (profile?.id) {
      fetchTeacherData()
      
      // Set up interval for real-time updates every 30 seconds
      const interval = setInterval(fetchTeacherData, 30000)
      return () => clearInterval(interval)
    }
  }, [profile?.id])
  
  const fetchTeacherData = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      
      // Fetch teacher's data and engagement stats in parallel
      const [classroomsData, quizzesData, engagement] = await Promise.all([
        getClassroomsByTeacher(profile.id),
        getQuizzesByTeacher(profile.id),
        getTeacherEngagementStats(profile.id)
      ])
      
      setClassrooms(classroomsData as Classroom[])
      setQuizzes(quizzesData as Quiz[])
      setEngagementStats(engagement)
      
      // Get students (parents) for the teacher's school via server API
      const studentsData = await getUsersBySchool(profile.school_id || '')
      
      // Transform the data to match the expected Student interface
      const transformedStudents = studentsData.map((parent: any) => ({
        id: parent.id,
        classroom_id: parent.classroom_id || null,
        user: {
          id: parent.id,
          full_name: parent.full_name || null,
          email: parent.email || null,
        },
      }))
      
      setStudents(transformedStudents as Student[])
      
      // Generate invitation link if teacher has classrooms
      if (classroomsData.length > 0) {
        const classroomId = classroomsData[0].id
        setInvitationLink(`${window.location.origin}/invitation?classroom=${classroomId}&role=parent`)
      }
      
      setError(null)
    } catch (error: any) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handlePublishQuiz = async (quizId: string, currentStatus: boolean) => {
    try {
      await publishQuiz(quizId, !currentStatus)
      // Refresh quizzes data
      await fetchTeacherData()
    } catch (error: any) {
      setError('Erreur lors de la publication du quiz')
    }
  }

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le quiz "${quizTitle}" ? Cette action est irréversible.`)) {
      return
    }
    
    try {
      await deleteQuiz(quizId)
      // Refresh quizzes data
      await fetchTeacherData()
    } catch (error: any) {
      setError('Erreur lors de la suppression du quiz')
    }
  }
  
  const getQuizStats = () => {
    const totalQuizzes = quizzes.length
    const publishedQuizzes = quizzes.filter(q => q.is_published).length
    const draftQuizzes = totalQuizzes - publishedQuizzes
    
    return { totalQuizzes, publishedQuizzes, draftQuizzes }
  }
  
  const getClassroomStats = () => {
    const totalClassrooms = classrooms.length
    const totalStudents = students.length
    const averageStudentsPerClass = totalClassrooms > 0 ? Math.round(totalStudents / totalClassrooms) : 0
    
    return { totalClassrooms, totalStudents, averageStudentsPerClass }
  }
  
  // Navigation items for teacher dashboard
  const navigationItems = [
    {
      id: 'ai-quiz',
      label: 'Créer Quiz',
      icon: Bot
    },
    {
      id: 'quizzes',
      label: 'Mes Quiz',
      icon: FileText
    },
    {
      id: 'overview',
      label: 'Analyse',
      icon: TrendingUp
    },
    {
      id: 'classroom',
      label: 'Ma Classe',
      icon: Users
    },
    {
      id: 'suggestions',
      label: 'Suggestions',
      icon: MessageSquare
    }
  ]

  // Show full-screen loader only when profile is not yet available
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 data-testid="loading-spinner" className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const { totalQuizzes, publishedQuizzes, draftQuizzes } = getQuizStats()
  const { totalClassrooms, totalStudents, averageStudentsPerClass } = getClassroomStats()

  return (
    <DashboardLayout
      schoolName={schoolName || undefined}
      navigationItems={navigationItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={signOut}
      userName={profile?.full_name || undefined}
    >
      {loading && (
        <div className="mb-4 flex items-center text-sm text-gray-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement des données...
        </div>
      )}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {activeTab === 'ai-quiz' && (
        <AIQuizCreator />
      )}
      
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <TeacherAnalytics />
        </div>
      )}
      
      {activeTab === 'classroom' && (
        <ClassroomManagement />
      )}
      
      {activeTab === 'quizzes' && (
        <QuizManagement 
          quizzes={quizzes}
          onPublishQuiz={handlePublishQuiz}
          onDeleteQuiz={handleDeleteQuiz}
          onCreateQuiz={() => setActiveTab('ai-quiz')}
        />
      )}
      
      {activeTab === 'suggestions' && (
        <OpenWidgetComponent />
      )}
      
      {/* Parent Invitation Prompt */}
      <ParentInvitationPrompt
        hasParents={students.length > 0}
        invitationLink={invitationLink}
        onClose={() => {}}
      />
    </DashboardLayout>
  )
}