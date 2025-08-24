'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Users, LogOut, User, BarChart3, Calendar, Trophy, BookOpen, TrendingUp, Clock, Star, Loader2, Plus } from 'lucide-react'
import { getStudentsByParent, getSubmissionsByStudent, getUserById, getParentChildrenStats } from '@/lib/database'

interface Child {
  id: string
  classroom_id: string | null
  parent_id: string
  user: {
    id: string
    full_name: string | null
    email: string | null
  }
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
  quiz: {
    id: string
    title: string
    description: string | null
    level: string
  }
}

interface ChildProgress {
  child: Child
  submissions: Submission[]
  stats: {
    totalQuizzes: number
    averageScore: number
    perfectScores: number
    thisWeekQuizzes: number
    improvement: number
  }
}

export function ParentDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [children, setChildren] = useState<Child[]>([])
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([])
  
  // Real-time engagement statistics
  const [engagementStats, setEngagementStats] = useState({
    totalChildren: 0,
    totalQuizzesTaken: 0,
    averageScore: 0,
    thisWeekActivity: 0,
    perfectScores: 0
  })
  
  useEffect(() => {
    if (profile?.id) {
      fetchParentData()
      
      // Set up interval for real-time updates every 30 seconds
      const interval = setInterval(fetchParentData, 30000)
      return () => clearInterval(interval)
    }
  }, [profile?.id])
  
  const fetchParentData = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      
      // Fetch parent's children and engagement stats in parallel
      const [childrenData, engagement] = await Promise.all([
        getStudentsByParent(profile.id),
        getParentChildrenStats(profile.id)
      ])
      
      setChildren(childrenData as Child[])
      setEngagementStats(engagement)
      
      // Fetch progress data for each child
      const progressData: ChildProgress[] = []
      for (const child of childrenData as Child[]) {
        const submissions = await getSubmissionsByStudent(child.id)
        const stats = calculateChildStats(submissions as Submission[])
        
        progressData.push({
          child,
          submissions: submissions as Submission[],
          stats
        })
      }
      
      setChildrenProgress(progressData)
      
      // Auto-select first child if available
      if ((childrenData as Child[]).length > 0 && !selectedChild) {
        setSelectedChild((childrenData as Child[])[0].id)
      }
      
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }
  
  const calculateChildStats = (submissions: Submission[]) => {
    const totalQuizzes = submissions.length
    const averageScore = totalQuizzes > 0 
      ? Math.round(submissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalQuizzes)
      : 0
    const perfectScores = submissions.filter(sub => sub.score === sub.total_questions).length
    
    // This week's quizzes
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekQuizzes = submissions.filter(sub => new Date(sub.created_at) > weekAgo).length
    
    // Calculate improvement (comparing last week vs previous week)
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const lastWeekSubmissions = submissions.filter(sub => {
      const subDate = new Date(sub.created_at)
      return subDate > weekAgo
    })
    const previousWeekSubmissions = submissions.filter(sub => {
      const subDate = new Date(sub.created_at)
      return subDate > twoWeeksAgo && subDate <= weekAgo
    })
    
    const lastWeekAvg = lastWeekSubmissions.length > 0 
      ? lastWeekSubmissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / lastWeekSubmissions.length
      : 0
    const previousWeekAvg = previousWeekSubmissions.length > 0 
      ? previousWeekSubmissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / previousWeekSubmissions.length
      : 0
    
    const improvement = lastWeekAvg - previousWeekAvg
    
    return {
      totalQuizzes,
      averageScore,
      perfectScores,
      thisWeekQuizzes,
      improvement: Math.round(improvement)
    }
  }
  
  const getSelectedChildProgress = (): ChildProgress | null => {
    return childrenProgress.find(cp => cp.child.id === selectedChild) || null
  }
  
  const getOverallStats = () => {
    const totalQuizzes = childrenProgress.reduce((sum, cp) => sum + cp.stats.totalQuizzes, 0)
    const totalChildren = children.length
    const averageScoreAllChildren = totalChildren > 0 
      ? Math.round(childrenProgress.reduce((sum, cp) => sum + cp.stats.averageScore, 0) / totalChildren)
      : 0
    const totalPerfectScores = childrenProgress.reduce((sum, cp) => sum + cp.stats.perfectScores, 0)
    
    return { totalQuizzes, totalChildren, averageScoreAllChildren, totalPerfectScores }
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getTrendIcon = (improvement: number) => {
    if (improvement > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (improvement < 0) return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
    return <TrendingUp className="h-4 w-4 text-gray-400" />
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const selectedChildProgress = getSelectedChildProgress()
  const { totalQuizzes, totalChildren, averageScoreAllChildren, totalPerfectScores } = getOverallStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Espace Parent</h1>
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
        
        {children.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun enfant enregistré</h3>
              <p className="text-gray-600 mb-4">Ajoutez le profil de votre enfant pour suivre ses progrès</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un enfant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="children">Mes Enfants</TabsTrigger>
              <TabsTrigger value="progress">Progrès Détaillés</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {/* Family Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-white">
                      <Users className="h-5 w-5 mr-2" />
                      Mes Enfants
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{engagementStats.totalChildren}</div>
                    <div className="text-blue-100 text-sm">
                      {children.filter(c => c.classroom_id).length} scolarisés
                    </div>
                    <div className="text-blue-100 text-xs mt-1">
                      {engagementStats.totalChildren > 0 ? 
                        `${Math.round((children.filter(c => c.classroom_id).length / engagementStats.totalChildren) * 100)}% actifs` : 
                        'Aucun enfant'
                      }
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-white">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Quiz Complétés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{engagementStats.totalQuizzesTaken}</div>
                    <div className="text-green-100 text-sm">
                      au total
                    </div>
                    <div className="text-green-100 text-xs mt-1">
                      {engagementStats.totalChildren > 0 ? 
                        `~${Math.round(engagementStats.totalQuizzesTaken / engagementStats.totalChildren)} par enfant` : 
                        'Aucune activité'
                      }
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-white">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Score Moyen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{engagementStats.averageScore}%</div>
                    <div className="text-purple-100 text-sm">
                      performance globale
                    </div>
                    <Progress value={engagementStats.averageScore} className="mt-2 h-2" />
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-white">
                      <Clock className="h-5 w-5 mr-2" />
                      Cette Semaine
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{engagementStats.thisWeekActivity}</div>
                    <div className="text-yellow-100 text-sm">
                      quiz cette semaine
                    </div>
                    <div className="text-yellow-100 text-xs mt-1">
                      {engagementStats.totalQuizzesTaken > 0 ? 
                        `${((engagementStats.thisWeekActivity / engagementStats.totalQuizzesTaken) * 100).toFixed(1)}% du total` : 
                        'Démarrage'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="h-5 w-5 mr-2" />
                      Performances Familiales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Score moyen général</span>
                      <span className="text-sm text-gray-600">{engagementStats.averageScore}%</span>
                    </div>
                    <Progress value={engagementStats.averageScore} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Activité récente</span>
                      <span className="text-sm text-gray-600">{engagementStats.thisWeekActivity} quiz</span>
                    </div>
                    <Progress value={Math.min((engagementStats.thisWeekActivity / Math.max(engagementStats.totalChildren, 1)) * 20, 100)} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{engagementStats.totalQuizzesTaken}</div>
                        <div className="text-xs text-blue-500">Quiz Total</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-lg font-bold text-yellow-600">{engagementStats.perfectScores}</div>
                        <div className="text-xs text-yellow-500">Scores Parfaits</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Activité Récente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {engagementStats.totalQuizzesTaken > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Quiz cette semaine</span>
                          <span className="font-medium">{engagementStats.thisWeekActivity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Score moyen</span>
                          <span className="font-medium">{engagementStats.averageScore}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Scores parfaits</span>
                          <span className="font-medium">{engagementStats.perfectScores}</span>
                        </div>
                        <div className="pt-3 border-t">
                          <div className="text-sm text-gray-600 mb-2">Taux de réussite</div>
                          <div className="flex items-center">
                            <Progress 
                              value={engagementStats.totalQuizzesTaken > 0 ? 
                                (engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100 : 0
                              } 
                              className="flex-1 h-2" 
                            />
                            <span className="text-sm font-medium ml-2">
                              {engagementStats.totalQuizzesTaken > 0 ? 
                                `${Math.round((engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100)}%` : 
                                '0%'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Aucune activité récente</p>
                        <p className="text-sm text-gray-400">Encouragez vos enfants à commencer</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Children Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {childrenProgress.map((childProgress) => (
                  <Card key={childProgress.child.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => {
                          setSelectedChild(childProgress.child.id)
                          setActiveTab('progress')
                        }}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            {childProgress.child.user.full_name}
                          </CardTitle>
                          {childProgress.child.classroom && (
                            <Badge variant="outline" className="mt-2">
                              {childProgress.child.classroom.name} - {childProgress.child.classroom.grade}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getScoreColor(childProgress.stats.averageScore)}`}>
                            {childProgress.stats.averageScore}%
                          </div>
                          <div className="flex items-center text-sm">
                            {getTrendIcon(childProgress.stats.improvement)}
                            <span className={childProgress.stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {childProgress.stats.improvement > 0 ? '+' : ''}{childProgress.stats.improvement}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="font-semibold">{childProgress.stats.totalQuizzes}</div>
                          <div className="text-xs text-gray-600">Quiz</div>
                        </div>
                        <div>
                          <div className="font-semibold">{childProgress.stats.perfectScores}</div>
                          <div className="text-xs text-gray-600">Parfaits</div>
                        </div>
                        <div>
                          <div className="font-semibold">{childProgress.stats.thisWeekQuizzes}</div>
                          <div className="text-xs text-gray-600">Cette semaine</div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progression</span>
                          <span>{childProgress.stats.averageScore}%</span>
                        </div>
                        <Progress value={childProgress.stats.averageScore} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="children">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Mes Enfants</h2>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un enfant
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {children.map((child) => {
                    const progress = childrenProgress.find(cp => cp.child.id === child.id)
                    return (
                      <Card key={child.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center">
                              <User className="h-5 w-5 mr-2" />
                              {child.user.full_name}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedChild(child.id)
                                setActiveTab('progress')
                              }}
                            >
                              Voir détails
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium">Email</div>
                              <div className="text-sm text-gray-600">{child.user.email || 'Non renseigné'}</div>
                            </div>
                            
                            {child.classroom ? (
                              <div>
                                <div className="text-sm font-medium">Classe</div>
                                <Badge variant="outline">
                                  {child.classroom.name} - {child.classroom.grade}
                                </Badge>
                              </div>
                            ) : (
                              <Alert>
                                <AlertDescription>
                                  Votre enfant n'est pas encore assigné à une classe. Contactez l'école.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {progress && (
                              <div className="bg-gray-50 p-3 rounded">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>Quiz complétés: <span className="font-semibold">{progress.stats.totalQuizzes}</span></div>
                                  <div>Score moyen: <span className={`font-semibold ${getScoreColor(progress.stats.averageScore)}`}>{progress.stats.averageScore}%</span></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="progress">
              <div className="space-y-6">
                {/* Child Selection */}
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-bold">Progrès Détaillés</h2>
                  <div className="flex space-x-2">
                    {children.map((child) => (
                      <Button
                        key={child.id}
                        variant={selectedChild === child.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedChild(child.id)}
                      >
                        {child.user.full_name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {selectedChildProgress && (
                  <div className="space-y-6">
                    {/* Detailed Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <BookOpen className="h-5 w-5 mr-2" />
                            Quiz Complétés
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedChildProgress.stats.totalQuizzes}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <BarChart3 className="h-5 w-5 mr-2" />
                            Score Moyen
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${getScoreColor(selectedChildProgress.stats.averageScore)}`}>
                            {selectedChildProgress.stats.averageScore}%
                          </div>
                          <Progress value={selectedChildProgress.stats.averageScore} className="mt-2" />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Trophy className="h-5 w-5 mr-2" />
                            Scores Parfaits
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedChildProgress.stats.perfectScores}</div>
                          <div className="text-sm text-gray-600">
                            {selectedChildProgress.stats.totalQuizzes > 0 
                              ? Math.round((selectedChildProgress.stats.perfectScores / selectedChildProgress.stats.totalQuizzes) * 100)
                              : 0}% de réussite
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2" />
                            Évolution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            {getTrendIcon(selectedChildProgress.stats.improvement)}
                            <span className={`text-2xl font-bold ml-2 ${
                              selectedChildProgress.stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {selectedChildProgress.stats.improvement > 0 ? '+' : ''}{selectedChildProgress.stats.improvement}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">Par rapport à la semaine dernière</div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Activité Récente</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedChildProgress.submissions.length === 0 ? (
                          <p className="text-gray-600 text-center py-8">Aucune activité enregistrée</p>
                        ) : (
                          <div className="space-y-3">
                            {selectedChildProgress.submissions.slice(0, 10).map((submission) => (
                              <div key={submission.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <div>
                                  <div className="font-medium">{submission.quiz.title}</div>
                                  <div className="text-sm text-gray-600">
                                    {new Date(submission.created_at).toLocaleDateString()} • {submission.quiz.level}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${getScoreColor((submission.score / submission.total_questions) * 100)}`}>
                                    {Math.round((submission.score / submission.total_questions) * 100)}%
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {submission.score}/{submission.total_questions}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="communication">
              <Card>
                <CardHeader>
                  <CardTitle>Communication avec l'École</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">Les fonctionnalités de communication seront disponibles prochainement</p>
                    <div className="space-y-2">
                      <Button variant="outline" disabled>
                        Contacter l'enseignant
                      </Button>
                      <Button variant="outline" disabled>
                        Voir les annonces de classe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}