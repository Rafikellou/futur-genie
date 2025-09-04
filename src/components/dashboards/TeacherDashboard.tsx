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
import { BookOpen, LogOut, Plus, Users, BarChart3, FileText, Eye, Edit, Trash2, Loader2, Bot, Clock, TrendingUp, Target, Calendar, Send, CheckCircle } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState('ai-quiz')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="card-secondary border-b-0 rounded-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              <Image 
                src="/logo-principal.png" 
                alt="Futur Génie" 
                width={40} 
                height={40} 
                className="mr-3"
              />
              <div className="gradient-accent p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tableau de Bord Enseignant</h1>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>{profile?.full_name}</span>
                {schoolName && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400 font-medium">{schoolName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="btn-gradient gradient-accent hover-lift px-4 py-2 rounded-lg text-white font-medium text-sm transition-all duration-200 flex items-center gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="card-secondary p-1 rounded-xl">
            <div className="grid grid-cols-4 gap-1">
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'ai-quiz' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('ai-quiz')}>Créer un Quiz</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'quizzes' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('quizzes')}>Mes Quiz</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'results' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('results')}>Résultats</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'overview' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('overview')}>Analyse</button>
            </div>
          </div>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card-dark gradient-primary p-6 rounded-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Quiz Créés</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{engagementStats.totalQuizzes}</div>
                <div className="text-blue-100 text-sm mb-3">
                  {engagementStats.publishedQuizzes} publiés • {engagementStats.draftQuizzes} brouillons
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${(engagementStats.publishedQuizzes / Math.max(engagementStats.totalQuizzes, 1)) * 100}%` }}></div>
                </div>
              </div>
              
              <div className="card-dark gradient-secondary p-6 rounded-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Mes Classes</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{totalClassrooms} {totalClassrooms === 1 ? 'classe' : 'classes'}</div>
                <div className="text-purple-100 text-sm mb-1">
                  {totalStudents} élèves au total
                </div>
                <div className="text-purple-100 text-xs">
                  ~{averageStudentsPerClass} élèves/classe
                </div>
              </div>
              
              <div className="card-dark gradient-accent p-6 rounded-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Soumissions</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{engagementStats.totalSubmissions}</div>
                <div className="text-green-100 text-sm mb-2">
                  {engagementStats.thisWeekSubmissions} cette semaine
                </div>
                <div className="flex items-center">
                  <Target className="h-3 w-3 mr-1 text-green-100" />
                  <span className="text-green-100 text-xs">
                    {((engagementStats.thisWeekSubmissions / Math.max(engagementStats.totalSubmissions, 1)) * 100).toFixed(1)}% récent
                  </span>
                </div>
              </div>
              
              <div className="card-dark p-6 rounded-xl hover-lift" style={{ background: 'linear-gradient(135deg, #FF7F59 0%, #FB995D 100%)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Activité</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{engagementStats.thisWeekSubmissions}</div>
                <div className="text-orange-100 text-sm mb-1">
                  Activité cette semaine
                </div>
                <div className="text-orange-100 text-xs">
                  {engagementStats.totalSubmissions > 0 ? `${engagementStats.totalSubmissions} réponses au total` : 'Aucune réponse encore'}
                </div>
              </div>
            </div>

            {/* Mes Classes Section */}
            <div className="card-dark p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Mes Classes
              </h3>
              {classrooms.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-300 mb-2">Aucune classe assignée</h4>
                  <p className="text-gray-400">Contactez votre directeur pour être assigné à une classe</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classrooms.map((classroom) => {
                    const classStudents = students.filter(s => s.classroom_id === classroom.id)
                    return (
                      <div key={classroom.id} className="card-secondary p-4 rounded-lg border border-slate-600">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-white">{classroom.name}</h4>
                          <Badge variant="outline" className="text-slate-300 border-slate-500">{classroom.grade}</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-slate-300">Élèves: {classStudents.length}</div>
                          {classStudents.length > 0 && (
                            <div className="text-xs text-slate-400">
                              {classStudents.slice(0, 3).map(s => s.user.full_name).join(', ')}
                              {classStudents.length > 3 && ` et ${classStudents.length - 3} autres`}
                            </div>
                          )}
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" variant="outline" className="text-xs">
                              Voir les élèves
                            </Button>
                            <Button size="sm" className="text-xs" onClick={() => setActiveTab('ai-quiz')}>
                              Créer un quiz
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Invitations Section */}
            <div className="card-dark p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Send className="h-5 w-5 mr-2" />
                Invitations Parents
              </h3>
              <ParentInvitationCard />
            </div>

            {/* Quick Actions */}
            <div className="card-dark p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4">Actions rapides</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab('ai-quiz')}
                  className="h-20 flex flex-col items-center justify-center btn-gradient gradient-primary text-white rounded-lg font-medium transition-all duration-200 hover-lift"
                >
                  <Bot className="h-6 w-6 mb-2" />
                  Créer un Quiz IA
                </button>
                <button 
                  onClick={() => setActiveTab('quizzes')} 
                  className="h-20 flex flex-col items-center justify-center card-secondary border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-200"
                >
                  <FileText className="h-6 w-6 mb-2" />
                  Mes Quiz
                </button>
                <button 
                  onClick={() => setActiveTab('results')} 
                  className="h-20 flex flex-col items-center justify-center card-secondary border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-200"
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Résultats
                </button>
              </div>
            </div>

            {/* Overview empty quiz hint when there is no quiz at all */}
            {activeTab === 'overview' && quizzes.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz</h3>
                    <p className="text-gray-600">Commencez par créer votre premier quiz</p>
                  </div>
                </CardContent>
              </Card>
            )}
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
                                Commencez par créer votre premier quiz avec l'assistant IA
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                      <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl overflow-hidden hover:border-slate-500/60 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-blue-600/10">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 backdrop-blur-sm border-b border-slate-600/50 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-3 leading-tight">{quiz.title}</h3>
                              <div className="flex items-center space-x-3">
                                <Badge className={`${
                                  quiz.is_published 
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0' 
                                    : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-0'
                                } px-3 py-1 font-medium`}>
                                  {quiz.is_published ? '✓ Publié' : '📝 Brouillon'}
                                </Badge>
                                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-3 py-1">
                                  {quiz.level}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              {!quiz.is_published && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handlePublishQuiz(quiz.id, quiz.is_published)}
                                  title="Publier le quiz"
                                  className="hover:bg-green-600/20 text-green-400 hover:text-green-300 transition-all"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {quiz.is_published && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handlePublishQuiz(quiz.id, quiz.is_published)}
                                  title="Dépublier le quiz"
                                  className="hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-all"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 space-y-4">
                          {quiz.description && (
                            <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                              <p className="text-slate-200 leading-relaxed">{quiz.description}</p>
                            </div>
                          )}
                          
                          {quiz.classroom && (
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <span className="text-white text-sm font-bold">📚</span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{quiz.classroom.name}</p>
                                <p className="text-slate-400 text-sm">{quiz.classroom.grade}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Stats */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-600/30">
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-white">10</p>
                                <p className="text-slate-400 text-xs">Questions</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-400">0</p>
                                <p className="text-slate-400 text-xs">Tentatives</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 text-xs">Créé le</p>
                              <p className="text-white text-sm font-medium">
                                {new Date(quiz.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          
          <TabsContent value="results">
            <ProgressTracker />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}