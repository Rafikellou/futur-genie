'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Target,
  Clock,
  AlertTriangle,
  Loader2,
  Activity,
  Percent,
  Star,
  Timer,
  BarChart3
} from 'lucide-react'
import { 
  getQuizzesByTeacher, 
  getClassroomsByTeacher,
  getUsersBySchool,
  getSubmissionsByTeacher,
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
  parent_id: string
  answers: any
  score: number
  total_questions: number
  quiz_duration_minutes?: number | null
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

interface WeeklyMetrics {
  week: string
  completionRate: number
  averageScore: number
  averageTime: number
  submissions: number
}

interface AnalyticsMetrics {
  completionRate: number
  completionEvolution: WeeklyMetrics[]
  averageScore: number
  scoreEvolution: WeeklyMetrics[]
  averageTime: number
  timeEvolution: WeeklyMetrics[]
}

export function TeacherAnalytics() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    completionRate: 0,
    completionEvolution: [],
    averageScore: 0,
    scoreEvolution: [],
    averageTime: 0,
    timeEvolution: []
  })

  useEffect(() => {
    if (profile?.id) {
      fetchData()
    }
  }, [profile?.id])

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

      // Get students (parents) for teacher's school
      const studentsData = await getUsersBySchool(profile.school_id || '')
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

      // Get all submissions for teacher
      const allSubmissions = await getSubmissionsByTeacher(profile.id) as Submission[]
      setSubmissions(allSubmissions)
      
      // Calculate metrics
      calculateMetrics(teacherQuizzes as Quiz[], transformedStudents as Student[], allSubmissions)
      
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (quizzes: Quiz[], students: Student[], submissions: Submission[]) => {
    const publishedQuizzes = quizzes.filter(q => q.is_published)
    const totalParents = students.length
    
    // Calculate overall completion rate
    const totalPossibleSubmissions = publishedQuizzes.length * totalParents
    const completionRate = totalPossibleSubmissions > 0 
      ? (submissions.length / totalPossibleSubmissions) * 100 
      : 0

    // Calculate overall average score
    const averageScore = submissions.length > 0
      ? submissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / submissions.length
      : 0

    // Calculate overall average time
    const validTimeSubmissions = submissions.filter(sub => sub.quiz_duration_minutes != null)
    const averageTime = validTimeSubmissions.length > 0
      ? validTimeSubmissions.reduce((sum, sub) => sum + (sub.quiz_duration_minutes || 0), 0) / validTimeSubmissions.length
      : 0

    // Calculate weekly evolution for the last 30 days (4 weeks)
    const now = new Date()
    const weeklyData: WeeklyMetrics[] = []
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i + 1) * 7)
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - i * 7)
      
      const weekSubmissions = submissions.filter(sub => {
        const subDate = new Date(sub.created_at)
        return subDate >= weekStart && subDate < weekEnd
      })
      
      const weekQuizzes = publishedQuizzes.filter(quiz => {
        const quizDate = new Date(quiz.created_at)
        return quizDate < weekEnd // Only count quizzes that existed during this week
      })
      
      const weekPossibleSubmissions = weekQuizzes.length * totalParents
      const weekCompletionRate = weekPossibleSubmissions > 0 
        ? (weekSubmissions.length / weekPossibleSubmissions) * 100 
        : 0
      
      const weekAverageScore = weekSubmissions.length > 0
        ? weekSubmissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / weekSubmissions.length
        : 0
      
      const weekValidTimeSubmissions = weekSubmissions.filter(sub => sub.quiz_duration_minutes != null)
      const weekAverageTime = weekValidTimeSubmissions.length > 0
        ? weekValidTimeSubmissions.reduce((sum, sub) => sum + (sub.quiz_duration_minutes || 0), 0) / weekValidTimeSubmissions.length
        : 0
      
      weeklyData.push({
        week: `S${4-i}`,
        completionRate: Math.round(weekCompletionRate),
        averageScore: Math.round(weekAverageScore),
        averageTime: Math.round(weekAverageTime * 10) / 10,
        submissions: weekSubmissions.length
      })
    }

    setMetrics({
      completionRate: Math.round(completionRate),
      completionEvolution: weeklyData,
      averageScore: Math.round(averageScore),
      scoreEvolution: weeklyData,
      averageTime: Math.round(averageTime * 10) / 10,
      timeEvolution: weeklyData
    })
  }

  const renderHistogram = (data: WeeklyMetrics[], dataKey: keyof WeeklyMetrics, color: string, unit: string = '') => {
    if (data.length === 0) return null
    
    const maxValue = Math.max(...data.map(d => d[dataKey] as number))
    
    return (
      <div className="flex items-end space-x-2 h-16">
        {data.map((week, index) => {
          const value = week[dataKey] as number
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-slate-600/30 rounded-t relative" style={{ height: '48px' }}>
                <div 
                  className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${color}`}
                  style={{ height: `${height}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-400 mt-1">{week.week}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const getTrendDirection = (data: WeeklyMetrics[], dataKey: keyof WeeklyMetrics): 'up' | 'down' | 'stable' => {
    if (data.length < 2) return 'stable'
    const recent = data[data.length - 1][dataKey] as number
    const previous = data[data.length - 2][dataKey] as number
    
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
      case 'down': return <TrendingDown className="h-4 w-4" />
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

      {/* Main Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Taux de réalisation moyen */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-xl">
                <Percent className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{metrics.completionRate}%</div>
                <div className={`text-xs flex items-center gap-1 ${getTrendColor(getTrendDirection(metrics.completionEvolution, 'completionRate'))}`}>
                  {getTrendIcon(getTrendDirection(metrics.completionEvolution, 'completionRate'))}
                  <span>Tendance</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Taux de Réalisation Moyen</h3>
              <p className="text-slate-400 text-sm">Parents ayant répondu / Total des parents</p>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${metrics.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Évolution du taux de réalisation */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-blue-400 to-cyan-400 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">30 derniers jours</div>
            </div>
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Évolution du Taux de Réalisation</h3>
              <p className="text-slate-400 text-sm">Progression hebdomadaire</p>
              {renderHistogram(metrics.completionEvolution, 'completionRate', 'bg-gradient-to-t from-blue-500 to-cyan-400', '%')}
            </div>
          </div>
        </div>

        {/* 3. Score moyen */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{metrics.averageScore}%</div>
                <div className={`text-xs flex items-center gap-1 ${getTrendColor(getTrendDirection(metrics.scoreEvolution, 'averageScore'))}`}>
                  {getTrendIcon(getTrendDirection(metrics.scoreEvolution, 'averageScore'))}
                  <span>Tendance</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Score Moyen</h3>
              <p className="text-slate-400 text-sm">Bonnes réponses de tous les parents</p>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${metrics.averageScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Évolution du score moyen */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-green-400 to-emerald-400 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">30 derniers jours</div>
            </div>
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Évolution du Score</h3>
              <p className="text-slate-400 text-sm">Progression hebdomadaire</p>
              {renderHistogram(metrics.scoreEvolution, 'averageScore', 'bg-gradient-to-t from-green-500 to-emerald-400', '%')}
            </div>
          </div>
        </div>

        {/* 5. Temps moyen passé sur un quiz */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                <Timer className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{metrics.averageTime}min</div>
                <div className={`text-xs flex items-center gap-1 ${getTrendColor(getTrendDirection(metrics.timeEvolution, 'averageTime'))}`}>
                  {getTrendIcon(getTrendDirection(metrics.timeEvolution, 'averageTime'))}
                  <span>Tendance</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Temps Moyen par Quiz</h3>
              <p className="text-slate-400 text-sm">Durée moyenne de tous les parents</p>
            </div>
          </div>
        </div>

        {/* 6. Évolution du temps moyen */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">30 derniers jours</div>
            </div>
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Évolution du Temps</h3>
              <p className="text-slate-400 text-sm">Progression hebdomadaire</p>
              {renderHistogram(metrics.timeEvolution, 'averageTime', 'bg-gradient-to-t from-purple-500 to-pink-400', 'min')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
