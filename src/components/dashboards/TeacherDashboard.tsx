'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
import { TeacherInvitationManager } from '@/components/teacher/TeacherInvitationManager'
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
  const { profile, signOut } = useAuth()
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Tableau de Bord Enseignant</h1>
              <p className="text-sm text-gray-600">{profile?.full_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" onClick={() => setActiveTab('overview')}>Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="ai-quiz" onClick={() => setActiveTab('ai-quiz')}>Assistant IA</TabsTrigger>
            <TabsTrigger value="quizzes" onClick={() => setActiveTab('quizzes')}>Mes Quiz</TabsTrigger>
            <TabsTrigger value="invitations" onClick={() => setActiveTab('invitations')}>Invitations</TabsTrigger>
            <TabsTrigger value="analytics" onClick={() => setActiveTab('analytics')}>Analyses</TabsTrigger>
            <TabsTrigger value="classrooms" onClick={() => setActiveTab('classrooms')}>Mes Classes</TabsTrigger>
            <TabsTrigger value="results" onClick={() => setActiveTab('results')}>Résultats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <FileText className="h-5 w-5 mr-2" />
                    Quiz Créés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.totalQuizzes}</div>
                  <div className="text-blue-100 text-sm">
                    {engagementStats.publishedQuizzes} publiés • {engagementStats.draftQuizzes} brouillons
                  </div>
                  <Progress value={(engagementStats.publishedQuizzes / Math.max(engagementStats.totalQuizzes, 1)) * 100} className="mt-2 h-2" />
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <Users className="h-5 w-5 mr-2" />
                    Mes Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalClassrooms} {totalClassrooms === 1 ? 'classe' : 'classes'}</div>
                  <div className="text-green-100 text-sm">
                    {totalStudents} élèves au total
                  </div>
                  <div className="text-green-100 text-xs mt-1">
                    ~{averageStudentsPerClass} élèves/classe
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Soumissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.totalSubmissions}</div>
                  <div className="text-purple-100 text-sm">
                    {engagementStats.thisWeekSubmissions} cette semaine
                  </div>
                  <div className="flex items-center mt-2">
                    <Target className="h-3 w-3 mr-1" />
                    <span className="text-purple-100 text-xs">
                      {((engagementStats.thisWeekSubmissions / Math.max(engagementStats.totalSubmissions, 1)) * 100).toFixed(1)}% récent
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <Clock className="h-5 w-5 mr-2" />
                    Activité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.thisWeekSubmissions}</div>
                  <div className="text-orange-100 text-sm">
                    Activité cette semaine
                  </div>
                  <div className="text-orange-100 text-xs mt-1">
                    {engagementStats.totalSubmissions > 0 ? `${engagementStats.totalSubmissions} réponses au total` : 'Aucune réponse encore'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  onClick={() => setActiveTab('ai-quiz')}
                  className="h-20 flex-col bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Bot className="h-6 w-6 mb-2" />
                  Assistant IA
                </Button>
                <Button 
                  onClick={() => setActiveTab('quizzes')} 
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Plus className="h-6 w-6 mb-2" />
                  Créer un Quiz
                </Button>
                <Button 
                  onClick={() => setActiveTab('analytics')} 
                  variant="outline" 
                  className="h-20 flex-col"
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Analyses
                </Button>
              </CardContent>
            </Card>

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
          
          <TabsContent value="invitations">
            <TeacherInvitationManager />
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