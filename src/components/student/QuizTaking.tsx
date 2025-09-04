'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  RotateCcw,
  Timer,
  BookOpen,
  Loader2,
  ShieldAlert
} from 'lucide-react'
import { getQuizWithItems, createSubmission } from '@/lib/database'
import { handleSupabaseError } from '@/lib/error-handler'
import { checkPermission } from '@/lib/permissions'

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
}

interface Quiz {
  id: string
  title: string
  description: string | null
  level: string
  is_published: boolean
  classroom_id: string | null
  owner_id: string | null
  created_at: string
  items: QuizQuestion[]
}

interface QuizAnswer {
  questionId: string
  selectedChoices: string[]
}

interface QuizTakingProps {
  quizId: string
  onComplete: (score: number, totalQuestions: number) => void
  onExit: () => void
}

export function QuizTaking({ quizId, onComplete, onExit }: QuizTakingProps) {
  const { profile, claims } = useAuth()
  const canSubmit = checkPermission(claims?.role ?? null, 'canSubmitQuiz')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [quizStartTime] = useState(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState<{ score: number; total: number } | null>(null)

  useEffect(() => {
    if (quizId) {
      fetchQuiz()
    }
  }, [quizId])

  useEffect(() => {
    // Timer
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const fetchQuiz = async () => {
    try {
      setLoading(true)
      const quizData = await getQuizWithItems(quizId)
      
      // Sort questions by order_index
      const sortedQuestions = quizData.items.sort((a: QuizQuestion, b: QuizQuestion) => 
        a.order_index - b.order_index
      )
      
      setQuiz({
        ...quizData,
        items: sortedQuestions
      } as Quiz)
      
    } catch (error: any) {
      handleSupabaseError(error)
      setError('Erreur lors du chargement du quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId: string, choiceId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [choiceId] // Single choice for now
    }))
  }

  const isQuestionAnswered = (questionId: string) => {
    return answers[questionId] && answers[questionId].length > 0
  }

  const getAnsweredQuestionsCount = () => {
    return Object.keys(answers).filter(questionId => 
      answers[questionId] && answers[questionId].length > 0
    ).length
  }

  const canGoToNext = () => {
    if (!quiz) return false
    return currentQuestionIndex < quiz.items.length - 1
  }

  const canGoToPrevious = () => {
    return currentQuestionIndex > 0
  }

  const goToNextQuestion = () => {
    if (canGoToNext()) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const goToPreviousQuestion = () => {
    if (canGoToPrevious()) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const calculateScore = () => {
    if (!quiz) return { score: 0, total: 0 }
    
    let score = 0
    const total = quiz.items.length

    quiz.items.forEach(question => {
      const userAnswers = answers[question.id] || []
      const correctAnswers = question.answer_keys
      
      // Check if user's answers match correct answers exactly
      if (userAnswers.length === correctAnswers.length &&
          userAnswers.every(answer => correctAnswers.includes(answer))) {
        score++
      }
    })

    return { score, total }
  }

  const handleSubmitQuiz = async () => {
    if (!quiz || !profile?.id) return

    setIsSubmitting(true)
    setShowConfirmSubmit(false)

    try {
      const { score, total } = calculateScore()
      
      // Prepare answers in the format expected by the database
      const submissionAnswers: Record<string, string[]> = {}
      quiz.items.forEach(question => {
        submissionAnswers[question.id] = answers[question.id] || []
      })

      // Create submission
      if (!claims?.schoolId || !claims?.classroomId) {
        throw new Error('Informations de classe et d\'école non trouvées.')
      }

      await createSubmission({
        quiz_id: quizId,
        parent_id: profile.id,
        answers: submissionAnswers,
        score,
        total_questions: total,
        school_id: claims.schoolId,
        classroom_id: claims.classroomId,
      })

      setFinalScore({ score, total })
      setQuizCompleted(true)
      onComplete(score, total)

    } catch (error: any) {
      handleSupabaseError(error)
      setError('Erreur lors de la soumission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreMessage = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 90) return 'Excellent travail ! 🎉'
    if (percentage >= 80) return 'Très bien ! 👏'
    if (percentage >= 70) return 'Bien joué ! 👍'
    if (percentage >= 60) return 'Pas mal ! 😊'
    return 'Continue à t\'entraîner ! 💪'
  }

  if (!canSubmit) {
    return (
      <Card className="max-w-2xl mx-auto p-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2 text-red-500" />
            Accès non autorisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Vous n'avez pas les permissions nécessaires pour passer ce quiz.</p>
          <Button onClick={onExit} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement du quiz...</p>
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
        <Button onClick={onExit} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p>Quiz non trouvé</p>
        <Button onClick={onExit} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  if (quizCompleted && finalScore) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Quiz Terminé !</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className={`text-4xl font-bold ${getScoreColor(finalScore.score, finalScore.total)}`}>
                {Math.round((finalScore.score / finalScore.total) * 100)}%
              </div>
              <div className="text-lg text-gray-600">
                {finalScore.score} / {finalScore.total} questions correctes
              </div>
              <p className="text-lg font-medium mt-2">
                {getScoreMessage(finalScore.score, finalScore.total)}
              </p>
            </div>

            <div className="space-y-2">
              <Progress 
                value={(finalScore.score / finalScore.total) * 100} 
                className="h-4"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium">Temps écoulé</div>
                <div className="text-gray-600">{formatTime(timeElapsed)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium">Questions répondues</div>
                <div className="text-gray-600">{getAnsweredQuestionsCount()} / {quiz.items.length}</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={onExit} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au tableau de bord
              </Button>
              <Button 
                onClick={() => {
                  setQuizCompleted(false)
                  setFinalScore(null)
                  setCurrentQuestionIndex(0)
                  setAnswers({})
                  setTimeElapsed(0)
                }}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refaire le quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = quiz.items[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quiz.items.length) * 100
  const answeredCount = getAnsweredQuestionsCount()

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" onClick={onExit}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quitter
          </Button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <Timer className="h-4 w-4 mr-1" />
              {formatTime(timeElapsed)}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <BookOpen className="h-4 w-4 mr-1" />
              {answeredCount} / {quiz.items.length}
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}
          <div className="flex items-center space-x-2 mb-4">
            <Badge variant="outline">{quiz.level}</Badge>
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} sur {quiz.items.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Question */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">
            Q{currentQuestionIndex + 1}: {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isSelected = answers[currentQuestion.id]?.includes(choice.id)
              
              return (
                <button
                  key={choice.id}
                  onClick={() => handleAnswerSelect(currentQuestion.id, choice.id)}
                  className={`w-full p-4 text-left border rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <CheckCircle className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="font-mono text-sm mr-3 font-medium">{choice.id})</span>
                    <span>{choice.text}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={goToPreviousQuestion}
          disabled={!canGoToPrevious()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        <div className="flex space-x-2">
          {/* Question indicator */}
          <div className="flex space-x-1">
            {quiz.items.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded text-xs font-medium ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : isQuestionAnswered(quiz.items[index].id)
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {canGoToNext() ? (
          <Button
            onClick={goToNextQuestion}
            disabled={!isQuestionAnswered(currentQuestion.id)}
          >
            Suivant
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowConfirmSubmit(true)}
            disabled={answeredCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Terminer le Quiz
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer le Quiz ?</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir terminer le quiz ? Vous avez répondu à {answeredCount} question{answeredCount > 1 ? 's' : ''} sur {quiz.items.length}.
            </DialogDescription>
          </DialogHeader>
          
          {answeredCount < quiz.items.length && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Attention : Il vous reste {quiz.items.length - answeredCount} question{quiz.items.length - answeredCount > 1 ? 's' : ''} sans réponse.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>
              Continuer le Quiz
            </Button>
            <Button 
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Soumission...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}