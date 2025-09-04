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
import { getSubmissionsByParent, getParentStats, getAvailableQuizzesForParent } from '@/lib/database'

interface Submission {
  id: string
  quiz_id: string
  parent_id: string
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

export function ParentDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([])

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

      const [submissionsData, engagement, quizzes] = await Promise.all([
        getSubmissionsByParent(profile.id),
        getParentStats(profile.id),
        getAvailableQuizzesForParent()
      ])

      setSubmissions(submissionsData as Submission[])
      setEngagementStats(engagement)
      setAvailableQuizzes(quizzes)

    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

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
        
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz réalisé</h3>
              <p className="text-gray-600 mb-4">Commencez un quiz pour voir vos progrès ici.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="progress">Mes Progrès</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {/* Recommended Activities Section */}
              {availableQuizzes.length > 0 && (
                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-orange-800">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Activités Recommandées par {availableQuizzes[0]?.classroom?.teacher?.full_name || 'votre enseignant(e)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableQuizzes.map((quiz) => (
                        <Card key={quiz.id} className="bg-white border border-orange-200 hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            <Badge variant="outline" className="w-fit">
                              {quiz.level}
                            </Badge>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {quiz.description && (
                              <p className="text-sm text-gray-600 mb-3">{quiz.description}</p>
                            )}
                            <Button 
                              className="w-full bg-orange-600 hover:bg-orange-700"
                              onClick={() => {
                                // TODO: Navigate to quiz taking page
                                window.location.href = `/quiz/${quiz.id}`
                              }}
                            >
                              Commencer le Quiz
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Family Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-white">
                      <Star className="h-5 w-5 mr-2" />
                      Meilleur Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{engagementStats.bestScore}%</div>
                    <div className="text-blue-100 text-sm">
                      Meilleur score
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
                    <div className={`text-3xl font-bold ${getScoreColor(engagementStats.averageScore)}`}>
                      {engagementStats.averageScore}%
                    </div>
                    <Progress value={engagementStats.averageScore} className="mt-2" />
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
                    <div className="text-3xl font-bold">{engagementStats.thisWeekQuizzes}</div>
                    <div className="text-yellow-100 text-sm">
                      quiz cette semaine
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
                      Mes Performances
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
                      <span className="text-sm text-gray-600">{engagementStats.thisWeekQuizzes} quiz</span>
                    </div>
                    <Progress value={Math.min(engagementStats.thisWeekQuizzes * 10, 100)} className="h-2" />
                    
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
                          <span className="font-medium">{engagementStats.thisWeekQuizzes}</span>
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
                        <p className="text-sm text-gray-400">Commencez un quiz pour voir vos progrès.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
                          </TabsContent>
            
            <TabsContent value="progress">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Mes Progrès</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Activité Récente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.length === 0 ? (
                      <p className="text-gray-600 text-center py-8">Aucune activité enregistrée</p>
                    ) : (
                      <div className="space-y-3">
                        {submissions.slice(0, 10).map((submission) => (
                          <div key={submission.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{submission.quiz?.title || 'Quiz sans titre'}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(submission.created_at).toLocaleDateString()} • {submission.quiz?.level || 'N/A'}
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