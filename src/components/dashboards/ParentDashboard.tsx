'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getSubmissionsByParent, getParentStats, getAvailableQuizzesForParent } from '@/lib/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  TrendingUp, 
  Star,
  Calendar,
  CheckCircle,
  AlertCircle,
  User,
  Users,
  Loader2,
  LogOut,
  BarChart3
} from 'lucide-react'

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
  const { profile, schoolName, signOut } = useAuth()
  const router = useRouter()
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
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="card-secondary border-b-0 rounded-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <Image 
                  src="/logo-principal.png" 
                  alt="Futur Génie" 
                  width={40} 
                  height={40} 
                  className="mr-3"
                />
                <div className="gradient-primary p-3 rounded-xl">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Bonjour {profile?.full_name?.split(' ')[0] || 'Parent'}</h1>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Ton espace personnel pour apprendre et t'amuser</span>
                  {schoolName && (
                    <>
                      <span>•</span>
                      <span className="text-blue-400 font-medium">{schoolName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="btn-gradient gradient-accent hover-lift px-4 py-2 rounded-lg text-white font-medium text-sm transition-all duration-200 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="card-dark p-4 mb-6 border-red-500/20 bg-red-500/10">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
        
        <div>
          {/* Modern tabs with gradient indicators */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="card-secondary p-1 rounded-xl">
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'overview' 
                      ? 'gradient-primary text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span className="hidden sm:inline">Activités</span>
                  <span className="sm:hidden">Quiz</span>
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'progress' 
                      ? 'gradient-secondary text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span className="hidden sm:inline">Mes Progrès</span>
                  <span className="sm:hidden">Progrès</span>
                </button>
                <button
                  onClick={() => setActiveTab('communication')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'communication' 
                      ? 'gradient-warm text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span className="hidden sm:inline">Communication</span>
                  <span className="sm:hidden">Messages</span>
                </button>
              </div>
            </div>
            
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recommended Activities Section */}
                {availableQuizzes.length > 0 ? (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Activités recommandées</h2>
                      <p className="text-slate-400">Ces activités ont été spécialement choisies pour toi</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {availableQuizzes.map((quiz) => (
                        <div 
                          key={quiz.id} 
                          className={`card-dark hover-lift p-6 relative overflow-hidden ${
                            quiz.isCompleted ? 'opacity-75' : ''
                          }`}
                        >
                          {/* Gradient accent */}
                          <div className="absolute top-0 left-0 w-full h-1 gradient-primary"></div>
                          
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold mb-2 ${quiz.isCompleted ? 'text-slate-400' : 'text-white'}`}>
                                {quiz.title}
                              </h3>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full">
                                  {quiz.level}
                                </span>
                                {quiz.isCompleted && (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {quiz.description && (
                            <p className={`text-sm mb-4 ${quiz.isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>
                              {quiz.description}
                            </p>
                          )}
                          
                          {quiz.isCompleted && quiz.lastSubmissionDate && (
                            <div className="text-xs text-slate-500 mb-4">
                              Effectué le {new Date(quiz.lastSubmissionDate).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                          
                          <button 
                            className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                              quiz.isCompleted 
                                ? 'bg-slate-600 hover:bg-slate-500 text-slate-300' 
                                : 'btn-gradient gradient-primary text-white hover-lift'
                            }`}
                            onClick={() => {
                              console.log('Navigating to quiz:', quiz.id)
                              router.push(`/quiz/${quiz.id}`)
                            }}
                          >
                            {quiz.isCompleted ? 'Rejouer le Quiz' : 'Commencer le Quiz'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card-dark p-8 text-center">
                    <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Aucune activité disponible</h3>
                    <p className="text-slate-400">Votre enseignant(e) n'a pas encore publié de quiz pour votre classe.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'progress' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mes Progrès</h2>
                  <p className="text-slate-400">Découvre tes performances et tes réussites</p>
                </div>
                
                {/* Statistics Grid with modern gradient cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="card-dark hover-lift p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 gradient-primary"></div>
                    <div className="flex items-center mb-3">
                      <div className="gradient-primary p-2 rounded-lg mr-3">
                        <Star className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-400">Meilleur Score</h3>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{engagementStats.bestScore}%</div>
                    <p className="text-xs text-slate-500">Record personnel</p>
                  </div>
                  
                  <div className="card-dark hover-lift p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 gradient-secondary"></div>
                    <div className="flex items-center mb-3">
                      <div className="gradient-secondary p-2 rounded-lg mr-3">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-400">Quiz Complétés</h3>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{engagementStats.totalQuizzesTaken}</div>
                    <p className="text-xs text-slate-500">au total</p>
                  </div>
                  
                  <div className="card-dark hover-lift p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 gradient-accent"></div>
                    <div className="flex items-center mb-3">
                      <div className="gradient-accent p-2 rounded-lg mr-3">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-400">Score Moyen</h3>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{engagementStats.averageScore}%</div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                      <div 
                        className="gradient-accent h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${engagementStats.averageScore}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="card-dark hover-lift p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 gradient-warm"></div>
                    <div className="flex items-center mb-3">
                      <div className="gradient-warm p-2 rounded-lg mr-3">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-400">Cette Semaine</h3>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{engagementStats.thisWeekQuizzes}</div>
                    <p className="text-xs text-slate-500">quiz cette semaine</p>
                  </div>
                </div>

                {/* Detailed Performance Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card-dark p-6">
                    <div className="flex items-center mb-6">
                      <div className="gradient-primary p-3 rounded-xl mr-4">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">Mes Performances</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Score moyen général</span>
                        <span className="text-sm text-white font-semibold">{engagementStats.averageScore}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="gradient-primary h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${engagementStats.averageScore}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Activité récente</span>
                        <span className="text-sm text-white font-semibold">{engagementStats.thisWeekQuizzes} quiz</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="gradient-secondary h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(engagementStats.thisWeekQuizzes * 10, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="text-center p-4 card-secondary rounded-lg">
                          <div className="text-lg font-bold text-blue-400">{engagementStats.totalQuizzesTaken}</div>
                          <div className="text-xs text-slate-400">Quiz Total</div>
                        </div>
                        <div className="text-center p-4 card-secondary rounded-lg">
                          <div className="text-lg font-bold text-yellow-400">{engagementStats.perfectScores}</div>
                          <div className="text-xs text-slate-400">Scores Parfaits</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-dark p-6">
                    <div className="flex items-center mb-6">
                      <div className="gradient-accent p-3 rounded-xl mr-4">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">Activité Récente</h3>
                    </div>
                    
                    {engagementStats.totalQuizzesTaken > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 card-secondary rounded-lg">
                          <span className="text-sm font-medium text-slate-300">Quiz cette semaine</span>
                          <span className="font-semibold text-white">{engagementStats.thisWeekQuizzes}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 card-secondary rounded-lg">
                          <span className="text-sm font-medium text-slate-300">Score moyen</span>
                          <span className="font-semibold text-white">{engagementStats.averageScore}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 card-secondary rounded-lg">
                          <span className="text-sm font-medium text-slate-300">Scores parfaits</span>
                          <span className="font-semibold text-white">{engagementStats.perfectScores}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-600">
                          <div className="text-sm font-medium text-slate-300 mb-3">Taux de réussite</div>
                          <div className="flex items-center">
                            <div className="flex-1 bg-slate-700 rounded-full h-2 mr-3">
                              <div 
                                className="gradient-warm h-2 rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${engagementStats.totalQuizzesTaken > 0 ? 
                                    (engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {engagementStats.totalQuizzesTaken > 0 ? 
                                `${Math.round((engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100)}%` : 
                                '0%'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-slate-300 mb-2">Aucune activité récente</p>
                        <p className="text-sm text-slate-500">Commencez un quiz pour voir vos progrès.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-dark p-6">
                  <div className="flex items-center mb-6">
                    <div className="gradient-warm p-3 rounded-xl mr-4">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Historique Détaillé</h3>
                  </div>
                  
                  {submissions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-slate-300 mb-2">Aucune activité enregistrée</p>
                      <p className="text-sm text-slate-500">Tes résultats apparaîtront ici après ton premier quiz.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.slice(0, 10).map((submission) => {
                        const scorePercentage = Math.round((submission.score / submission.total_questions) * 100);
                        return (
                          <div key={submission.id} className="flex justify-between items-center p-4 card-secondary rounded-lg hover-lift">
                            <div className="flex-1">
                              <div className="font-semibold text-white mb-1">{submission.quiz?.title || 'Quiz sans titre'}</div>
                              <div className="text-sm text-slate-400">
                                {new Date(submission.created_at).toLocaleDateString('fr-FR')} • {submission.quiz?.level || 'N/A'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-bold mb-1 ${
                                scorePercentage >= 80 ? 'text-green-400' : 
                                scorePercentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {scorePercentage}%
                              </div>
                              <div className="text-sm text-slate-500">
                                {submission.score}/{submission.total_questions}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'communication' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Communication</h2>
                  <p className="text-slate-400">Reste en contact avec ton enseignant(e)</p>
                </div>
                
                <div className="card-dark p-8 text-center">
                  <div className="gradient-warm p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">Bientôt disponible !</h3>
                  <p className="text-slate-400 mb-6">Les fonctionnalités de communication seront disponibles prochainement</p>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <button className="w-full py-3 px-4 bg-slate-600 text-slate-400 rounded-lg font-medium cursor-not-allowed">
                      Contacter l'enseignant
                    </button>
                    <button className="w-full py-3 px-4 bg-slate-600 text-slate-400 rounded-lg font-medium cursor-not-allowed">
                      Voir les annonces de classe
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  )
}