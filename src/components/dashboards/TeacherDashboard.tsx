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
import { BookOpen, LogOut, Plus, Users, BarChart3, FileText, Eye, Edit, Trash2, Loader2, Bot, Clock, TrendingUp, Target, Calendar, Send, CheckCircle, Menu, X } from 'lucide-react'
import { 
  getClassroomsByTeacher, 
  getQuizzesByTeacher, 
  getTeacherEngagementStats,
  publishQuiz
} from '@/lib/database'
import { getTeacherStudents } from '@/lib/database-teacher'
import { AIQuizCreator } from '@/components/teacher/AIQuizCreator'
import { ProgressTracker } from '@/components/teacher/ProgressTracker'
import { ParentInvitationCard } from '@/components/teacher/ParentInvitationCard'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description: string | null
  level: string
  is_published: boolean
  classroom_id: string | null
  created_at: string
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
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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
      const studentsData = await getTeacherStudents()
      
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
                <div className="relative hidden sm:block">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur-md opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate">
                  Tableau de Bord
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm mt-1">
                  <span className="text-slate-300 font-medium truncate">{profile?.full_name}</span>
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
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-600/25 transition-all duration-300 hover:scale-105 px-3 sm:px-6 py-2 sm:py-3 flex-shrink-0"
            >
              <LogOut className="h-4 w-4 sm:mr-2" /> 
              <span className="hidden sm:inline">Déconnexion</span>
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
              <div className="grid grid-cols-4 gap-2">
                <button 
                  className={`px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    activeTab === 'ai-quiz' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('ai-quiz')}
                >
                  <Bot className="h-4 w-4" />
                  <span>Créer un Quiz</span>
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
                    activeTab === 'results' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50 hover:scale-102'
                  }`} 
                  onClick={() => setActiveTab('results')}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Résultats</span>
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
                        {activeTab === 'results' && 'Résultats'}
                        {activeTab === 'overview' && 'Analyse'}
                      </h2>
                      <p className="text-slate-400 text-sm">
                        {activeTab === 'ai-quiz' && 'Assistant Futur Génie'}
                        {activeTab === 'quizzes' && 'Gestion des quiz'}
                        {activeTab === 'results' && 'Analytics'}
                        {activeTab === 'overview' && 'Vue d\'ensemble'}
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
                        <div className="text-sm opacity-75">Vue d'ensemble</div>
                      </div>
                    </button>
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
                        activeTab === 'results'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => {
                        setActiveTab('results')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <BarChart3 className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Résultats</div>
                        <div className="text-sm opacity-75">Analytics</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <TabsContent value="overview" className="space-y-8">
            {/* Hero Stats Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-8">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                    Vue d'ensemble de votre activité
                  </h2>
                  <p className="text-slate-400 text-sm sm:text-base lg:text-lg">Suivez vos performances et l'engagement de vos élèves</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-white">{totalQuizzes}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                        </div>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <h3 className="text-white font-semibold text-sm sm:text-base">Quiz Créés</h3>
                        <p className="text-slate-400 text-xs sm:text-sm">Tous vos quiz confondus</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                          <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-white">{publishedQuizzes}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wide">Actifs</div>
                        </div>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <h3 className="text-white font-semibold text-sm sm:text-base">Quiz Publiés</h3>
                        <p className="text-slate-400 text-xs sm:text-sm">Disponibles aux élèves</p>
                        <div className="w-full bg-slate-600 rounded-full h-1.5 sm:h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 sm:h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${totalQuizzes > 0 ? (publishedQuizzes / totalQuizzes) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-white">{totalClassrooms}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wide">Classes</div>
                        </div>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <h3 className="text-white font-semibold text-sm sm:text-base">Classes Gérées</h3>
                        <p className="text-slate-400 text-xs sm:text-sm">Moyenne: {averageStudentsPerClass} élèves/classe</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-white">{totalStudents}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wide">Élèves</div>
                        </div>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <h3 className="text-white font-semibold text-sm sm:text-base">Élèves Total</h3>
                        <p className="text-slate-400 text-xs sm:text-sm">Dans toutes vos classes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Recent Activity */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-600/10 to-slate-500/10 rounded-2xl blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-blue-400" />
                      Activité Récente
                    </h3>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs sm:text-sm">
                      {quizzes.length} quiz
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {quizzes.slice(0, 4).map((quiz, index) => (
                      <div key={quiz.id} className="group flex items-center justify-between p-3 sm:p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-all duration-200 border border-slate-600/30 hover:border-slate-500/50">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                          <div className="relative flex-shrink-0">
                            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${quiz.is_published ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
                            <div className={`absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${quiz.is_published ? 'bg-green-400' : 'bg-yellow-400'} opacity-25 animate-ping`}></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium group-hover:text-blue-300 transition-colors text-sm sm:text-base truncate">{quiz.title}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={quiz.is_published ? 'default' : 'secondary'} className="text-xs">
                                {quiz.is_published ? 'Publié' : 'Brouillon'}
                              </Badge>
                              <span className="text-slate-400 text-xs hidden sm:inline">•</span>
                              <span className="text-slate-400 text-xs hidden sm:inline">{quiz.level}</span>
                            </div>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1.5 sm:p-2">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {quizzes.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <div className="bg-slate-700/30 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-400 text-base sm:text-lg mb-2">Aucun quiz créé</p>
                        <p className="text-slate-500 text-xs sm:text-sm">Commencez par créer votre premier quiz</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>
          
          <TabsContent value="ai-quiz">
            <AIQuizCreator />
          </TabsContent>
          
          
          <TabsContent value="quizzes">
            <div className="space-y-8">
              {/* Header Section */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
                        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Mes Quiz</h2>
                        <p className="text-slate-400 text-sm">Gérez et organisez tous vos quiz</p>
                      </div>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105"
                      onClick={() => setActiveTab('ai-quiz')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un Quiz
                    </Button>
                  </div>
                </div>
              </div>
              
              {quizzes.length === 0 ? (
                activeTab === 'quizzes' ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl overflow-hidden">
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center space-y-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl"></div>
                            <div className="relative bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-3xl p-12">
                              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <FileText className="h-10 w-10 text-white" />
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-3">Aucun quiz créé</h3>
                              <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto mb-8">
                                Commencez par créer votre premier quiz avec l'assistant Futur Génie
                              </p>
                              <Button 
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105"
                                onClick={() => setActiveTab('ai-quiz')}
                              >
                                <Plus className="h-5 w-5 mr-2" />
                                Créer mon premier quiz
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="group relative h-32">
                      <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl p-3 hover:border-slate-500/60 transition-all duration-300 h-full flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                        
                        <div className="flex-1 mb-2">
                          <h3 className="text-xs sm:text-sm font-semibold mb-1 break-words line-clamp-2 text-white">
                            {quiz.title}
                          </h3>
                          
                          <div className="flex items-center gap-1 mb-1">
                            <Badge className={`text-xs px-1.5 py-0.5 ${
                              quiz.is_published 
                                ? 'bg-green-600 text-white' 
                                : 'bg-amber-600 text-white'
                            }`}>
                              {quiz.is_published ? 'Publié' : 'Brouillon'}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-slate-400">
                            {new Date(quiz.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          {!quiz.is_published && (
                            <button 
                              onClick={() => handlePublishQuiz(quiz.id, quiz.is_published)}
                              className="flex-1 py-1 px-2 rounded-md text-xs bg-green-600 hover:bg-green-700 text-white transition-all"
                            >
                              Publier
                            </button>
                          )}
                          {quiz.is_published && (
                            <button 
                              onClick={() => handlePublishQuiz(quiz.id, quiz.is_published)}
                              className="flex-1 py-1 px-2 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all"
                            >
                              Dépublier
                            </button>
                          )}
                          <button className="py-1 px-2 rounded-md text-xs bg-slate-600 hover:bg-slate-500 text-white transition-all">
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          
          <TabsContent value="results">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                    Résultats et Analytics
                  </h2>
                  <p className="text-slate-400 text-lg">Suivez les performances de vos élèves en temps réel</p>
                </div>
                <ProgressTracker />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}