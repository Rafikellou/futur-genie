'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
import { TeacherManagement } from '@/components/director/TeacherManagement'
import { InvitationManagement } from '@/components/director/InvitationManagement'
import { 
  getUsersBySchool, 
  getClassroomsBySchool, 
  getSchoolStatistics,
  getRecentActivity,
  getQuizEngagementStats
} from '@/lib/database'

export function DirectorDashboard() {
  const { profile, signOut } = useAuth()
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
    if (profile?.school_id) {
      fetchAllStats()
      
      // Set up interval for real-time updates every 30 seconds
      const interval = setInterval(fetchAllStats, 30000)
      return () => clearInterval(interval)
    }
  }, [profile?.school_id])

  const fetchAllStats = async () => {
    if (!profile?.school_id) return
    
    try {
      setLoading(true)
      
      const [schoolStats, engagement, activity] = await Promise.all([
        getSchoolStatistics(profile.school_id),
        getQuizEngagementStats(profile.school_id),
        getRecentActivity(profile.school_id, 8)
      ])
      
      setStats(schoolStats)
      setEngagementStats(engagement)
      setRecentActivity(activity)
      setError(null)
      
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      setError(error.message || 'Erreur lors du chargement des statistiques')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <School className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Tableau de Bord Directeur</h1>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="classrooms">Classes</TabsTrigger>
            <TabsTrigger value="teachers">Enseignants</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center text-red-800">
                    <Activity className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Main Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <School className="h-5 w-5 mr-2" />
                      Classes
                    </div>
                    {!loading && <TrendingUp className="h-4 w-4 text-green-500" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalClasses}
                  </div>
                  <p className="text-gray-600 text-sm">Classes actives</p>
                  <div className="mt-2">
                    <Progress value={Math.min((stats.totalClasses / 20) * 100, 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Personnel
                    </div>
                    <Badge variant="secondary">{stats.totalTeachers}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalTeachers + stats.totalParents}
                  </div>
                  <p className="text-gray-600 text-sm">
                    {stats.totalTeachers} enseignants, {stats.totalParents} parents
                  </p>
                  <div className="flex mt-2 space-x-1">
                    <div className="flex-1 bg-blue-200 h-2 rounded" style={{width: `${(stats.totalTeachers / (stats.totalTeachers + stats.totalParents)) * 100}%`}}></div>
                    <div className="flex-1 bg-orange-200 h-2 rounded" style={{width: `${(stats.totalParents / (stats.totalTeachers + stats.totalParents)) * 100}%`}}></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Élèves
                    </div>
                    <Calendar className="h-4 w-4 text-blue-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalStudents}
                  </div>
                  <p className="text-gray-600 text-sm">Élèves inscrits</p>
                  <div className="mt-2">
                    <div className="text-xs text-gray-500">
                      Moyenne: {stats.totalClasses > 0 ? Math.round(stats.totalStudents / stats.totalClasses) : 0} élèves/classe
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Quiz
                    </div>
                    <Target className="h-4 w-4 text-purple-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalQuizzes}
                  </div>
                  <p className="text-gray-600 text-sm">
                    {stats.publishedQuizzes} publiés, {stats.totalQuizzes - stats.publishedQuizzes} brouillons
                  </p>
                  <div className="mt-2">
                    <Progress value={stats.totalQuizzes > 0 ? (stats.publishedQuizzes / stats.totalQuizzes) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Engagement Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-600" />
                    Engagement Global
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Soumissions totales</span>
                        <span className="text-lg font-bold">{engagementStats.totalSubmissions}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Score moyen</span>
                        <span className={`text-lg font-bold ${getScoreColor(engagementStats.averageScore)}`}>
                          {engagementStats.averageScore}%
                        </span>
                      </div>
                      <Progress value={engagementStats.averageScore} className="h-2 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    Cette Semaine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {engagementStats.thisWeekSubmissions}
                      </div>
                      <p className="text-sm text-gray-600">Nouvelles soumissions</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {engagementStats.thisWeekSubmissions > 0 
                        ? `+${Math.round((engagementStats.thisWeekSubmissions / engagementStats.totalSubmissions) * 100)}% du total`
                        : 'Aucune activité cette semaine'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2 text-yellow-600" />
                    Performances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {engagementStats.perfectScores}
                      </div>
                      <p className="text-sm text-gray-600">Scores parfaits</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {engagementStats.totalSubmissions > 0 
                        ? `${Math.round((engagementStats.perfectScores / engagementStats.totalSubmissions) * 100)}% des soumissions`
                        : 'Aucune donnée'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Activity and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Activité Récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-sm">{activity.student?.full_name}</div>
                            <div className="text-xs text-gray-500">{activity.quiz?.title}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-sm ${getScoreColor(
                              Math.round((activity.score / activity.total_questions) * 100)
                            )}`}>
                              {Math.round((activity.score / activity.total_questions) * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTimeAgo(activity.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      onClick={() => setActiveTab('classrooms')} 
                      className="h-16 flex items-center justify-start space-x-3"
                    >
                      <School className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold">Gérer les Classes</div>
                        <div className="text-xs opacity-80">{stats.totalClasses} classes actives</div>
                      </div>
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('teachers')} 
                      variant="outline" 
                      className="h-16 flex items-center justify-start space-x-3"
                    >
                      <Users className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold">Gérer les Enseignants</div>
                        <div className="text-xs opacity-80">{stats.totalTeachers} enseignants</div>
                      </div>
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('invitations')} 
                      variant="outline" 
                      className="h-16 flex items-center justify-start space-x-3"
                    >
                      <LinkIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold">Liens d'Invitation</div>
                        <div className="text-xs opacity-80">Inviter nouveaux utilisateurs</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="classrooms">
            <ClassroomManagement />
          </TabsContent>
          
          <TabsContent value="teachers">
            <TeacherManagement />
          </TabsContent>
          
          <TabsContent value="invitations">
            <InvitationManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}