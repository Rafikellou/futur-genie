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
import confetti from 'canvas-confetti'

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
  explanation?: string // Add explanation field
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
  const [questionResults, setQuestionResults] = useState<Record<string, boolean>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [currentFeedback, setCurrentFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState<{ score: number; total: number } | null>(null)

  // Add state for explanations
  const [explanations, setExplanations] = useState<Record<string, string>>({})

  useEffect(() => {
    if (quizId) {
      fetchQuiz()
    }
  }, [quizId])

  useEffect(() => {
    // Timer - only start when quiz is started
    if (!quizStarted) return

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted])

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
    if (!quiz) return
    
    // Set the answer
    setAnswers(prev => ({
      ...prev,
      [questionId]: [choiceId]
    }))

    // Check if answer is correct
    const currentQuestion = quiz.items.find(q => q.id === questionId)
    if (currentQuestion) {
      const isCorrect = currentQuestion.answer_keys.includes(choiceId)
      
      // Store the result
      setQuestionResults(prev => ({
        ...prev,
        [questionId]: isCorrect
      }))

      // Store explanation if available
      if (currentQuestion.explanation) {
        setExplanations(prev => ({
          ...prev,
          [questionId]: currentQuestion.explanation || ''
        }))
      }

      // Show immediate feedback
      setCurrentFeedback({
        isCorrect,
        message: isCorrect ? 'Bonne réponse ! 🎉' : 'Pas tout à fait... 😔'
      })
      setShowFeedback(true)

      // Show confetti for correct answers
      if (isCorrect) {
        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
        })
      }

      // Auto-advance to next question after different times based on correctness
      const displayTime = isCorrect ? 1500 : 3000 // 1.5s for correct, 3s for incorrect
      
      setTimeout(() => {
        setShowFeedback(false)
        if (currentQuestionIndex < quiz.items.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1)
        } else {
          // Last question - show completion dialog
          setShowConfirmSubmit(true)
        }
      }, displayTime)
    }
  }

  const isQuestionAnswered = (questionId: string) => {
    return answers[questionId] && answers[questionId].length > 0
  }

  const getAnsweredQuestionsCount = () => {
    return Object.keys(answers).filter(questionId => 
      answers[questionId] && answers[questionId].length > 0
    ).length
  }

  const getCorrectAnswersCount = () => {
    return Object.values(questionResults).filter(result => result === true).length
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

      // Calculate quiz duration in minutes
      const quizDurationMinutes = quizStartTime 
        ? Math.round((new Date().getTime() - quizStartTime.getTime()) / (1000 * 60))
        : timeElapsed / 60

      await createSubmission({
        quiz_id: quizId,
        parent_id: profile.id,
        answers: submissionAnswers,
        score,
        total_questions: total,
        school_id: claims.schoolId,
        classroom_id: claims.classroomId,
        quiz_duration_minutes: quizDurationMinutes,
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
      <div className="flex items-center justify-center h-screen p-4" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-sm mx-auto">
          <div className="gradient-primary p-4 sm:p-5 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-2xl">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-white" />
          </div>
          <p className="text-white text-base sm:text-lg font-medium">Chargement du quiz...</p>
          <p className="text-slate-400 text-sm mt-2">Veuillez patienter</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md mx-auto w-full">
          <div className="card-dark p-6 sm:p-8 border-red-500/20 bg-red-500/10 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-red-800/10 pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Erreur</h3>
              </div>
              <p className="text-red-300 mb-6 text-sm sm:text-base break-words leading-relaxed">{error}</p>
              <button 
                onClick={() => onExit?.() || window.history.back()}
                className="w-full btn-gradient gradient-primary hover-lift px-6 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-500/20 text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md mx-auto w-full text-center">
          <div className="card-dark p-6 sm:p-8 relative overflow-hidden border border-slate-600/30">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-transparent to-slate-900/30 pointer-events-none"></div>
            <div className="relative">
              <div className="gradient-primary p-4 sm:p-5 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-2xl">
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Quiz non trouvé</h3>
              <p className="text-slate-400 mb-6 text-sm sm:text-base break-words leading-relaxed">Le quiz que vous recherchez n'existe pas ou n'est plus disponible.</p>
              <button 
                onClick={() => onExit?.() || window.history.back()}
                className="w-full btn-gradient gradient-primary hover-lift px-6 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-500/20 text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            </div>
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
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-lg mx-auto w-full">
          <div className="card-dark p-6 sm:p-8 text-center relative overflow-hidden border border-slate-600/30">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-transparent to-slate-900/30 pointer-events-none"></div>
            <div className="relative">
              <div className="mb-6">
                <div className={`${getScoreGradient(finalScore.score, finalScore.total)} p-5 sm:p-6 rounded-full w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 flex items-center justify-center shadow-2xl`}>
                  <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quiz Terminé !</h2>
                <p className="text-slate-400 text-sm sm:text-base">Félicitations pour avoir terminé le quiz</p>
              </div>
              
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <div className={`text-4xl sm:text-5xl font-bold mb-2 ${
                    percentage >= 80 ? 'text-green-400' : 
                    percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {percentage}%
                  </div>
                  <div className="text-base sm:text-lg text-slate-300 mb-3">
                    {finalScore.score} / {finalScore.total} questions correctes
                  </div>
                  <p className="text-lg sm:text-xl font-medium text-white break-words">
                    {getScoreMessage(finalScore.score, finalScore.total)}
                  </p>
                </div>

                <div className="w-full bg-slate-700/60 rounded-full h-3 sm:h-4 overflow-hidden">
                  <div 
                    className={`${getScoreGradient(finalScore.score, finalScore.total)} h-full rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="card-secondary p-3 sm:p-4 rounded-xl border border-slate-600/30">
                    <div className="font-semibold text-white mb-1 text-sm sm:text-base">Temps écoulé</div>
                    <div className="text-slate-400 font-mono text-sm sm:text-base">{formatTime(timeElapsed)}</div>
                  </div>
                  <div className="card-secondary p-3 sm:p-4 rounded-xl border border-slate-600/30">
                    <div className="font-semibold text-white mb-1 text-sm sm:text-base">Questions répondues</div>
                    <div className="text-slate-400 font-mono text-sm sm:text-base">{getAnsweredQuestionsCount()} / {quiz.items.length}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button 
                    onClick={() => onExit?.() || (window.location.href = '/parent')}
                    className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 bg-slate-600/80 backdrop-blur-sm hover:bg-slate-500 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 hover:border-slate-400/50 text-sm"
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
                    className="flex-1 btn-gradient gradient-primary hover-lift py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-500/20 text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Refaire le quiz
                  </button>
                </div>
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
  const correctCount = getCorrectAnswersCount()

  // Show start screen if quiz hasn't started yet
  if (!quizStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-lg mx-auto w-full">
          <div className="card-dark p-6 sm:p-8 text-center relative overflow-hidden border border-slate-600/30">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-transparent to-slate-900/30 pointer-events-none"></div>
            <div className="relative">
              <div className="gradient-primary p-5 sm:p-6 rounded-full w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 flex items-center justify-center shadow-2xl">
                <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-slate-400 mb-6 text-sm sm:text-base break-words leading-relaxed">{quiz.description}</p>
              )}
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center gap-4 text-slate-300">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                    <span className="text-sm">{quiz.items.length} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                      {quiz.level}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setQuizStarted(true)
                  setQuizStartTime(new Date())
                }}
                className="w-full btn-gradient gradient-primary hover-lift py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-500/20"
              >
                <Timer className="h-5 w-5" />
                Commencer le Quiz
              </button>
              
              <button 
                onClick={() => onExit?.() || (window.location.href = '/parent')}
                className="w-full mt-3 py-3 px-6 bg-slate-600/80 hover:bg-slate-500 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto p-4">
        {/* Simplified Header */}
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => onExit?.() || (window.location.href = '/parent')}
            className="p-2 bg-slate-700/50 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="text-xs text-slate-400 font-medium">
            {quiz.title}
          </div>
          
          <div className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-lg">
            {formatTime(timeElapsed)}
          </div>
        </div>

        {/* Progress Bar with Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Question {currentQuestionIndex + 1}/{quiz.items.length}
            </span>
            <span className="text-sm font-medium text-green-400">
              {correctCount} bonnes réponses
            </span>
          </div>
          {/* Minimalist dot-based progress indicator */}
          <div className="flex justify-center gap-1 py-2">
            {quiz.items.map((_, index) => {
              const questionId = quiz.items[index].id
              const isAnswered = isQuestionAnswered(questionId)
              const isCorrect = questionResults[questionId]
              
              return (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentQuestionIndex
                      ? 'bg-blue-400' // Current question
                      : isAnswered
                        ? isCorrect
                          ? 'bg-green-500' // Correct answer
                          : 'bg-red-500'   // Incorrect answer
                        : 'bg-slate-600'   // Not answered yet
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 break-words leading-relaxed text-center">
            {currentQuestion.question}
          </h2>
          
          <div className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isSelected = answers[currentQuestion.id]?.includes(choice.id)
              const isAnswered = isQuestionAnswered(currentQuestion.id)
              const isCorrect = currentQuestion.answer_keys.includes(choice.id)
              
              let buttonClass = 'card-secondary border border-slate-600/50 hover:border-slate-500/70'
              
              if (isAnswered && showFeedback) {
                if (isSelected) {
                  buttonClass = isCorrect 
                    ? 'bg-green-500/20 border-2 border-green-400 shadow-lg shadow-green-500/20'
                    : 'bg-red-500/20 border-2 border-red-400 shadow-lg shadow-red-500/20'
                } else if (isCorrect) {
                  buttonClass = 'bg-green-500/10 border border-green-400/50'
                }
              } else if (isSelected) {
                buttonClass = 'card-secondary border-2 border-blue-400/80 bg-blue-500/10'
              }
              
              return (
                <button
                  key={choice.id}
                  onClick={() => !isAnswered ? handleAnswerSelect(currentQuestion.id, choice.id) : undefined}
                  disabled={isAnswered}
                  className={`w-full p-4 text-left rounded-xl transition-all duration-300 ${buttonClass} ${
                    !isAnswered ? 'hover-lift cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      isAnswered && showFeedback
                        ? isSelected
                          ? isCorrect
                            ? 'border-green-400 bg-green-500'
                            : 'border-red-400 bg-red-500'
                          : isCorrect
                            ? 'border-green-400 bg-green-500'
                            : 'border-slate-500'
                        : isSelected
                          ? 'border-blue-400 bg-blue-500'
                          : 'border-slate-500'
                    }`}>
                      {(isAnswered && showFeedback && (isSelected || isCorrect)) && (
                        isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-white" />
                        ) : isSelected ? (
                          <XCircle className="h-4 w-4 text-white" />
                        ) : null
                      )}
                      {!isAnswered && isSelected && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className="font-mono text-sm font-medium text-slate-400 flex-shrink-0">{choice.id})</span>
                    <span className={`text-base break-words leading-relaxed ${
                      isAnswered && showFeedback
                        ? isCorrect
                          ? 'text-green-300 font-medium'
                          : isSelected
                            ? 'text-red-300'
                            : 'text-slate-300'
                        : isSelected
                          ? 'text-white font-medium'
                          : 'text-slate-300'
                    }`}>
                      {choice.text}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Feedback Message with Explanation */}
        {showFeedback && currentFeedback && (
          <div className={`text-center p-4 rounded-xl mb-4 transition-all duration-300 ${
            currentFeedback.isCorrect
              ? 'bg-green-500/20 border border-green-400/30 text-green-300'
              : 'bg-red-500/20 border border-red-400/30 text-red-300'
          }`}>
            <div className="text-lg font-medium">
              {currentFeedback.message}
            </div>
            {/* Show explanation if available */}
            {explanations[currentQuestion.id] && (
              <div className="mt-2 text-sm text-slate-300">
                {explanations[currentQuestion.id]}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={goToPreviousQuestion}
            disabled={!canGoToPrevious()}
            className={`p-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              canGoToPrevious() 
                ? 'bg-slate-600/80 hover:bg-slate-500 text-white hover-lift' 
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Question indicators */}
          <div className="flex gap-2">
            {quiz.items.map((_, index) => {
              const questionId = quiz.items[index].id
              const isAnswered = isQuestionAnswered(questionId)
              const isCorrect = questionResults[questionId]
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                    index === currentQuestionIndex
                      ? 'gradient-primary text-white shadow-lg'
                      : isAnswered
                        ? isCorrect
                          ? 'bg-green-500/30 text-green-300 border border-green-400/50'
                          : 'bg-red-500/30 text-red-300 border border-red-400/50'
                        : 'bg-slate-600/80 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          <div className="w-12" /> {/* Spacer for centering */}
        </div>

        {/* Confirm Submit Dialog */}
        <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
          <DialogContent className="card-dark border-slate-600/50 backdrop-blur-sm max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-bold text-center">Terminer le Quiz ?</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm text-center">
                Vous avez <span className="font-semibold text-green-400">{correctCount}</span> bonnes réponses sur <span className="font-semibold text-white">{quiz.items.length}</span> questions.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="w-full py-3 btn-gradient gradient-accent text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Soumission...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Terminer le Quiz
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