'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { GraduationCap, LogOut, BookOpen, Trophy, Clock, Star, Play, CheckCircle, Loader2 } from 'lucide-react'
import { 
  getQuizzesByLevel, 
  getQuizzesByClassroom, 
  getSubmissionsByStudent, 
  getUserById,
  getStudentEngagementStats
} from '@/lib/database'
import { QuizTaking } from '@/components/student/QuizTaking'
import { QuizResults } from '@/components/quiz/QuizResults'

interface Quiz {
  id: string
  title: string
  description: string | null
  level: string
  is_published: boolean
  classroom_id: string | null
  owner_id: string | null
  created_at: string
}

interface Submission {
  id: string
  quiz_id: string
  student_id: string
  answers: any
  score: number
  total_questions: number
  created_at: string
  quiz?: {
    id: string
    title: string
    description: string | null
    level: string
  }
}

interface StudentProfile {
  id: string
  classroom_id: string | null
  parent_id: string
  user: {
    id: string
    full_name: string | null
    email: string | null
  }
}

export function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz taking state
  const [currentQuiz, setCurrentQuiz] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null)
  const [viewingResults, setViewingResults] = useState<Submission | null>(null)
  
  // Data state
  const [selfServiceQuizzes, setSelfServiceQuizzes] = useState<Quiz[]>([])
  const [classroomQuizzes, setClassroomQuizzes] = useState<Quiz[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [studentData, setStudentData] = useState<StudentProfile | null>(null)
  
  // Real-time engagement statistics
  const [engagementStats, setEngagementStats] = useState({
    totalQuizzesTaken: 0,
    averageScore: 0,
    thisWeekQuizzes: 0,
    perfectScores: 0,
    bestScore: 0
  })
  
  useEffect(() => {
    if (profile?.id) {
      fetchStudentData()
      
      // Set up interval for real-time updates every 30 seconds
      const interval = setInterval(fetchStudentData, 30000)
      return () => clearInterval(interval)
    }
  }, [profile?.id])
  
  const fetchStudentData = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      
      // Fetch student data, submissions, and engagement stats in parallel
      const [studentInfo, studentSubmissions, engagement] = await Promise.all([
        getUserById(profile.id),
        getSubmissionsByStudent(profile.id),
        getStudentEngagementStats(profile.id)
      ])
      
      // Get student's classroom info from the user data
      const studentRecord = studentInfo as any
      
      // Determine student's level based on classroom or profile
      let studentLevel = 'CP' // default
      if (studentRecord.school_id) {
        // Try to get level from classroom assignment logic
        // For now, we'll use a simple mapping or default
        studentLevel = determineStudentLevel(studentRecord)
      }
      
      // Fetch available quizzes
      const [selfQuizzes, classQuizzes] = await Promise.all([
        getQuizzesByLevel(studentLevel),
        studentRecord.classroom_id ? getQuizzesByClassroom(studentRecord.classroom_id) : Promise.resolve([])
      ])
      
      setSelfServiceQuizzes(selfQuizzes as Quiz[])
      setClassroomQuizzes(classQuizzes as Quiz[])
      setSubmissions(studentSubmissions as Submission[])
      setStudentData(studentRecord)
      setEngagementStats(engagement)
      
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }
  
  const determineStudentLevel = (student: any): string => {
    // Simple logic to determine student level
    // In a real app, this would be based on classroom assignment or profile data
    return 'CP' // Default level
  }
  
  const getStudentStats = () => {
    const totalQuizzesTaken = submissions.length
    const averageScore = totalQuizzesTaken > 0 
      ? Math.round(submissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalQuizzesTaken)
      : 0
    const perfectScores = submissions.filter(sub => sub.score === sub.total_questions).length
    const availableQuizzes = selfServiceQuizzes.length + classroomQuizzes.length
    
    return { totalQuizzesTaken, averageScore, perfectScores, availableQuizzes }
  }
  
  const getQuizStatus = (quiz: Quiz) => {
    const submission = submissions.find(sub => sub.quiz_id === quiz.id)
    return submission ? 'completed' : 'available'
  }
  
  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const handleStartQuiz = (quizId: string) => {
    setCurrentQuiz(quizId)
  }
  
  const handleQuizComplete = async (score: number, totalQuestions: number) => {
    // Refresh submissions after completing a quiz
    await fetchStudentData()
    setShowSuccessMessage(`Quiz terminé ! Score: ${Math.round((score / totalQuestions) * 100)}%`)
    setTimeout(() => setShowSuccessMessage(null), 5000)
  }
  
  const handleExitQuiz = () => {
    setCurrentQuiz(null)
  }
  
  const handleViewResults = (submission: Submission) => {
    setViewingResults(submission)
  }
  
  const handleBackFromResults = () => {
    setViewingResults(null)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show quiz taking interface if a quiz is selected
  if (currentQuiz) {
    return (
      <QuizTaking 
        quizId={currentQuiz}
        onComplete={handleQuizComplete}
        onExit={handleExitQuiz}
      />
    )
  }
  
  // Show quiz results if viewing results
  if (viewingResults) {
    return (
      <QuizResults
        userSubmission={viewingResults}
        onBack={handleBackFromResults}
        onRetakeQuiz={() => {
          setViewingResults(null)
          setCurrentQuiz(viewingResults.quiz_id)
        }}
      />
    )
  }

  const { totalQuizzesTaken, averageScore, perfectScores, availableQuizzes } = getStudentStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Mon Espace Élève</h1>
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
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {showSuccessMessage && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{showSuccessMessage}</AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
            <TabsTrigger value="browse">Parcourir Quiz</TabsTrigger>
            <TabsTrigger value="classroom">Ma Classe</TabsTrigger>
            <TabsTrigger value="progress">Mes Résultats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            {/* Welcome Message */}
            <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-2">Salut {profile?.full_name?.split(' ')[0]} ! 👋</h2>
                <p className="text-purple-100">Prêt pour de nouveaux défis aujourd'hui ?</p>
              </CardContent>
            </Card>
            
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Quiz Complétés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.totalQuizzesTaken}</div>
                  <div className="text-blue-100 text-sm">
                    sur {availableQuizzes} disponibles
                  </div>
                  <Progress value={(engagementStats.totalQuizzesTaken / Math.max(availableQuizzes, 1)) * 100} className="mt-2 h-2" />
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <Star className="h-5 w-5 mr-2" />
                    Score Moyen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.averageScore}%</div>
                  <div className="text-green-100 text-sm">
                    Meilleur: {engagementStats.bestScore}%
                  </div>
                  <Progress value={engagementStats.averageScore} className="mt-2 h-2" />
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <Trophy className="h-5 w-5 mr-2" />
                    Scores Parfaits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.perfectScores}</div>
                  <div className="text-yellow-100 text-sm">
                    {engagementStats.totalQuizzesTaken > 0 ? 
                      Math.round((engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100) : 0
                    }% de réussite
                  </div>
                  <div className="flex items-center mt-2">
                    <Star className="h-3 w-3 mr-1" />
                    <span className="text-yellow-100 text-xs">
                      {engagementStats.perfectScores} / {engagementStats.totalQuizzesTaken}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-white">
                    <Clock className="h-5 w-5 mr-2" />
                    Cette Semaine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{engagementStats.thisWeekQuizzes}</div>
                  <div className="text-purple-100 text-sm">nouveaux quiz</div>
                  <div className="text-purple-100 text-xs mt-1">
                    {engagementStats.totalQuizzesTaken > 0 ? 
                      `${((engagementStats.thisWeekQuizzes / engagementStats.totalQuizzesTaken) * 100).toFixed(1)}% du total` : 
                      'Commence dès maintenant !'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Performances
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Score moyen</span>
                    <span className="text-sm text-gray-600">{engagementStats.averageScore}%</span>
                  </div>
                  <Progress value={engagementStats.averageScore} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Meilleur score</span>
                    <span className="text-sm text-gray-600">{engagementStats.bestScore}%</span>
                  </div>
                  <Progress value={engagementStats.bestScore} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{engagementStats.totalQuizzesTaken}</div>
                      <div className="text-xs text-blue-500">Quiz Terminés</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">{engagementStats.perfectScores}</div>
                      <div className="text-xs text-yellow-500">Scores Parfaits</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Continuer l'Apprentissage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setActiveTab('browse')} 
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Découvrir de Nouveaux Quiz
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('classroom')} 
                    variant="outline" 
                    className="w-full"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Quiz de Ma Classe
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Activité Récente</CardTitle>
                </CardHeader>
                <CardContent>
                  {submissions.length > 0 ? (
                    <div className="space-y-2">
                      {submissions.slice(0, 3).map((submission) => (
                        <div key={submission.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-sm">{submission.quiz?.title || 'Quiz'}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(submission.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`font-bold ${getScoreColor(submission.score, submission.total_questions)}`}>
                            {Math.round((submission.score / submission.total_questions) * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">Aucune activité récente</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="browse">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Quiz Self-Service</h2>
              <p className="text-gray-600">Découvre des quiz adaptés à ton niveau et apprends à ton rythme !</p>
              
              {selfServiceQuizzes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz disponible</h3>
                    <p className="text-gray-600">Les quiz seront bientôt disponibles !</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selfServiceQuizzes.map((quiz) => {
                    const status = getQuizStatus(quiz)
                    const submission = submissions.find(sub => sub.quiz_id === quiz.id)
                    
                    return (
                      <Card key={quiz.id} className={status === 'completed' ? 'border-green-200 bg-green-50' : ''}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{quiz.title}</CardTitle>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline">{quiz.level}</Badge>
                                {status === 'completed' && (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Terminé
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {quiz.description && (
                            <p className="text-sm text-gray-600 mb-4">{quiz.description}</p>
                          )}
                          
                          {status === 'completed' && submission && (
                            <div className="mb-4 p-3 bg-green-100 rounded">
                              <div className="text-sm font-medium text-green-800">
                                Score: {Math.round((submission.score / submission.total_questions) * 100)}%
                              </div>
                              <div className="text-xs text-green-600">
                                Complété le {new Date(submission.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                          
                          <Button 
                            className="w-full" 
                            variant={status === 'completed' ? 'outline' : 'default'}
                            onClick={() => handleStartQuiz(quiz.id)}
                          >
                            {status === 'completed' ? 'Refaire le Quiz' : 'Commencer le Quiz'}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="classroom">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Quiz de Ma Classe</h2>
              <p className="text-gray-600">Quiz créés spécialement par ton enseignant</p>
              
              {classroomQuizzes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz de classe</h3>
                    <p className="text-gray-600">Ton enseignant n'a pas encore créé de quiz pour la classe</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classroomQuizzes.map((quiz) => {
                    const status = getQuizStatus(quiz)
                    const submission = submissions.find(sub => sub.quiz_id === quiz.id)
                    
                    return (
                      <Card key={quiz.id} className={`border-blue-200 ${status === 'completed' ? 'bg-blue-50' : 'bg-blue-25'}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{quiz.title}</CardTitle>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="default" className="bg-blue-600">Classe</Badge>
                                <Badge variant="outline">{quiz.level}</Badge>
                                {status === 'completed' && (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Terminé
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {quiz.description && (
                            <p className="text-sm text-gray-600 mb-4">{quiz.description}</p>
                          )}
                          
                          {status === 'completed' && submission && (
                            <div className="mb-4 p-3 bg-blue-100 rounded">
                              <div className="text-sm font-medium text-blue-800">
                                Score: {Math.round((submission.score / submission.total_questions) * 100)}%
                              </div>
                              <div className="text-xs text-blue-600">
                                Complété le {new Date(submission.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                          
                          <Button 
                            className="w-full" 
                            variant={status === 'completed' ? 'outline' : 'default'}
                            onClick={() => {
                              if (status === 'completed' && submission) {
                                handleViewResults(submission)
                              } else {
                                handleStartQuiz(quiz.id)
                              }
                            }}
                          >
                            {status === 'completed' ? 'Voir les Résultats' : 'Commencer le Quiz'}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="progress">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Mes Résultats</h2>
              
              {submissions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat</h3>
                    <p className="text-gray-600 mb-4">Commence un quiz pour voir tes premiers résultats !</p>
                    <Button onClick={() => setActiveTab('browse')}>
                      Parcourir les Quiz
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <Card key={submission.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{submission.quiz?.title || 'Quiz'}</h3>
                            <p className="text-sm text-gray-600">
                              Complété le {new Date(submission.created_at).toLocaleDateString()}
                            </p>
                            {submission.quiz?.level && (
                              <Badge variant="outline" className="mt-2">{submission.quiz.level}</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(submission.score, submission.total_questions)}`}>
                              {Math.round((submission.score / submission.total_questions) * 100)}%
                            </div>
                            <div className="text-sm text-gray-600">
                              {submission.score}/{submission.total_questions} questions
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progression</span>
                            <span>{submission.score}/{submission.total_questions}</span>
                          </div>
                          <Progress 
                            value={(submission.score / submission.total_questions) * 100} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="mt-4 flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewResults(submission)}
                          >
                            Voir les Détails
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleStartQuiz(submission.quiz_id)}
                          >
                            Refaire le Quiz
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}