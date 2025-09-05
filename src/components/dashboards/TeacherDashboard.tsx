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
import { 
  getClassroomsByTeacher, 
  getQuizzesByTeacher, 
  getTeacherEngagementStats,
  publishQuiz,
  deleteQuiz
} from '@/lib/database'
import { getTeacherStudents } from '@/lib/database-teacher'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      
      // Get students (parents) for teacher's classroom - they are returned directly from the API
      const studentsData = await getTeacherStudents(profile.id)
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 blur-3xl"></div>
        <div className="relative bg-gradient-to-r from-slate-800/95 to-slate-700/95 backdrop-blur-sm border-b border-slate-600/50 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center space-x-3 sm:space-x-6 flex-1 min-w-0">
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl blur-md sm:blur-lg opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-slate-700 to-slate-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-500/50">
                    <Image 
                      src="/logo-principal.png" 
                      alt="Futur Génie" 
                      width={24} 
                      height={24} 
                      className="sm:w-8 sm:h-8"
                    />
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate">
                  Bienvenue {profile?.full_name}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm mt-1">
                  {schoolName && (
                    <>
                      <div className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0"></div>
                      <span className="text-blue-400 font-medium bg-blue-400/10 px-2 py-1 rounded-full border border-blue-400/20 text-xs truncate">
                        {schoolName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={signOut}
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 border-0 transition-all duration-300 px-3 sm:px-4 py-2 flex-shrink-0"
            >
              <LogOut className="h-4 w-4 sm:mr-2" /> 
              <span className="hidden sm:inline text-sm">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Desktop Navigation */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-2">
              <div className="grid grid-cols-5 gap-2">
                <button 
                  className={`px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    activeTab === 'ai-quiz' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('ai-quiz')}
                >
                  <Bot className="h-4 w-4" />
                  <span>Créer Quiz</span>
                </button>
                <button 
                  className={`px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    activeTab === 'quizzes' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('quizzes')}
                >
                  <FileText className="h-4 w-4" />
                  <span>Mes Quiz</span>
                </button>
                <button 
                  className={`px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    activeTab === 'overview' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('overview')}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Analyse</span>
                </button>
                <button 
                  className={`px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    activeTab === 'classroom' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('classroom')}
                >
                  <Users className="h-4 w-4" />
                  <span>Ma Classe</span>
                </button>
                <button 
                  className={`px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    activeTab === 'suggestions' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('suggestions')}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Suggestions</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                      {activeTab === 'ai-quiz' && <Bot className="h-5 w-5 text-white" />}
                      {activeTab === 'quizzes' && <FileText className="h-5 w-5 text-white" />}
                      {activeTab === 'results' && <BarChart3 className="h-5 w-5 text-white" />}
                      {activeTab === 'overview' && <TrendingUp className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">
                        {activeTab === 'ai-quiz' && 'Créer un Quiz'}
                        {activeTab === 'quizzes' && 'Mes Quiz'}
                        {activeTab === 'overview' && 'Analyse'}
                        {activeTab === 'classroom' && 'Ma Classe'}
                        {activeTab === 'suggestions' && 'Suggestions'}
                      </h2>
                      <p className="text-slate-400 text-sm">
                        {activeTab === 'ai-quiz' && 'Assistant Futur Génie'}
                        {activeTab === 'quizzes' && 'Gestion des quiz'}
                        {activeTab === 'overview' && 'Métriques et statistiques'}
                        {activeTab === 'classroom' && 'Gestion des élèves'}
                        {activeTab === 'suggestions' && 'Outil tiers'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50 p-2"
                    variant="outline"
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
                  </Button>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                  <div className="mt-4 space-y-2 border-t border-slate-600/50 pt-4">
                    <button
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'ai-quiz'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => {
                        setActiveTab('ai-quiz')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <Bot className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Créer un Quiz</div>
                        <div className="text-sm opacity-75">Assistant Futur Génie</div>
                      </div>
                    </button>
                    <button
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'quizzes'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => {
                        setActiveTab('quizzes')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <FileText className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Mes Quiz</div>
                        <div className="text-sm opacity-75">Gestion des quiz</div>
                      </div>
                    </button>
                    <button
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'overview'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => {
                        setActiveTab('overview')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <TrendingUp className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Analyse</div>
                        <div className="text-sm opacity-75">Métriques et statistiques</div>
                      </div>
                    </button>
                    <button
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'classroom'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => {
                        setActiveTab('classroom')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <Users className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Ma Classe</div>
                        <div className="text-sm opacity-75">Gestion des élèves</div>
                      </div>
                    </button>
                    <button
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'suggestions'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => {
                        setActiveTab('suggestions')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <MessageSquare className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Suggestions</div>
                        <div className="text-sm opacity-75">Outil tiers</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <TabsContent value="ai-quiz">
            <AIQuizCreator />
          </TabsContent>
          
          <TabsContent value="overview" className="space-y-8">
            <TeacherAnalytics />
          </TabsContent>
          
          <TabsContent value="classroom">
            <ClassroomManagement />
          </TabsContent>
          
          
          <TabsContent value="quizzes">
            <QuizManagement 
              quizzes={quizzes}
              onPublishQuiz={handlePublishQuiz}
              onDeleteQuiz={handleDeleteQuiz}
              onCreateQuiz={() => setActiveTab('ai-quiz')}
            />
          </TabsContent>
          
          
          <TabsContent value="suggestions">
            <OpenWidgetComponent />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Parent Invitation Prompt */}
      <ParentInvitationPrompt
        hasParents={students.length > 0}
        invitationLink={invitationLink}
        onClose={() => {}}
      />
    </div>
  )
}