'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Trophy,
  Target,
  Clock,
  BookOpen,
  TrendingUp,
  Star,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { getQuizWithItems, getSubmissionsByQuiz } from '@/lib/database'

interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  choices: Array<{
    id: string
    text: string
  }>
  answer_keys: string[]
  order_index: number
  explanation?: string
}

interface Quiz {
  id: string
  title: string
  description: string | null
  level: string
  items: QuizQuestion[]
}

interface Submission {
  id: string
  quiz_id: string
  student_id: string
  answers: Record<string, string[]>
  score: number
  total_questions: number
  created_at: string
  student?: {
    id: string
    full_name: string | null
  }
}

interface QuizResultsProps {
  submissionId?: string
  quizId?: string
  studentId?: string
  userSubmission?: Submission
  onBack: () => void
  onRetakeQuiz?: () => void
}

export function QuizResults({ 
  submissionId, 
  quizId, 
  studentId, 
  userSubmission, 
  onBack, 
  onRetakeQuiz 
}: QuizResultsProps) {
  const { profile } = useAuth()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(userSubmission || null)
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false)
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null)

  const isTeacher = profile?.role === 'TEACHER'

  useEffect(() => {
    fetchData()
  }, [submissionId, quizId, studentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      if (!quizId && !userSubmission?.quiz_id) {
        throw new Error('Quiz ID is required')
      }

      const targetQuizId = quizId || userSubmission?.quiz_id
      if (!targetQuizId) {
        throw new Error('Cannot determine quiz ID')
      }

      // Fetch quiz with items
      const quizData = await getQuizWithItems(targetQuizId)
      
      // Sort questions by order_index
      const sortedQuestions = quizData.items.sort((a: QuizQuestion, b: QuizQuestion) => 
        a.order_index - b.order_index
      )
      
      setQuiz({
        ...quizData,
        items: sortedQuestions
      } as Quiz)

      // If teacher, fetch all submissions for this quiz
      if (isTeacher) {
        const submissions = await getSubmissionsByQuiz(targetQuizId)
        setAllSubmissions(submissions as Submission[])
      }

    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des résultats')
    } finally {
      setLoading(false)
    }
  }

  const getQuestionResult = (questionId: string, userAnswers: string[], correctAnswers: string[]) => {
    const isCorrect = userAnswers.length === correctAnswers.length &&
                     userAnswers.every(answer => correctAnswers.includes(answer))
    
    return {
      isCorrect,
      userAnswers,
      correctAnswers,
      hasAnswer: userAnswers.length > 0
    }
  }

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 80) return 'bg-green-100 text-green-800'
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getPerformanceMessage = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 90) return 'Excellent ! Performance exceptionnelle !'
    if (percentage >= 80) return 'Très bien ! Bon travail !'
    if (percentage >= 70) return 'Bien ! Continue comme ça !'
    if (percentage >= 60) return 'Correct. Il y a de la place pour l\'amélioration.'
    return 'Il faut s\'entraîner davantage. Ne pas se décourager !'
  }

  const calculateQuizStatistics = () => {
    if (!quiz || !allSubmissions.length) return null

    const totalSubmissions = allSubmissions.length
    const averageScore = allSubmissions.reduce((sum, sub) => 
      sum + (sub.score / sub.total_questions * 100), 0) / totalSubmissions
    
    const scoreDistribution = {
      excellent: allSubmissions.filter(sub => (sub.score / sub.total_questions * 100) >= 80).length,
      good: allSubmissions.filter(sub => {
        const pct = sub.score / sub.total_questions * 100
        return pct >= 60 && pct < 80
      }).length,
      needsWork: allSubmissions.filter(sub => (sub.score / sub.total_questions * 100) < 60).length
    }

    return {
      totalSubmissions,
      averageScore: Math.round(averageScore),
      scoreDistribution
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement des résultats...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  if (!quiz || !submission) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p>Résultats non trouvés</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  const stats = calculateQuizStatistics()
  const percentage = Math.round((submission.score / submission.total_questions) * 100)

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
          >
            {showCorrectAnswers ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Masquer les réponses
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Voir les réponses
              </>
            )}
          </Button>
          
          {onRetakeQuiz && (
            <Button onClick={onRetakeQuiz}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refaire le Quiz
            </Button>
          )}
        </div>
      </div>

      {/* Quiz Results Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{quiz.title}</CardTitle>
              {quiz.description && (
                <p className="text-gray-600 mt-2">{quiz.description}</p>
              )}
              <div className="flex items-center space-x-2 mt-3">
                <Badge variant="outline">{quiz.level}</Badge>
                <Badge className={getScoreBadgeColor(submission.score, submission.total_questions)}>
                  Score: {percentage}%
                </Badge>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(submission.score, submission.total_questions)}`}>
                {percentage}%
              </div>
              <div className="text-sm text-gray-600">
                {submission.score} / {submission.total_questions} questions
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Progress value={percentage} className="h-3" />
              <p className="text-sm text-gray-600 mt-2">
                {getPerformanceMessage(submission.score, submission.total_questions)}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium">Date de soumission</div>
                <div className="text-gray-600">{formatDate(submission.created_at)}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="font-medium">Bonnes réponses</div>
                <div className="text-green-600">{submission.score} questions</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="font-medium">Erreurs</div>
                <div className="text-red-600">{submission.total_questions - submission.score} questions</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Statistics (if teacher) */}
      {isTeacher && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Statistiques de la Classe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                <div className="text-sm text-gray-600">Soumissions totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.averageScore}%</div>
                <div className="text-sm text-gray-600">Score moyen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.scoreDistribution.excellent}</div>
                <div className="text-sm text-gray-600">Excellent (≥80%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.scoreDistribution.needsWork}</div>
                <div className="text-sm text-gray-600">À améliorer (&lt;60%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Révision des Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quiz.items.map((question, index) => {
              const userAnswers = submission.answers[question.id] || []
              const result = getQuestionResult(question.id, userAnswers, question.answer_keys)
              
              return (
                <Card key={question.id} className={`${
                  result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          {result.isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`text-sm font-medium ${
                            result.isCorrect ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.isCorrect ? 'Correct' : result.hasAnswer ? 'Incorrect' : 'Non répondu'}
                          </span>
                        </div>
                        <p className="font-medium">{question.question}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {question.choices.map(choice => {
                        const isUserChoice = userAnswers.includes(choice.id)
                        const isCorrectChoice = question.answer_keys.includes(choice.id)
                        
                        let choiceStyle = 'border-gray-200 bg-white'
                        if (showCorrectAnswers && isCorrectChoice) {
                          choiceStyle = 'border-green-500 bg-green-100'
                        } else if (isUserChoice && result.isCorrect) {
                          choiceStyle = 'border-green-500 bg-green-100'
                        } else if (isUserChoice && !result.isCorrect) {
                          choiceStyle = 'border-red-500 bg-red-100'
                        }
                        
                        return (
                          <div key={choice.id} className={`p-3 border rounded ${choiceStyle}`}>
                            <div className="flex items-center">
                              <span className="font-mono text-sm mr-3 font-medium">{choice.id})</span>
                              <span className="flex-1">{choice.text}</span>
                              <div className="flex items-center space-x-2">
                                {isUserChoice && (
                                  <Badge variant="outline" className="text-xs">
                                    Votre réponse
                                  </Badge>
                                )}
                                {showCorrectAnswers && isCorrectChoice && (
                                  <Badge className="bg-green-600 text-xs">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {showCorrectAnswers && question.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-sm">
                          <strong>Explication :</strong> {question.explanation}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}