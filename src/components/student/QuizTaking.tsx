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
  onComplete?: (score: number, totalQuestions: number) => void
  onExit?: () => void
}

export function QuizTaking({ quizId, onComplete, onExit }: QuizTakingProps) {
  const { profile, claims } = useAuth()
  const canSubmit = checkPermission(claims?.role ?? null, 'canSubmitQuiz')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debug logging
  console.log('QuizTaking component mounted:', { quizId, profile, claims, canSubmit })
  
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
      onComplete?.(score, total)

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
    console.log('Permission denied - redirecting user back')
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
          <p className="text-sm text-gray-600 mt-2">Role: {claims?.role}, CanSubmit: {canSubmit.toString()}</p>
          <Button onClick={() => onExit?.() || window.history.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-white text-lg">Chargement du quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto p-8">
          <div className="card-dark p-6 border-red-500/20 bg-red-500/10">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Erreur</h3>
            </div>
            <p className="text-red-300 mb-6">{error}</p>
            <button 
              onClick={() => onExit?.() || window.history.back()}
              className="btn-gradient gradient-primary hover-lift px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto p-8 text-center">
          <div className="card-dark p-8">
            <div className="gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Quiz non trouvé</h3>
            <p className="text-slate-400 mb-6">Le quiz que vous recherchez n'existe pas ou n'est plus disponible.</p>
            <button 
              onClick={() => onExit?.() || window.history.back()}
              className="btn-gradient gradient-primary hover-lift px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (quizCompleted && finalScore) {
    const percentage = Math.round((finalScore.score / finalScore.total) * 100)
    const getScoreGradient = (score: number, total: number) => {
      const perc = (score / total) * 100
      if (perc >= 80) return 'gradient-primary'
      if (perc >= 60) return 'gradient-warm'
      return 'gradient-accent'
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="card-dark p-8 text-center">
            <div className="mb-6">
              <div className={`${getScoreGradient(finalScore.score, finalScore.total)} p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center`}>
                <Trophy className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Quiz Terminé !</h2>
              <p className="text-slate-400">Félicitations pour avoir terminé le quiz</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className={`text-5xl font-bold mb-2 ${
                  percentage >= 80 ? 'text-green-400' : 
                  percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {percentage}%
                </div>
                <div className="text-lg text-slate-300 mb-3">
                  {finalScore.score} / {finalScore.total} questions correctes
                </div>
                <p className="text-xl font-medium text-white">
                  {getScoreMessage(finalScore.score, finalScore.total)}
                </p>
              </div>

              <div className="w-full bg-slate-700 rounded-full h-3">
                <div 
                  className={`${getScoreGradient(finalScore.score, finalScore.total)} h-3 rounded-full transition-all duration-1000`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card-secondary p-4 rounded-lg">
                  <div className="font-semibold text-white mb-1">Temps écoulé</div>
                  <div className="text-slate-400">{formatTime(timeElapsed)}</div>
                </div>
                <div className="card-secondary p-4 rounded-lg">
                  <div className="font-semibold text-white mb-1">Questions répondues</div>
                  <div className="text-slate-400">{getAnsweredQuestionsCount()} / {quiz.items.length}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => onExit?.() || (window.location.href = '/parent')}
                  className="flex-1 py-3 px-6 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour au tableau de bord
                </button>
                <button 
                  onClick={() => {
                    setQuizCompleted(false)
                    setFinalScore(null)
                    setCurrentQuestionIndex(0)
                    setAnswers({})
                    setTimeElapsed(0)
                  }}
                  className="flex-1 btn-gradient gradient-primary hover-lift py-3 px-6 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refaire le quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.items[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quiz.items.length) * 100
  const answeredCount = getAnsweredQuestionsCount()

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <button 
              onClick={() => onExit?.() || (window.location.href = '/parent')}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg">
                <Timer className="h-4 w-4 mr-2" />
                {formatTime(timeElapsed)}
              </div>
              <div className="flex items-center text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg">
                <BookOpen className="h-4 w-4 mr-2" />
                {answeredCount} / {quiz.items.length}
              </div>
            </div>
          </div>

          <div className="card-secondary p-6 rounded-xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-slate-400 mb-4">{quiz.description}</p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded-full w-fit">
                {quiz.level}
              </span>
              <span className="text-sm text-slate-400">
                Question {currentQuestionIndex + 1} sur {quiz.items.length}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="gradient-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="card-dark p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
              Q{currentQuestionIndex + 1}: {currentQuestion.question}
            </h2>
          </div>
          
          <div className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isSelected = answers[currentQuestion.id]?.includes(choice.id)
              
              return (
                <button
                  key={choice.id}
                  onClick={() => handleAnswerSelect(currentQuestion.id, choice.id)}
                  className={`w-full p-4 text-left rounded-lg transition-all duration-200 hover-lift ${
                    isSelected
                      ? 'card-secondary border-2 border-blue-400 bg-blue-500/10'
                      : 'card-secondary border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500'
                        : 'border-slate-500'
                    }`}>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className="font-mono text-sm mr-3 font-medium text-slate-400">{choice.id})</span>
                    <span className={`${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>{choice.text}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={goToPreviousQuestion}
            disabled={!canGoToPrevious()}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              canGoToPrevious() 
                ? 'bg-slate-600 hover:bg-slate-500 text-white hover-lift' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          {/* Question indicators */}
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {quiz.items.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                  index === currentQuestionIndex
                    ? 'gradient-primary text-white shadow-lg'
                    : isQuestionAnswered(quiz.items[index].id)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-slate-600 text-slate-400 border border-slate-500 hover:bg-slate-500'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {canGoToNext() ? (
            <button
              onClick={goToNextQuestion}
              disabled={!isQuestionAnswered(currentQuestion.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                isQuestionAnswered(currentQuestion.id)
                  ? 'btn-gradient gradient-primary text-white hover-lift'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="hidden sm:inline">Suivant</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={answeredCount === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                answeredCount > 0
                  ? 'btn-gradient gradient-accent text-white hover-lift'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Terminer le Quiz
              <CheckCircle className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>

        {/* Confirm Submit Dialog */}
        <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
          <DialogContent className="card-dark border-slate-600">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Terminer le Quiz ?</DialogTitle>
              <DialogDescription className="text-slate-400">
                Êtes-vous sûr de vouloir terminer le quiz ? Vous avez répondu à {answeredCount} question{answeredCount > 1 ? 's' : ''} sur {quiz.items.length}.
              </DialogDescription>
            </DialogHeader>
            
            {answeredCount < quiz.items.length && (
              <div className="card-secondary p-4 rounded-lg border-yellow-500/20 bg-yellow-500/10">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Attention : Il vous reste {quiz.items.length - answeredCount} question{quiz.items.length - answeredCount > 1 ? 's' : ''} sans réponse.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={() => setShowConfirmSubmit(false)}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all duration-200"
              >
                Continuer le Quiz
              </button>
              <button 
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="px-6 py-3 btn-gradient gradient-accent text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Soumission...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}