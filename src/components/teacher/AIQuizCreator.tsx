'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type QuizUpdate = Database['public']['Tables']['quizzes']['Update']
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Send, User, Sparkles, CheckCircle, XCircle, RefreshCw, Save, Loader2, MessageSquare, Edit, Trash2, ShieldAlert, FileText, Globe, Zap } from 'lucide-react'

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
  quiz?: GeneratedQuiz
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
      content: 'Bonjour, quelle est la leçon du jour ? Je me charge de créer un quiz pour qu\'ils la retienne en s\'amusant !',
      timestamp: new Date()
    }
  ])
  const [userInput, setUserInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Animated placeholder state
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [displayText, setDisplayText] = useState('')
  
  const placeholderMessages = [
    "Addition avec retenue",
    "Conjugaison au présent de l'indicatif, verbe 1er groupe",
    "La Fable du Corbeau et du Renard",
    "Les capitales du monde"
  ]
  
  // Quiz generation state
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null)
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // AI Model state
  const [aiModel, setAiModel] = useState<'gpt-5-mini' | 'gpt-5'>('gpt-5-mini')
  const [hasInteracted, setHasInteracted] = useState(false)
  
  // Success popup state
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')
  const [popupIsPublished, setPopupIsPublished] = useState(false)

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

  // Animated placeholder effect
  useEffect(() => {
    if (userInput) return // Don't show animation if user is typing
    
    const currentMessage = placeholderMessages[placeholderIndex]
    let currentIndex = 0
    
    const typeText = () => {
      if (currentIndex <= currentMessage.length) {
        setDisplayText(currentMessage.slice(0, currentIndex))
        currentIndex++
        setTimeout(typeText, 100)
      } else {
        setTimeout(() => {
          const eraseText = () => {
            if (currentIndex > 0) {
              setDisplayText(currentMessage.slice(0, currentIndex))
              currentIndex--
              setTimeout(eraseText, 50)
            } else {
              setPlaceholderIndex((prev) => (prev + 1) % placeholderMessages.length)
            }
          }
          eraseText()
        }, 2000)
      }
    }
    
    typeText()
  }, [placeholderIndex, userInput])

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

  const addMessage = (role: 'user' | 'assistant', content: string, quiz?: GeneratedQuiz) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      quiz: quiz
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
    
    // Mark that user has interacted (for showing boost button)
    if (!hasInteracted) {
      setHasInteracted(true)
    }
    
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
          gradeLevel,
          aiModel
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
      
      // Add assistant response with quiz data
      const modelText = aiModel === 'gpt-5' ? ' (Intelligence boostée)' : ''
      addMessage('assistant', `J'ai généré un quiz "${quiz.title}" avec ${quiz.questions.length} questions basées sur votre leçon${modelText} :`, quiz)
      
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
          gradeLevel,
          aiModel
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'amélioration')
      }
      
      const { questions } = await response.json()
      const updatedQuiz = { ...generatedQuiz!, questions }
      setGeneratedQuiz(updatedQuiz)
      
      // Add assistant response with updated quiz
      addMessage('assistant', 'J\'ai amélioré les questions selon vos demandes :', updatedQuiz)
      
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
      
      // If publishing, update publication dates via API
      if (publish) {
        const { data: session } = await supabase.auth.getSession()
        if (!session.session?.access_token) {
          throw new Error('Session expirée, veuillez vous reconnecter')
        }

        const publishResponse = await fetch('/api/quizzes/publish', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`
          },
          body: JSON.stringify({ 
            quizId: createdQuiz.id, 
            isPublished: true 
          }),
        });
        
        if (!publishResponse.ok) {
          const errorData = await publishResponse.json().catch(() => ({}));
          throw new Error(`Erreur lors de la publication: ${errorData.error || 'Erreur inconnue'}`);
        }
      }
      
      const statusText = publish ? 'publié' : 'sauvegardé en brouillon'
      
      // Show modern success popup
      setPopupMessage(`Quiz "${quizTitle}" ${statusText} avec succès !`)
      setPopupIsPublished(publish)
      setShowPopup(true)
      
      // Auto-hide popup after 5 seconds
      setTimeout(() => setShowPopup(false), 5000)
      
      addMessage('assistant', `✅ Parfait ! Le quiz "${quizTitle}" a été ${statusText}. Vous pouvez retrouver ce quiz dans l'espace "Mes Quiz" de votre tableau de bord.`)
      
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
      <div className="space-y-6">
      
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
      
      <div className="w-full h-full">
        {/* Chat Interface - Full screen adaptation */}
        <div className="relative h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl sm:rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '400px', maxHeight: '700px' }}>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`w-full max-w-4xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`transform transition-all duration-300 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25 ml-auto max-w-[80%]' 
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
                      
                      {/* Inline Quiz Display */}
                      {message.quiz && (
                        <div className="mt-4 space-y-4">
                          
                          {/* Quiz Questions */}
                          <div className="space-y-4">
                            {message.quiz.questions.map((question, index) => (
                              <div key={index} className="bg-gradient-to-br from-slate-600/40 to-slate-500/40 backdrop-blur-sm border border-slate-500/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-sm font-bold text-white">{index + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-white leading-relaxed text-sm">{question.question}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 ml-11">
                                  {question.choices.map((choice) => (
                                    <div key={choice.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                      question.answer_keys.includes(choice.id) 
                                        ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/40' 
                                        : 'bg-gradient-to-r from-slate-500/20 to-slate-400/20 border-slate-400/30'
                                    }`}>
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        question.answer_keys.includes(choice.id)
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                          : 'bg-gradient-to-r from-slate-400 to-slate-300 text-white'
                                      }`}>
                                        {choice.id}
                                      </div>
                                      <span className="text-white text-sm">{choice.text}</span>
                                      {question.answer_keys.includes(choice.id) && (
                                        <CheckCircle className="h-4 w-4 text-green-400 ml-auto" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                
                                {question.explanation && (
                                  <div className="ml-11 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                        <span className="text-xs">💡</span>
                                      </div>
                                      <div>
                                        <span className="text-blue-300 font-bold text-xs">EXPLICATION</span>
                                        <p className="text-slate-200 text-sm mt-1">{question.explanation}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="bg-gradient-to-r from-slate-600/50 to-slate-500/50 backdrop-blur-sm border border-slate-500/30 rounded-xl p-4 space-y-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                                <Save className="h-3 w-3 text-white" />
                              </div>
                              <h4 className="text-base font-bold text-white">Sauvegarder le Quiz</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Button 
                                onClick={() => handleSaveQuiz(true)}
                                disabled={!selectedClassroom || !quizTitle.trim() || isSaving}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 py-2.5 text-sm"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Publication...
                                  </>
                                ) : (
                                  <>
                                    <Globe className="h-4 w-4 mr-2" />
                                    Publier le quiz
                                  </>
                                )}
                              </Button>
                              
                              <Button 
                                onClick={() => handleSaveQuiz(false)}
                                disabled={!selectedClassroom || !quizTitle.trim() || isSaving}
                                className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white border border-slate-500/50 shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 py-2.5 text-sm"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sauvegarde...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Sauvegarder en brouillon
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {(!selectedClassroom || !quizTitle.trim()) && (
                              <div className="flex items-center space-x-2 text-amber-400 bg-amber-400/10 px-3 py-2 rounded-lg border border-amber-400/20">
                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                <p className="text-xs">
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
            <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 backdrop-blur-sm border-t border-slate-600/50 p-4">
              <div className="relative">
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder={userInput ? "" : (generatedQuiz ? "Modifications..." : displayText)}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 text-base resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    {/* AI Model Boost Button */}
                    {hasInteracted && (
                      <Button 
                        onClick={() => setAiModel(aiModel === 'gpt-5-mini' ? 'gpt-5' : 'gpt-5-mini')}
                        className={`${
                          aiModel === 'gpt-5' 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                            : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
                        } text-white px-3 py-2 text-xs font-medium shadow-lg transition-all duration-300 hover:scale-105 border-0`}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {aiModel === 'gpt-5-mini' ? 'Boost' : 'Boosté ✨'}
                      </Button>
                    )}
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isGenerating}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 text-base font-medium shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Modern Success Popup */}
    {showPopup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600/50 rounded-2xl p-6 max-w-md w-full shadow-2xl transform animate-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              popupIsPublished 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}>
              {popupIsPublished ? (
                <Globe className="h-8 w-8 text-white" />
              ) : (
                <Save className="h-8 w-8 text-white" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                {popupIsPublished ? 'Quiz Publié !' : 'Quiz Sauvegardé !'}
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {popupMessage}
              </p>
              {popupIsPublished && (
                <p className="text-green-400 text-xs">
                  ✨ Vos élèves peuvent maintenant accéder au quiz
                </p>
              )}
            </div>
            
            <Button 
              onClick={() => setShowPopup(false)}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-2 text-sm font-medium shadow-lg transition-all duration-300 hover:scale-105 border-0"
            >
              Parfait !
            </Button>
          </div>
        </div>
      </div>
    )}
    
    </>
  )
}