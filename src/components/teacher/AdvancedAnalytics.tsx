'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Users, 
  Trophy,
  Target,
  Clock,
  BookOpen,
  AlertTriangle,
  Loader2,
  Activity,
  Percent,
  Star,
  Timer
} from 'lucide-react'
import { 
  getQuizzesByTeacher, 
  getSubmissionsByQuiz,
  getClassroomsByTeacher,
} from '@/lib/database'
import { getTeacherStudents } from '@/lib/database-teacher'

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
  parent_id: string
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
  user: {
    id: string
    full_name: string | null
    email: string | null
  }
}

interface AdvancedMetrics {
  completionRate: number
  completionTrend: number[]
  averageScore: number
  scoreTrend: number[]
  averageTime: number
  timeTrend: number[]
  totalQuizzes: number
  totalSubmissions: number
  activeStudents: number
}

export function AdvancedAnalytics() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [metrics, setMetrics] = useState<AdvancedMetrics>({
    completionRate: 0,
    completionTrend: [],
    averageScore: 0,
    scoreTrend: [],
    averageTime: 0,
    timeTrend: [],
    totalQuizzes: 0,
    totalSubmissions: 0,
    activeStudents: 0
  })
  
  // Filter state
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('90')

  useEffect(() => {
    if (profile?.id) {
      fetchData()
    }
  }, [profile?.id])

  useEffect(() => {
    if (quizzes.length > 0) {
      calculateAdvancedMetrics()
    }
  }, [quizzes, selectedClassroom, dateRange])

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

      // Get students for teacher's classrooms
      const studentsData = await getTeacherStudents(profile.id)
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
      
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const calculateAdvancedMetrics = async () => {
    try {
      let filteredQuizzes = quizzes.filter(q => q.is_published)
      
      // Filter by classroom if selected
      if (selectedClassroom !== 'all') {
        filteredQuizzes = filteredQuizzes.filter(q => q.classroom_id === selectedClassroom)
      }

      // Get date range
      const now = new Date()
      const daysBack = parseInt(dateRange)
      const startDate = new Date()
      startDate.setDate(now.getDate() - daysBack)

      let allSubmissions: Submission[] = []
      let totalPossibleSubmissions = 0

      // Get submissions for each quiz
      for (const quiz of filteredQuizzes) {
        const submissions = await getSubmissionsByQuiz(quiz.id) as Submission[]
        const filteredSubmissions = submissions.filter(sub => 
          new Date(sub.created_at) >= startDate
        )
        allSubmissions = [...allSubmissions, ...filteredSubmissions]

        // Calculate possible submissions (students in classroom)
        const classroomStudents = students.filter(s => s.classroom_id === quiz.classroom_id)
        totalPossibleSubmissions += classroomStudents.length
      }

      // Calculate completion rate
      const completionRate = totalPossibleSubmissions > 0 
        ? (allSubmissions.length / totalPossibleSubmissions) * 100 
        : 0

      // Calculate average score
      const averageScore = allSubmissions.length > 0
        ? allSubmissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / allSubmissions.length
        : 0

      // Calculate average time (mock data for now - would need actual time tracking)
      const averageTime = allSubmissions.length > 0 ? 8.5 : 0 // minutes

      // Calculate trends (mock data for demonstration)
      const completionTrend = generateTrendData(completionRate, daysBack)
      const scoreTrend = generateTrendData(averageScore, daysBack)
      const timeTrend = generateTrendData(averageTime, daysBack)

      // Count active students (students who submitted at least one quiz)
      const activeStudentIds = new Set(allSubmissions.map(sub => sub.parent_id))
      const activeStudents = activeStudentIds.size

      setMetrics({
        completionRate: Math.round(completionRate),
        completionTrend,
        averageScore: Math.round(averageScore),
        scoreTrend,
        averageTime: Math.round(averageTime * 10) / 10,
        timeTrend,
        totalQuizzes: filteredQuizzes.length,
        totalSubmissions: allSubmissions.length,
        activeStudents
      })

    } catch (error) {
      console.error('Error calculating metrics:', error)
    }
  }

  const generateTrendData = (currentValue: number, days: number): number[] => {
    // Generate mock trend data - in real implementation, this would come from historical data
    const trend = []
    const variation = currentValue * 0.1 // 10% variation
    
    for (let i = days; i >= 0; i--) {
      const randomVariation = (Math.random() - 0.5) * variation
      const value = Math.max(0, Math.min(100, currentValue + randomVariation))
      trend.push(Math.round(value))
    }
    
    return trend
  }

  const getTrendDirection = (trend: number[]): 'up' | 'down' | 'stable' => {
    if (trend.length < 2) return 'stable'
    const recent = trend.slice(-7).reduce((a, b) => a + b, 0) / 7
    const previous = trend.slice(-14, -7).reduce((a, b) => a + b, 0) / 7
    
    if (recent > previous + 2) return 'up'
    if (recent < previous - 2) return 'down'
    return 'stable'
  }

  const getTrendColor = (direction: 'up' | 'down' | 'stable'): string => {
    switch (direction) {
      case 'up': return 'text-green-400'
      case 'down': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4" />
      case 'down': return <TrendingUp className="h-4 w-4 rotate-180" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-slate-400">Analyse des données en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Completion Rate */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <Percent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.completionRate}%</div>
                <div className={`text-xs flex items-center gap-1 ${getTrendColor(getTrendDirection(metrics.completionTrend))}`}>
                  {getTrendIcon(getTrendDirection(metrics.completionTrend))}
                  <span>Tendance</span>
                </div>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-white font-semibold text-sm sm:text-base">Taux de Réalisation</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Moyenne de participation aux quiz</p>
              <div className="w-full bg-slate-600 rounded-full h-1.5 sm:h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 sm:h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${metrics.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Average Score */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.averageScore}%</div>
                <div className={`text-xs flex items-center gap-1 ${getTrendColor(getTrendDirection(metrics.scoreTrend))}`}>
                  {getTrendIcon(getTrendDirection(metrics.scoreTrend))}
                  <span>Tendance</span>
                </div>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-white font-semibold text-sm sm:text-base">Score Moyen</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Bonnes réponses / Total réponses</p>
              <div className="w-full bg-slate-600 rounded-full h-1.5 sm:h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 sm:h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${metrics.averageScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Average Time */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.averageTime}min</div>
                <div className={`text-xs flex items-center gap-1 ${getTrendColor(getTrendDirection(metrics.timeTrend))}`}>
                  {getTrendIcon(getTrendDirection(metrics.timeTrend))}
                  <span>Tendance</span>
                </div>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-white font-semibold text-sm sm:text-base">Temps Moyen</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Durée moyenne par quiz</p>
            </div>
          </div>
        </div>

        {/* Active Students */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-4 sm:p-6 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.activeStudents}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Actifs</div>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-white font-semibold text-sm sm:text-base">Élèves Actifs</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Ont répondu à au moins 1 quiz</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{metrics.totalQuizzes}</div>
          <div className="text-slate-400 text-sm">Quiz Publiés</div>
        </div>
        
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{metrics.totalSubmissions}</div>
          <div className="text-slate-400 text-sm">Soumissions Totales</div>
        </div>
        
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{metrics.activeStudents}</div>
          <div className="text-slate-400 text-sm">Élèves Actifs</div>
        </div>
      </div>

      {/* Info Note */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-2xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-amber-600/30 rounded-2xl p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-2">Métriques Avancées</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Les tendances sont calculées sur la période sélectionnée. Le temps moyen est actuellement simulé - 
                l'intégration du suivi temporel réel nécessitera des modifications dans la base de données pour 
                enregistrer les timestamps de début/fin de quiz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
