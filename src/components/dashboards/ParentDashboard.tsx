'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getSubmissionsByParent, getParentStats, getAvailableQuizzesForParent, getTeacherByClassroom } from '@/lib/database'
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
  const { profile, schoolName, signOut, claims } = useAuth()
  const [teacherInfo, setTeacherInfo] = useState<{ full_name: string } | null>(null)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [submissions, setSubmissions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
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
    const fetchData = async () => {
      if (!profile?.id || !claims?.schoolId || !claims?.classroomId) return

      try {
        setLoading(true)
        setError(null)

        // Fetch all data in parallel
        const [submissionsData, statsData, quizzesData, teacherData] = await Promise.all([
          getSubmissionsByParent(profile.id),
          getParentStats(profile.id),
          getAvailableQuizzesForParent(),
          getTeacherByClassroom(claims.classroomId)
        ])

        setSubmissions(submissionsData || [])
        setStats(statsData)
        setAvailableQuizzes(quizzesData || [])
        setTeacherInfo(teacherData)

        // Calculate engagement stats
        if (submissionsData && submissionsData.length > 0) {
          const totalQuizzes = submissionsData.length
          const totalScore = submissionsData.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0)
          const averageScore = totalScore / totalQuizzes
          const perfectScores = submissionsData.filter((sub: any) => sub.score === sub.total_questions).length
          const bestScore = Math.max(...submissionsData.map((sub: any) => sub.score || 0))
          
          // Calculate this week's quizzes (simplified - you might want to use a proper date library)
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          const thisWeekQuizzes = submissionsData.filter((sub: any) => 
            new Date(sub.created_at) > oneWeekAgo
          ).length

          setEngagementStats({
            totalQuizzesTaken: totalQuizzes,
            averageScore: Math.round(averageScore * 100) / 100,
            thisWeekQuizzes,
            perfectScores,
            bestScore
          })
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Erreur lors du chargement des données. Veuillez réessayer.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id, claims?.schoolId, claims?.classroomId])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30"></div>
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Modern Header with Enhanced Gradients */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 to-slate-900/90"></div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50"></div>
                <Image 
                  src="/logo-principal.png" 
                  alt="Futur Génie" 
                  width={32} 
                  height={32}
                  className="relative w-8 h-8 sm:w-10 sm:h-10"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-400">
                  <span className="break-words hidden sm:inline">Construis ton potentiel</span>
                  {schoolName && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-blue-400 font-medium break-words">{schoolName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="text-slate-400 hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-slate-700/30"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Greeting Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-gradient-to-r from-white to-slate-200 bg-clip-text">
          Bonjour {profile?.full_name?.split(' ')[0] || 'Parent'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          École: {schoolName || 'Futur Génie'}
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="relative overflow-hidden bg-gradient-to-r from-red-600/20 to-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-red-500/5"></div>
            <div className="relative flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm break-words">{error}</span>
            </div>
          </div>
        )}
        
        <div>
          {/* Enhanced Modern Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 p-1 rounded-xl sm:rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
              <div className="relative grid grid-cols-3 gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`relative px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 overflow-hidden ${
                    activeTab === 'overview' 
                      ? 'text-white shadow-lg transform scale-105' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50 hover:scale-102'
                  }`}
                >
                  {activeTab === 'overview' && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl"></div>
                    </>
                  )}
                  <span className="relative flex items-center justify-center gap-1">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Activités</span>
                    <span className="sm:hidden">Quiz</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`relative px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 overflow-hidden ${
                    activeTab === 'progress' 
                      ? 'text-white shadow-lg transform scale-105' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50 hover:scale-102'
                  }`}
                >
                  {activeTab === 'progress' && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-90"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-xl"></div>
                    </>
                  )}
                  <span className="relative flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Mes Progrès</span>
                    <span className="sm:hidden">Progrès</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('communication')}
                  className={`relative px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 overflow-hidden ${
                    activeTab === 'communication' 
                      ? 'text-white shadow-lg transform scale-105' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50 hover:scale-102'
                  }`}
                >
                  {activeTab === 'communication' && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-red-600 opacity-90"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-red-600/20 blur-xl"></div>
                    </>
                  )}
                  <span className="relative flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Communication</span>
                    <span className="sm:hidden">Messages</span>
                  </span>
                </button>
              </div>
            </div>
            
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Enhanced Recommended Activities Section */}
                {availableQuizzes.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="text-center mb-6 sm:mb-8">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text mb-2">
                        Activités proposées par {teacherInfo?.full_name || 'ton enseignant(e)'}
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {availableQuizzes
                        .sort((a, b) => {
                          // Sort uncompleted quizzes first
                          if (a.isCompleted && !b.isCompleted) return 1
                          if (!a.isCompleted && b.isCompleted) return -1
                          return 0
                        })
                        .map((quiz) => (
                        <div 
                          key={quiz.id} 
                          className={`group relative overflow-hidden transition-all duration-300 hover:scale-105 h-32 ${
                            quiz.isCompleted ? 'opacity-75' : ''
                          }`}
                        >
                          <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl p-3 hover:border-slate-500/60 transition-all duration-300 h-full flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                            
                            <div className="flex-1 mb-2">
                              <h3 className={`text-xs sm:text-sm font-semibold mb-1 break-words line-clamp-2 ${
                                quiz.isCompleted ? 'text-slate-400' : 'text-white'
                              }`}>
                                {quiz.title}
                              </h3>
                              
                              {quiz.isCompleted && quiz.lastSubmissionDate && (
                                <div className="text-xs text-slate-500 mb-1">
                                  {new Date(quiz.lastSubmissionDate).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                              
                              {quiz.isCompleted && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-400" />
                                  <span className="text-xs text-green-400 font-medium">Terminé</span>
                                </div>
                              )}
                            </div>
                            
                            <button 
                              className={`w-full py-1.5 px-2 rounded-md font-medium text-xs transition-all duration-300 ${
                                quiz.isCompleted 
                                  ? 'bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white' 
                                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                              }`}
                              onClick={() => {
                                console.log('Navigating to quiz:', quiz.id)
                                router.push(`/quiz/${quiz.id}`)
                              }}
                            >
                              {quiz.isCompleted ? 'Rejouer' : 'Commencer'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl blur-2xl"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                      <div className="relative mb-4 sm:mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30"></div>
                        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
                          <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Aucune activité disponible</h3>
                      <p className="text-slate-400 text-sm sm:text-base">{teacherInfo?.full_name || 'Ton enseignant(e)'} n'a pas encore publié de quiz pour ta classe.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'progress' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text mb-2">Mes Progrès</h2>
                  <p className="text-slate-400 text-sm sm:text-base">Découvre tes performances et tes réussites</p>
                </div>
                
                {/* Enhanced Statistics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  <div className="group relative overflow-hidden transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-xl sm:rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 hover:border-slate-500/60 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-blue-600/10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-3 gap-2">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-medium text-slate-400 break-words">Meilleur Score</h3>
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1">{engagementStats.bestScore}%</div>
                      <p className="text-xs text-slate-500">Record personnel</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-xl sm:rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 hover:border-slate-500/60 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-600/10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-3 gap-2">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-medium text-slate-400 break-words">Quiz Complétés</h3>
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1">{engagementStats.totalQuizzesTaken}</div>
                      <p className="text-xs text-slate-500">au total</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-red-600/10 rounded-xl sm:rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 hover:border-slate-500/60 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-pink-600/10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-red-600"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-3 gap-2">
                        <div className="bg-gradient-to-r from-pink-600 to-red-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                          <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-medium text-slate-400 break-words">Score Moyen</h3>
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1">{engagementStats.averageScore}%</div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 sm:h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-pink-600 to-red-600 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${engagementStats.averageScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-yellow-600/10 rounded-xl sm:rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 hover:border-slate-500/60 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-orange-600/10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-yellow-600"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-3 gap-2">
                        <div className="bg-gradient-to-r from-orange-600 to-yellow-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-medium text-slate-400 break-words">Cette Semaine</h3>
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1">{engagementStats.thisWeekQuizzes}</div>
                      <p className="text-xs text-slate-500">quiz cette semaine</p>
                    </div>
                  </div>
                </div>

                {/* Enhanced Detailed Performance Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 rounded-xl sm:rounded-2xl blur-2xl"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <div className="flex items-center mb-4 sm:mb-6">
                        <div className="relative mr-3 sm:mr-4">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-30"></div>
                          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 sm:p-3 rounded-xl">
                            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Mes Performances</h3>
                      </div>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-slate-300 break-words">Score moyen général</span>
                          <span className="text-xs sm:text-sm text-white font-semibold flex-shrink-0">{engagementStats.averageScore}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 sm:h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-1.5 sm:h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${engagementStats.averageScore}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-slate-300 break-words">Activité récente</span>
                          <span className="text-xs sm:text-sm text-white font-semibold flex-shrink-0">{engagementStats.thisWeekQuizzes} quiz</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 sm:h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 sm:h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(engagementStats.thisWeekQuizzes * 10, 100)}%` }}
                          ></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                          <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-lg">
                            <div className="text-base sm:text-lg font-bold text-blue-400">{engagementStats.totalQuizzesTaken}</div>
                            <div className="text-xs text-slate-400">Quiz Total</div>
                          </div>
                          <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-lg">
                            <div className="text-base sm:text-lg font-bold text-yellow-400">{engagementStats.perfectScores}</div>
                            <div className="text-xs text-slate-400">Scores Parfaits</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-600/5 to-orange-600/5 rounded-xl sm:rounded-2xl blur-2xl"></div>
                    <div className="relative bg-gradient-to-br from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <div className="flex items-center mb-4 sm:mb-6">
                        <div className="relative mr-3 sm:mr-4">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-orange-600 rounded-xl blur-lg opacity-30"></div>
                          <div className="relative bg-gradient-to-r from-pink-600 to-orange-600 p-2 sm:p-3 rounded-xl">
                            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Activité Récente</h3>
                      </div>
                      
                      {engagementStats.totalQuizzesTaken > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-gradient-to-br from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-lg">
                            <span className="text-xs sm:text-sm font-medium text-slate-300 break-words">Quiz cette semaine</span>
                            <span className="font-semibold text-white flex-shrink-0">{engagementStats.thisWeekQuizzes}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-gradient-to-br from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-lg">
                            <span className="text-xs sm:text-sm font-medium text-slate-300 break-words">Score moyen</span>
                            <span className="font-semibold text-white flex-shrink-0">{engagementStats.averageScore}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-gradient-to-br from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-lg">
                            <span className="text-xs sm:text-sm font-medium text-slate-300 break-words">Scores parfaits</span>
                            <span className="font-semibold text-white flex-shrink-0">{engagementStats.perfectScores}</span>
                          </div>
                          <div className="pt-3 sm:pt-4 border-t border-slate-600">
                            <div className="text-xs sm:text-sm font-medium text-slate-300 mb-2 sm:mb-3">Taux de réussite</div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="flex-1 bg-slate-700 rounded-full h-1.5 sm:h-2">
                                <div 
                                  className="bg-gradient-to-r from-orange-600 to-yellow-600 h-1.5 sm:h-2 rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${engagementStats.totalQuizzesTaken > 0 ? 
                                      (engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100 : 0}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs sm:text-sm font-semibold text-white flex-shrink-0">
                                {engagementStats.totalQuizzesTaken > 0 ? 
                                  `${Math.round((engagementStats.perfectScores / engagementStats.totalQuizzesTaken) * 100)}%` : 
                                  '0%'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <div className="relative mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-orange-600 rounded-full blur-lg opacity-30"></div>
                            <div className="relative bg-gradient-to-r from-pink-600 to-orange-600 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
                              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>
                          </div>
                          <p className="text-slate-300 mb-2 text-sm sm:text-base">Aucune activité récente</p>
                          <p className="text-xs sm:text-sm text-slate-500">Commencez un quiz pour voir vos progrès.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-yellow-600/5 rounded-xl sm:rounded-2xl blur-2xl"></div>
                  <div className="relative bg-gradient-to-br from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center mb-4 sm:mb-6">
                      <div className="relative mr-3 sm:mr-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl blur-lg opacity-30"></div>
                        <div className="relative bg-gradient-to-r from-orange-600 to-yellow-600 p-2 sm:p-3 rounded-xl">
                          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white">Historique Détaillé</h3>
                    </div>
                    
                    {submissions.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <div className="relative mb-4">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full blur-lg opacity-30"></div>
                          <div className="relative bg-gradient-to-r from-orange-600 to-yellow-600 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
                            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                          </div>
                        </div>
                        <p className="text-slate-300 mb-2 text-sm sm:text-base">Aucune activité enregistrée</p>
                        <p className="text-xs sm:text-sm text-slate-500">Tes résultats apparaîtront ici après ton premier quiz.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {submissions.slice(0, 10).map((submission) => {
                          const scorePercentage = Math.round((submission.score / submission.total_questions) * 100);
                          return (
                            <div key={submission.id} className="group relative overflow-hidden transition-all duration-300 hover:scale-102">
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-lg blur-lg group-hover:blur-xl transition-all"></div>
                              <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-br from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-lg hover:border-slate-400/50 transition-all duration-300">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white mb-1 text-sm sm:text-base break-words">{submission.quiz?.title || 'Quiz sans titre'}</div>
                                  <div className="text-xs sm:text-sm text-slate-400">
                                    {new Date(submission.created_at).toLocaleDateString('fr-FR')} • {submission.quiz?.level || 'N/A'}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`text-lg sm:text-xl font-bold mb-1 ${
                                    scorePercentage >= 80 ? 'text-green-400' : 
                                    scorePercentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                                  }`}>
                                    {scorePercentage}%
                                  </div>
                                  <div className="text-xs sm:text-sm text-slate-500">
                                    {submission.score}/{submission.total_questions}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'communication' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white via-pink-100 to-red-100 bg-clip-text mb-2">Communication</h2>
                  <p className="text-slate-400 text-sm sm:text-base">Reste en contact avec ton enseignant(e)</p>
                </div>
                
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600/5 to-red-600/5 rounded-2xl blur-2xl"></div>
                  <div className="relative bg-gradient-to-br from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                    <div className="relative mb-4 sm:mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-red-600 rounded-full blur-lg opacity-30"></div>
                      <div className="relative bg-gradient-to-r from-pink-600 to-red-600 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Bientôt disponible !</h3>
                    <p className="text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">Les fonctionnalités de communication seront disponibles prochainement</p>
                    <div className="space-y-2 sm:space-y-3 max-w-xs sm:max-w-sm mx-auto">
                      <button className="w-full py-2.5 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-400 rounded-lg font-medium cursor-not-allowed text-sm sm:text-base transition-all">
                        Contacter l'enseignant
                      </button>
                      <button className="w-full py-2.5 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-400 rounded-lg font-medium cursor-not-allowed text-sm sm:text-base transition-all">
                        Voir les annonces de classe
                      </button>
                    </div>
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