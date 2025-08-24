'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Trophy,
  Target,
  Clock,
  BookOpen,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Download,
  Filter,
  Eye
} from 'lucide-react'
import { 
  getQuizzesByTeacher, 
  getSubmissionsByQuiz, 
  getClassroomsByTeacher,
  getStudentsByClassroom 
} from '@/lib/database'

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

interface Submission {
  id: string
  quiz_id: string
  student_id: string
  answers: any
  score: number
  total_questions: number
  created_at: string
  student: {
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

interface Student {
  id: string
  classroom_id: string | null
  parent_id: string
  user: {
    id: string
    full_name: string | null
    email: string | null
  }
}

interface QuizAnalytics {
  quiz: Quiz
  submissions: Submission[]
  stats: {
    totalSubmissions: number
    averageScore: number
    completionRate: number
    topPerformers: Submission[]
    strugglingStudents: Submission[]
    questionAnalysis: Array<{
      questionIndex: number
      correctRate: number
      commonMistakes: string[]
    }>
  }
}

export function ProgressTracker() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [analytics, setAnalytics] = useState<QuizAnalytics[]>([])
  
  // Filter state
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all')
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (profile?.id) {
      fetchData()
    }
  }, [profile?.id])

  useEffect(() => {
    if (quizzes.length > 0) {
      calculateAnalytics()
    }
  }, [quizzes, selectedQuiz, selectedClassroom, dateRange])

  const fetchData = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      
      // Fetch teacher's data
      const [teacherQuizzes, teacherClassrooms] = await Promise.all([
        getQuizzesByTeacher(profile.id),
        getClassroomsByTeacher(profile.id)
      ])
      
      setQuizzes(teacherQuizzes as Quiz[])
      setClassrooms(teacherClassrooms as Classroom[])
      
      // Fetch all students from teacher's classrooms
      const students: Student[] = []
      for (const classroom of teacherClassrooms as Classroom[]) {
        const classroomStudents = await getStudentsByClassroom(classroom.id)
        students.push(...(classroomStudents as Student[]))
      }
      setAllStudents(students)
      
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = async () => {
    try {
      const analyticsData: QuizAnalytics[] = []
      
      for (const quiz of quizzes) {
        // Skip if filtered out
        if (selectedQuiz !== 'all' && quiz.id !== selectedQuiz) continue
        if (selectedClassroom !== 'all' && quiz.classroom_id !== selectedClassroom) continue
        
        // Fetch submissions for this quiz
        const submissions = await getSubmissionsByQuiz(quiz.id) as Submission[]
        
        // Filter by date range
        let filteredSubmissions = submissions
        if (dateRange !== 'all') {
          const now = new Date()
          const filterDate = new Date()
          
          switch (dateRange) {
            case 'week':
              filterDate.setDate(now.getDate() - 7)
              break
            case 'month':
              filterDate.setMonth(now.getMonth() - 1)
              break
            case 'quarter':
              filterDate.setMonth(now.getMonth() - 3)
              break
          }
          
          filteredSubmissions = submissions.filter(sub => 
            new Date(sub.created_at) > filterDate
          )
        }
        
        // Calculate statistics
        const totalSubmissions = filteredSubmissions.length
        const averageScore = totalSubmissions > 0 
          ? filteredSubmissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalSubmissions
          : 0
        
        // Get students in this quiz's classroom
        const classroomStudents = quiz.classroom_id 
          ? allStudents.filter(s => s.classroom_id === quiz.classroom_id)
          : allStudents
        
        const completionRate = classroomStudents.length > 0 
          ? (totalSubmissions / classroomStudents.length) * 100 
          : 0
        
        // Top performers (≥80%)
        const topPerformers = filteredSubmissions
          .filter(sub => (sub.score / sub.total_questions * 100) >= 80)
          .sort((a, b) => (b.score / b.total_questions) - (a.score / a.total_questions))
          .slice(0, 5)
        
        // Struggling students (<60%)
        const strugglingStudents = filteredSubmissions
          .filter(sub => (sub.score / sub.total_questions * 100) < 60)
          .sort((a, b) => (a.score / a.total_questions) - (b.score / b.total_questions))
          .slice(0, 5)
        
        analyticsData.push({
          quiz,
          submissions: filteredSubmissions,
          stats: {
            totalSubmissions,
            averageScore: Math.round(averageScore),
            completionRate: Math.round(completionRate),
            topPerformers,
            strugglingStudents,
            questionAnalysis: [] // Would need quiz questions to analyze
          }
        })
      }
      
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error calculating analytics:', error)
    }
  }

  const getOverallStats = () => {
    const totalQuizzes = analytics.length
    const totalSubmissions = analytics.reduce((sum, a) => sum + a.stats.totalSubmissions, 0)
    const averageScore = analytics.length > 0 
      ? analytics.reduce((sum, a) => sum + a.stats.averageScore, 0) / analytics.length
      : 0
    const averageCompletion = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + a.stats.completionRate, 0) / analytics.length
      : 0
    
    return {
      totalQuizzes,
      totalSubmissions,
      averageScore: Math.round(averageScore),
      averageCompletion: Math.round(averageCompletion)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const exportData = () => {
    // Simple CSV export functionality
    const csvData = analytics.flatMap(a => 
      a.submissions.map(sub => ({
        Quiz: a.quiz.title,
        Étudiant: sub.student.full_name,
        Score: Math.round((sub.score / sub.total_questions) * 100),
        'Questions Correctes': sub.score,
        'Total Questions': sub.total_questions,
        Date: formatDate(sub.created_at)
      }))
    )
    
    console.log('Export data:', csvData)
    alert('Fonctionnalité d\'export en cours de développement')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Analyse des données en cours...</p>
        </div>
      </div>
    )
  }

  const overallStats = getOverallStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analyse des Progrès</h2>
          <p className="text-gray-600">Suivez les performances de vos élèves et identifiez les points d'amélioration</p>
        </div>
        
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Quiz</label>
              <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les quiz</SelectItem>
                  {quizzes.map(quiz => (
                    <SelectItem key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Classe</label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classrooms.map(classroom => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Période</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute période</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={() => {
                setSelectedQuiz('all')
                setSelectedClassroom('all')
                setDateRange('all')
              }} variant="outline" className="w-full">
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="quizzes">Par Quiz</TabsTrigger>
          <TabsTrigger value="students">Par Élève</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Quiz Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalQuizzes}</div>
                <div className="text-sm text-gray-600">quiz publiés</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Soumissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalSubmissions}</div>
                <div className="text-sm text-gray-600">total des tentatives</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Score Moyen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(overallStats.averageScore)}`}>
                  {overallStats.averageScore}%
                </div>
                <Progress value={overallStats.averageScore} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Taux de Participation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(overallStats.averageCompletion)}`}>
                  {overallStats.averageCompletion}%
                </div>
                <Progress value={overallStats.averageCompletion} className="mt-2" />
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Activité Récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Aucune activité récente</p>
              ) : (
                <div className="space-y-2">
                  {analytics
                    .flatMap(a => a.submissions.map(sub => ({ ...sub, quizTitle: a.quiz.title })))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10)
                    .map((submission: any) => (
                      <div key={submission.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{submission.student.full_name}</div>
                          <div className="text-xs text-gray-500">{submission.quizTitle}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-sm ${getScoreColor(
                            Math.round((submission.score / submission.total_questions) * 100)
                          )}`}>
                            {Math.round((submission.score / submission.total_questions) * 100)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(submission.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quizzes" className="space-y-6">
          {analytics.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz trouvé</h3>
                <p className="text-gray-600">Créez votre premier quiz pour voir les analyses</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {analytics.map((quizAnalytic) => (
                <Card key={quizAnalytic.quiz.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{quizAnalytic.quiz.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">{quizAnalytic.quiz.level}</Badge>
                          {quizAnalytic.quiz.classroom && (
                            <Badge variant="secondary">
                              {quizAnalytic.quiz.classroom.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{quizAnalytic.stats.totalSubmissions}</div>
                        <div className="text-sm text-gray-600">Soumissions</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(quizAnalytic.stats.averageScore)}`}>
                          {quizAnalytic.stats.averageScore}%
                        </div>
                        <div className="text-sm text-gray-600">Score moyen</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(quizAnalytic.stats.completionRate)}`}>
                          {quizAnalytic.stats.completionRate}%
                        </div>
                        <div className="text-sm text-gray-600">Participation</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {quizAnalytic.stats.topPerformers.length}
                        </div>
                        <div className="text-sm text-gray-600">Excellents (≥80%)</div>
                      </div>
                    </div>
                    
                    {quizAnalytic.stats.strugglingStudents.length > 0 && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="flex items-center text-orange-800 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          <strong>Attention :</strong> {quizAnalytic.stats.strugglingStudents.length} élève(s) 
                          en difficulté (score &lt; 60%)
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="students" className="space-y-6">
          {/* Student performance overview would go here */}
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analyse par Élève</h3>
              <p className="text-gray-600">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}