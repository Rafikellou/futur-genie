'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Send, User, Sparkles, CheckCircle, XCircle, RefreshCw, Save, Loader2, MessageSquare, Edit, Trash2, ShieldAlert, FileText, Globe } from 'lucide-react'

// Custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(51, 65, 85, 0.3);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #2563eb, #7c3aed);
  }
`
import { getClassroomsByTeacher, createQuiz, createQuizItem } from '@/lib/database'
import { GeneratedQuiz, QuizQuestion } from '@/lib/openai'
import { checkPermission } from '@/lib/permissions'
import { handleSupabaseError } from '@/lib/error-handler'

interface Classroom {
  id: string
  name: string
  grade: string
  school_id: string
  teacher_id: string | null
  created_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface QuizCreationData {
  title: string
  description: string
  classroomId: string
  gradeLevel: string
}

export function AIQuizCreator() {
  const { profile, claims } = useAuth()
  const canCreate = checkPermission(claims?.role ?? null, 'canCreateQuiz')
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant IA pour créer des quiz. Décrivez-moi la leçon d\'aujourd\'hui et je vous proposerai un quiz de 10 questions adaptées à vos élèves.',
      timestamp: new Date()
    }
  ])
  const [userInput, setUserInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Quiz generation state
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null)
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile?.id) {
      fetchClassrooms()
    }
  }, [profile?.id])

  // Auto-select first classroom if only one exists
  useEffect(() => {
    if (classrooms.length >= 1 && !selectedClassroom) {
      setSelectedClassroom(classrooms[0].id)
    }
  }, [classrooms, selectedClassroom])

  const fetchClassrooms = async () => {
    if (!profile?.id) return
    
    try {
      const data = await getClassroomsByTeacher(profile.id)
      setClassrooms(data as Classroom[])
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      handleSupabaseError(error as any)
    }
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, newMessage])
  }

  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating) return
    
    const message = userInput.trim()
    setUserInput('')
    
    // Add user message
    addMessage('user', message)
    setIsGenerating(true)
    setError(null)
    
    try {
      // Determine grade level from selected classroom
      let gradeLevel = 'CE1' // default
      if (selectedClassroom) {
        const classroom = classrooms.find(c => c.id === selectedClassroom)
        if (classroom) {
          gradeLevel = classroom.grade
        }
      }
      
      // If we already have a quiz, treat this as improvement feedback
      if (generatedQuiz) {
        await handleImproveQuiz(message)
        return
      }
      
      // Generate new quiz using API
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonDescription: message,
          gradeLevel
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la génération')
      }
      
      const quiz: GeneratedQuiz = await response.json()
      setGeneratedQuiz(quiz)
      setQuizTitle(quiz.title)
      setQuizDescription(quiz.description)
      
      // Add assistant response
      addMessage('assistant', `J'ai généré un quiz "${quiz.title}" avec 10 questions basées sur votre leçon. Vous pouvez maintenant réviser les questions, demander des modifications dans le chat, ou sauvegarder le quiz.`)
      
    } catch (error: any) {
      handleSupabaseError(error as any)
      addMessage('assistant', `Désolé, une erreur s'est produite. Veuillez réessayer.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImproveQuiz = async (feedback: string) => {
    if (!generatedQuiz || !feedback.trim() || isGenerating) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      let gradeLevel = 'CE1'
      if (selectedClassroom) {
        const classroom = classrooms.find(c => c.id === selectedClassroom)
        if (classroom) {
          gradeLevel = classroom.grade
        }
      }
      
      const response = await fetch('/api/quiz/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentQuestions: generatedQuiz.questions,
          feedback: feedback,
          gradeLevel
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'amélioration')
      }
      
      const { questions } = await response.json()
      console.log('Questions améliorées reçues:', questions)
      setGeneratedQuiz(prev => {
        if (!prev) return null
        const updated = { ...prev, questions }
        console.log('Quiz mis à jour:', updated)
        return updated
      })
      
      // Add assistant response
      addMessage('assistant', 'J\'ai amélioré les questions selon vos demandes. Vérifiez les modifications et n\'hésitez pas à demander d\'autres ajustements dans le chat.')
      
    } catch (error: any) {
      handleSupabaseError(error as any)
      addMessage('assistant', `Erreur lors de l'amélioration. Veuillez réessayer.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveQuiz = async (publish: boolean = false) => {
    if (!generatedQuiz || !selectedClassroom || !quizTitle.trim() || isSaving) return
    
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      const classroom = classrooms.find(c => c.id === selectedClassroom)
      if (!classroom) {
        throw new Error('Classe non trouvée')
      }
      
      // Create quiz
      const quizData = {
        title: quizTitle,
        description: quizDescription,
        level: classroom.grade as any,
        owner_id: profile?.id,
        classroom_id: selectedClassroom,
        school_id: classroom.school_id,
        is_published: publish
      }
      
      const createdQuiz = await createQuiz(quizData) as { id: string }
      
      // Create quiz items
      for (let i = 0; i < generatedQuiz.questions.length; i++) {
        const question = generatedQuiz.questions[i]
        await createQuizItem({
          school_id: classroom.school_id,
          classroom_id: selectedClassroom,
          quiz_id: createdQuiz.id,
          question: question.question,
          choices: question.choices,
          answer_keys: question.answer_keys,
          order_index: i
        })
      }
      
      const statusText = publish ? 'publié' : 'sauvegardé en brouillon'
      setSuccess(`Quiz "${quizTitle}" ${statusText} avec succès !`)
      addMessage('assistant', `Parfait ! Le quiz "${quizTitle}" a été ${statusText}. ${publish ? 'Il est maintenant visible par vos élèves.' : 'Vous pouvez le publier plus tard depuis votre liste de quiz.'}`)
      
      // Reset form
      setGeneratedQuiz(null)
      setQuizTitle('')
      setQuizDescription('')
      
    } catch (error: any) {
      handleSupabaseError(error as any)
      addMessage('assistant', `Erreur lors de la sauvegarde. Veuillez réessayer.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditQuestion = (index: number, newQuestion: Partial<QuizQuestion>) => {
    if (!generatedQuiz) return
    
    const updatedQuestions = [...generatedQuiz.questions]
    updatedQuestions[index] = { ...updatedQuestions[index], ...newQuestion }
    
    setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions })
    setEditingQuestionIndex(null)
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!canCreate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2 text-red-500" />
            Accès non autorisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Vous n'avez pas les permissions nécessaires pour créer un quiz.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customScrollbarStyles }} />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      {/* Hero Header */}
      <div className="relative mb-6 sm:mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl"></div>
        <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                  <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Assistant IA pour Quiz
                </h1>
                <p className="text-slate-400 text-sm sm:text-base lg:text-lg mt-1">Créez des quiz personnalisés grâce à l'intelligence artificielle</p>
              </div>
            </div>
            <div className="flex sm:hidden md:flex items-center justify-center sm:justify-start space-x-2">
              <div className="flex items-center space-x-1 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">IA Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Chat Interface */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl sm:rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl sm:rounded-3xl overflow-hidden h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col">
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[90%] sm:max-w-[85%] transform transition-all duration-300 hover:scale-[1.02] ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25' 
                      : 'bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg shadow-slate-700/25'
                  } rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-white/10`}>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${
                        message.role === 'assistant' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}>
                        {message.role === 'assistant' ? (
                          <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        ) : (
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-1 sm:mt-2 opacity-70`}>
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-slate-700/25 border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-400" />
                        <span className="text-xs sm:text-sm text-white font-medium">
                          {generatedQuiz ? 'Amélioration en cours...' : 'Génération du quiz en cours...'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex space-x-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 backdrop-blur-sm border-t border-slate-600/50 p-3 space-y-3">
              {/* Mobile scroll indicator */}
              <div className="sm:hidden flex items-center justify-center text-slate-400 text-xs mb-2">
                <div className="flex items-center space-x-2">
                  <span>Faites défiler pour voir l'aperçu</span>
                  <div className="w-4 h-4 border border-slate-400 rounded flex items-center justify-center">
                    <span className="text-xs">↓</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder={generatedQuiz ? "Modifications..." : "Décrivez votre leçon..."}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 text-sm"
                      rows={2}
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isGenerating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 text-sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quiz Preview */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl sm:rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl sm:rounded-3xl overflow-hidden h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col">
            {/* Quiz Header */}
            <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 border-b border-slate-600/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Aperçu</h3>
                </div>
                {generatedQuiz && (
                  <div className="bg-green-500/20 px-2 py-1 rounded border border-green-500/30">
                    <span className="text-green-400 text-sm">{generatedQuiz.questions.length} Q</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 custom-scrollbar">
            {!generatedQuiz ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 sm:space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl"></div>
                    <div className="relative bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3">Quiz en attente</h3>
                      <p className="text-slate-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xs sm:max-w-md mx-auto">
                        Décrivez votre leçon dans le chat pour que l'IA génère automatiquement un quiz personnalisé
                      </p>
                      <div className="mt-6 sm:mt-8 flex justify-center space-x-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {/* Quiz Details */}
                <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white">Détails du Quiz</h4>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6">
                    {/* Title Display/Edit */}
                    <div>
                      {quizTitle ? (
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                          {quizTitle}
                        </h2>
                      ) : (
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-400 mb-2 sm:mb-3 leading-tight italic">
                          Titre du quiz
                        </h2>
                      )}
                      <Input
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        placeholder="Saisissez le titre du quiz..."
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm sm:text-base"
                      />
                    </div>
                    
                    {/* Description Display/Edit */}
                    <div>
                      {quizDescription ? (
                        <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                          {quizDescription}
                        </p>
                      ) : (
                        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-2 sm:mb-3 italic">
                          Description du quiz
                        </p>
                      )}
                      <Textarea
                        value={quizDescription}
                        onChange={(e) => setQuizDescription(e.target.value)}
                        placeholder="Ajoutez une description pour ce quiz..."
                        rows={3}
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 backdrop-blur-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Questions */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <span className="text-sm sm:text-lg font-bold text-white">{generatedQuiz.questions.length}</span>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">Questions</h3>
                        <p className="text-slate-400 text-xs sm:text-sm">Cliquez sur une question pour la modifier</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                        {selectedClassroom && classrooms.find(c => c.id === selectedClassroom)?.grade}
                      </Badge>
                    </div>
                  </div>
                  
                  {generatedQuiz.questions.map((question, index) => (
                    <div key={index} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl group-hover:blur-xl sm:group-hover:blur-2xl transition-all"></div>
                      <div className="relative bg-gradient-to-br from-slate-700/60 to-slate-600/60 backdrop-blur-sm border border-slate-600/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-slate-500/60 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-blue-600/10">
                        <div className="space-y-3 sm:space-y-5">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start space-x-2 sm:space-x-4 flex-1">
                              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-xs sm:text-sm font-bold text-white">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white leading-relaxed text-sm sm:text-base lg:text-lg break-words">{question.question}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-slate-600/50 text-slate-300 hover:text-white flex-shrink-0 p-1 sm:p-2"
                              onClick={() => setEditingQuestionIndex(index)}
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        
                          <div className="grid grid-cols-1 gap-3 sm:gap-4 ml-8 sm:ml-14">
                            {question.choices.map((choice) => (
                              <div key={choice.id} className={`group/choice relative transform transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] ${
                                question.answer_keys.includes(choice.id) 
                                  ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/40 shadow-lg shadow-green-600/10' 
                                  : 'bg-gradient-to-r from-slate-600/30 to-slate-500/30 border-slate-500/30 hover:border-slate-400/50'
                              } rounded-lg sm:rounded-xl p-3 sm:p-4 border backdrop-blur-sm`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all flex-shrink-0 ${
                                      question.answer_keys.includes(choice.id)
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                                        : 'bg-gradient-to-r from-slate-500 to-slate-400 text-white'
                                    }`}>
                                      {choice.id}
                                    </div>
                                    <span className="text-white font-medium text-sm sm:text-base break-words">{choice.text}</span>
                                  </div>
                                  {question.answer_keys.includes(choice.id) && (
                                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                                      <span className="text-green-400 text-xs sm:text-sm font-medium hidden sm:inline">Correcte</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        
                          {question.explanation && (
                            <div className="ml-8 sm:ml-14 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                              <div className="flex items-start space-x-2 sm:space-x-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs sm:text-sm">💡</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                                    <span className="text-blue-300 font-bold text-xs sm:text-sm">EXPLICATION</span>
                                    <div className="h-px bg-blue-400/30 flex-1"></div>
                                  </div>
                                  <p className="text-slate-200 leading-relaxed text-sm sm:text-base break-words">{question.explanation}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                
                {/* Save Buttons */}
                <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white">Sauvegarder le Quiz</h4>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-blue-300 font-semibold text-sm sm:text-base">Publier le quiz</p>
                        <p className="text-slate-300 text-xs sm:text-sm break-words">Rend le quiz immédiatement disponible pour vos élèves</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-purple-300 font-semibold text-sm sm:text-base">Sauvegarder en brouillon</p>
                        <p className="text-slate-300 text-xs sm:text-sm break-words">Sauvegarde le quiz sans le publier. Vous pourrez le modifier plus tard</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Button 
                      onClick={() => handleSaveQuiz(true)}
                      disabled={!selectedClassroom || !quizTitle.trim() || isSaving}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 py-2.5 sm:py-3 text-sm sm:text-base"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                          <span className="hidden sm:inline">Publication...</span>
                          <span className="sm:hidden">Publier...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="hidden sm:inline">Publier le quiz</span>
                          <span className="sm:hidden">Publier</span>
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={() => handleSaveQuiz(false)}
                      disabled={!selectedClassroom || !quizTitle.trim() || isSaving}
                      className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white border border-slate-500/50 shadow-lg shadow-slate-600/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 py-2.5 sm:py-3 text-sm sm:text-base"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                          <span className="hidden sm:inline">Sauvegarde...</span>
                          <span className="sm:hidden">Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="hidden sm:inline">Sauvegarder en brouillon</span>
                          <span className="sm:hidden">Brouillon</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {(!selectedClassroom || !quizTitle.trim()) && (
                    <div className="flex items-center space-x-2 text-amber-400 bg-amber-400/10 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-amber-400/20">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0"></div>
                      <p className="text-xs sm:text-sm break-words">
                        {!selectedClassroom && "Sélectionnez une classe"}
                        {!selectedClassroom && !quizTitle.trim() && " et "}
                        {!quizTitle.trim() && "ajoutez un titre"}
                        {" pour activer les boutons de sauvegarde."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}