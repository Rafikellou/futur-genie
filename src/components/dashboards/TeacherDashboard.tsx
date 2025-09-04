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
  const [activeTab, setActiveTab] = useState('overview')
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
            <div className="grid grid-cols-7 gap-1">
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'overview' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('overview')}>Vue d'ensemble</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'ai-quiz' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('ai-quiz')}>Assistant IA</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'quizzes' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('quizzes')}>Mes Quiz</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'invitations' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('invitations')}>Invitations</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'analytics' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('analytics')}>Analyses</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'classrooms' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('classrooms')}>Mes Classes</button>
              <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'results' ? 'gradient-accent text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('results')}>Résultats</button>
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

            {/* Quick Actions */}
            <div className="card-dark p-6 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab('ai-quiz')}
                  className="h-20 flex flex-col items-center justify-center btn-gradient gradient-primary text-white rounded-lg font-medium transition-all duration-200 hover-lift"
                >
                  <Bot className="h-6 w-6 mb-2" />
                  Assistant IA
                </button>
                <button 
                  onClick={() => setActiveTab('quizzes')} 
                  className="h-20 flex flex-col items-center justify-center card-secondary border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-200"
                >
                  <Plus className="h-6 w-6 mb-2" />
                  Créer un Quiz
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')} 
                  className="h-20 flex flex-col items-center justify-center card-secondary border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-200"
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Analyses
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
          
          <TabsContent value="invitations" className="space-y-6">
            <ParentInvitationCard />
          </TabsContent>
          
          <TabsContent value="analytics">
            <ProgressTracker />
          </TabsContent>
          
          <TabsContent value="quizzes">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Mes Quiz</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un Quiz
                </Button>
              </div>
              
              {quizzes.length === 0 ? (
                activeTab === 'quizzes' ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz</h3>
                        <p className="text-gray-600 mb-4">Commencez par créer votre premier quiz</p>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un quiz
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizzes.map((quiz) => (
                    <Card key={quiz.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={quiz.is_published ? 'default' : 'secondary'}>
                                {quiz.is_published ? 'Publié' : 'Brouillon'}
                              </Badge>
                              <Badge variant="outline">{quiz.level}</Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {!quiz.is_published && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handlePublishQuiz(quiz.id, quiz.is_published)}
                                title="Publier le quiz"
                              >
                                <Send className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {quiz.is_published && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handlePublishQuiz(quiz.id, quiz.is_published)}
                                title="Dépublier le quiz"
                              >
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 mb-2">{quiz.description}</p>
                        )}
                        {quiz.classroom && (
                          <div className="text-sm text-gray-500">
                            Classe: {quiz.classroom.name} ({quiz.classroom.grade})
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="classrooms">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Mes Classes</h2>
              
              {classrooms.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune classe assignée</h3>
                    <p className="text-gray-600">Contactez votre directeur pour être assigné à une classe</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {classrooms.map((classroom) => {
                    const classStudents = students.filter(s => s.classroom_id === classroom.id)
                    return (
                      <Card key={classroom.id}>
                        <CardHeader>
                          <CardTitle>{classroom.name}</CardTitle>
                          <Badge variant="outline">{classroom.grade}</Badge>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium">Élèves: {classStudents.length}</div>
                              {classStudents.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {classStudents.slice(0, 3).map(s => s.user.full_name).join(', ')}
                                  {classStudents.length > 3 && ` et ${classStudents.length - 3} autres`}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                Voir les élèves
                              </Button>
                              <Button size="sm">
                                Quiz pour cette classe
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Résultats et Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Les fonctionnalités d'analyse des résultats seront disponibles prochainement.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}