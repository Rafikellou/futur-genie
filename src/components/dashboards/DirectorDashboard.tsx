'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  School, 
  LogOut, 
  Users, 
  BookOpen,
  Shield, 
  Link as LinkIcon, 
  Loader2, 
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  Target,
  Award,
  Activity
} from 'lucide-react'
import { ClassroomManagement } from '@/components/director/ClassroomManagement'
import { UserManagement } from '@/components/director/UserManagement'
import { InvitationManagement } from '@/components/director/InvitationManagement'
import { 
  getSchoolStatistics,
  getRecentActivity,
  getQuizEngagementStats
} from '@/lib/database'

export function DirectorDashboard() {
  const { profile, schoolName, claims, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Enhanced statistics state
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalParents: 0,
    totalQuizzes: 0,
    publishedQuizzes: 0
  })
  
  const [engagementStats, setEngagementStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    thisWeekSubmissions: 0,
    perfectScores: 0
  })
  
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (claims?.schoolId) {
      fetchAllStats()
      
      // Set up interval for real-time updates every 30 seconds
      const interval = setInterval(fetchAllStats, 30000)
      return () => clearInterval(interval)
    }
  }, [claims?.schoolId])

  const fetchAllStats = async () => {
    const schoolId = claims?.schoolId
    if (!schoolId) return
    
    try {
      setLoading(true)
      
      const [schoolStats, engagement, activity] = await Promise.all([
        getSchoolStatistics(schoolId),
        getQuizEngagementStats(schoolId),
        getRecentActivity(schoolId, 8)
      ])
      
      setStats(schoolStats)
      setEngagementStats(engagement)
      setRecentActivity(activity)
      setError(null)
      
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      setError('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'À l\'instant'
    if (diffInHours < 24) return `Il y a ${diffInHours}h`
    const diffInDays = Math.floor(diffInHours / 24)
    return `Il y a ${diffInDays}j`
  }

  // Full-screen loader when profile is not yet available (initial app load)
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 data-testid="loading-spinner" className="h-8 w-8 animate-spin" />
      </div>
    )
  }

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
              <div className="gradient-primary p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tableau de Bord Directeur</h1>
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
          <button className="btn-gradient gradient-primary hover-lift px-4 py-2 rounded-lg text-white font-medium text-sm transition-all duration-200 flex items-center gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="card-secondary p-1 rounded-xl">
            <div className="grid grid-cols-4 gap-1">
              <button className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'overview' ? 'gradient-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('overview')}>Vue d'ensemble</button>
              <button className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'classrooms' ? 'gradient-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('classrooms')}>Classes</button>
              <button className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'users' ? 'gradient-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('users')}>Utilisateurs</button>
              <button className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'invitations' ? 'gradient-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} onClick={() => setActiveTab('invitations')}>Invitations</button>
            </div>
          </div>
          
          <TabsContent value="overview" className="space-y-6">
            {error && (
              <div className="card-secondary p-4 rounded-lg border-red-500/20 bg-red-500/10 mb-6">
                <div className="flex items-center gap-2 text-red-400">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
            
            {/* Main Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card-dark gradient-primary p-6 rounded-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <School className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Classes</h3>
                  </div>
                  {!loading && <TrendingUp className="h-4 w-4 text-blue-200" />}
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : stats.totalClasses}
                </div>
                <p className="text-blue-100 text-sm mb-3">Classes actives</p>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min((stats.totalClasses / 20) * 100, 100)}%` }}></div>
                </div>
              </div>
              
              <div className="card-dark gradient-secondary p-6 rounded-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Personnel</h3>
                  </div>
                  <div className="px-2 py-1 bg-white/20 rounded-full text-xs text-white">
                    {stats.totalTeachers === 0 ? 'Aucun enseignant' : `${stats.totalTeachers} enseignants`}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (() => {
                    const val = (stats as any).totalUsers ?? (stats.totalTeachers + stats.totalParents)
                    return val === 0 ? '—' : val
                  })()}
                </div>
                <p className="text-purple-100 text-sm mb-3">
                  {stats.totalTeachers} enseignants, {stats.totalParents} parents
                </p>
                <div className="flex space-x-1">
                  {(() => {
                    const denom = stats.totalTeachers + stats.totalParents
                    const tPct = denom > 0 ? (stats.totalTeachers / denom) * 100 : 0
                    const pPct = denom > 0 ? (stats.totalParents / denom) * 100 : 0
                    return (
                      <>
                        <div className="flex-1 bg-white/40 h-2 rounded" style={{ width: `${tPct}%` }}></div>
                        <div className="flex-1 bg-white/20 h-2 rounded" style={{ width: `${pPct}%` }}></div>
                      </>
                    )
                  })()}
                </div>
              </div>
              
              <div className="card-dark gradient-accent p-6 rounded-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Élèves (Parents)</h3>
                  </div>
                  <Calendar className="h-4 w-4 text-green-200" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : (stats.totalStudents === 0 ? '—' : stats.totalStudents)}
                </div>
                <p className="text-green-100 text-sm mb-1">Élèves inscrits</p>
                <div className="text-xs text-green-200">
                  Moyenne: {stats.totalClasses > 0 ? Math.round(stats.totalStudents / stats.totalClasses) : 0} élèves/classe
                </div>
              </div>
              
              <div className="card-dark p-6 rounded-xl hover-lift" style={{ background: 'linear-gradient(135deg, #FF7F59 0%, #FB995D 100%)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white">Quiz</h3>
                  </div>
                  <Target className="h-4 w-4 text-orange-200" />
                </div>
                {(() => {
                  const totalQuizzes = stats.totalQuizzes ?? 0
                  const published = stats.publishedQuizzes ?? 0
                  const unpublished = Math.max(totalQuizzes - published, 0)
                  const pct = totalQuizzes > 0 ? (published / totalQuizzes) * 100 : 0
                  return (
                    <>
                      <div className="text-3xl font-bold text-white mb-2">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : (totalQuizzes === 0 ? '—' : totalQuizzes)}
                      </div>
                      <p className="text-orange-100 text-sm mb-3">
                        {published} publiés, {unpublished} brouillons
                      </p>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
            
            {/* Engagement Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card-dark p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <Activity className="h-5 w-5 mr-2 text-green-400" />
                  <h3 className="font-semibold text-white">Engagement Global</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-300">Soumissions totales</span>
                      <span className="text-lg font-bold text-white">{engagementStats.totalSubmissions}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-300">Score moyen</span>
                      <span className={`text-lg font-bold ${getScoreColor(engagementStats.averageScore) === 'text-green-600' ? 'text-green-400' : getScoreColor(engagementStats.averageScore) === 'text-yellow-600' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {engagementStats.averageScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${engagementStats.averageScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card-dark p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <Clock className="h-5 w-5 mr-2 text-blue-400" />
                  <h3 className="font-semibold text-white">Cette Semaine</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {engagementStats.thisWeekSubmissions}
                    </div>
                    <p className="text-sm text-slate-300">Nouvelles soumissions</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {engagementStats.thisWeekSubmissions > 0 
                      ? `+${Math.round((engagementStats.thisWeekSubmissions / engagementStats.totalSubmissions) * 100)}% du total`
                      : 'Aucune activité cette semaine'
                    }
                  </div>
                </div>
              </div>
              
              <div className="card-dark p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <Award className="h-5 w-5 mr-2 text-yellow-400" />
                  <h3 className="font-semibold text-white">Performances</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      {engagementStats.perfectScores}
                    </div>
                    <p className="text-sm text-slate-300">Scores parfaits</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {engagementStats.totalSubmissions > 0 
                      ? `${Math.round((engagementStats.perfectScores / engagementStats.totalSubmissions) * 100)}% des soumissions`
                      : 'Aucune donnée'
                    }
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent Activity and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-dark p-6 rounded-xl">
                <div className="flex items-center mb-6">
                  <Clock className="h-5 w-5 mr-2 text-slate-400" />
                  <h3 className="font-semibold text-white">Activité Récente</h3>
                </div>
                {recentActivity.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Aucune activité récente</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 card-secondary rounded-lg">
                        <div>
                          <div className="font-medium text-sm text-white">{activity.parent?.full_name}</div>
                          <div className="text-xs text-slate-400">{activity.quiz?.title}</div>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const pct = activity.total_questions > 0 ? Math.round((activity.score / activity.total_questions) * 100) : 0
                            const colorClass = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
                            return (
                              <div className={`font-bold text-sm ${colorClass}`}>
                                {pct}%
                              </div>
                            )
                          })()}
                          <div className="text-xs text-slate-500">
                            {formatTimeAgo(activity.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="card-dark p-6 rounded-xl">
                <h3 className="font-semibold text-white mb-6">Actions Rapides</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => setActiveTab('classrooms')} 
                    className="h-16 flex items-center justify-start space-x-3 btn-gradient gradient-primary text-white rounded-lg font-medium transition-all duration-200 hover-lift px-4"
                  >
                    <School className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Gérer les Classes</div>
                      <div className="text-xs opacity-80">{stats.totalClasses} classes actives</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => setActiveTab('users')} 
                    className="h-16 flex items-center justify-start space-x-3 card-secondary border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-200 px-4"
                  >
                    <Users className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Gérer les Enseignants</div>
                      <div className="text-xs opacity-80">{stats.totalTeachers} enseignants</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => setActiveTab('invitations')} 
                    className="h-16 flex items-center justify-start space-x-3 card-secondary border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-200 px-4"
                  >
                    <LinkIcon className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Liens d'Invitation</div>
                      <div className="text-xs opacity-80">Inviter nouveaux utilisateurs</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="classrooms">
            <ClassroomManagement />
          </TabsContent>

          <TabsContent value="users" forceMount>
            <UserManagement />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationManagement />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  )
}