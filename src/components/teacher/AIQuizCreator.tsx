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
import { Bot, Send, User, Sparkles, CheckCircle, XCircle, RefreshCw, Save, Loader2, MessageSquare, Edit, Trash2, ShieldAlert } from 'lucide-react'
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
  const [improvementFeedback, setImprovementFeedback] = useState('')
  const [isImproving, setIsImproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile?.id) {
      fetchClassrooms()
    }
  }, [profile?.id])

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
    
    const lessonDescription = userInput.trim()
    setUserInput('')
    
    // Add user message
    addMessage('user', lessonDescription)
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
      
      // Generate quiz using API
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonDescription,
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
      addMessage('assistant', `J'ai généré un quiz "${quiz.title}" avec 10 questions basées sur votre leçon. Vous pouvez maintenant réviser les questions, demander des modifications, ou sauvegarder le quiz directement.`)
      
    } catch (error: any) {
      handleSupabaseError(error as any)
      addMessage('assistant', `Désolé, une erreur s'est produite. Veuillez réessayer.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImproveQuiz = async () => {
    if (!generatedQuiz || !improvementFeedback.trim() || isImproving) return
    
    setIsImproving(true)
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
          feedback: improvementFeedback,
          gradeLevel
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'amélioration')
      }
      
      const { questions } = await response.json()
      setGeneratedQuiz(prev => prev ? { ...prev, questions } : null)
      
      // Add messages
      addMessage('user', `Amélioration demandée: ${improvementFeedback}`)
      addMessage('assistant', 'J\'ai amélioré les questions selon vos demandes. Vérifiez les modifications et dites-moi si vous souhaitez d\'autres ajustements.')
      
      setImprovementFeedback('')
      
    } catch (error: any) {
      handleSupabaseError(error as any)
      addMessage('assistant', `Erreur lors de l'amélioration. Veuillez réessayer.`)
    } finally {
      setIsImproving(false)
    }
  }

  const handleSaveQuiz = async () => {
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
        is_published: false
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
      
      setSuccess(`Quiz "${quizTitle}" créé avec succès ! Vous pouvez le retrouver dans vos quiz pour le publier.`)
      addMessage('assistant', `Parfait ! Le quiz "${quizTitle}" a été sauvegardé. Il apparaîtra dans votre liste de quiz en mode brouillon. Vous pourrez le publier quand vous serez prêt.`)
      
      // Reset form
      setGeneratedQuiz(null)
      setQuizTitle('')
      setQuizDescription('')
      setSelectedClassroom('')
      
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Bot className="h-6 w-6 mr-2 text-blue-600" />
            Assistant IA pour Quiz
          </h2>
          <p className="text-gray-600">Créez des quiz personnalisés grâce à l'intelligence artificielle</p>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Discussion avec l'IA
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' ? (
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Génération du quiz en cours...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="border-t p-4 space-y-3">
              <div className="space-y-2">
                <Label>Classe cible (optionnel)</Label>
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(classroom => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name} ({classroom.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Décrivez votre leçon du jour..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1"
                  rows={2}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isGenerating}
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quiz Preview */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              Quiz Généré
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {!generatedQuiz ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Le quiz apparaîtra ici après génération</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quiz Details */}
                <div className="space-y-3">
                  <div>
                    <Label>Titre du quiz</Label>
                    <Input
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="Titre du quiz"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      placeholder="Description du quiz"
                      rows={2}
                    />
                  </div>
                </div>
                
                {/* Questions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Questions ({generatedQuiz.questions.length})</h3>
                    <Badge variant="outline">
                      {selectedClassroom && classrooms.find(c => c.id === selectedClassroom)?.grade}
                    </Badge>
                  </div>
                  
                  {generatedQuiz.questions.map((question, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="font-medium">Q{index + 1}: {question.question}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQuestionIndex(index)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {question.choices.map((choice) => (
                            <div key={choice.id} className={`p-2 rounded border ${
                              question.answer_keys.includes(choice.id) 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <span className="font-mono text-sm mr-2">{choice.id})</span>
                              {choice.text}
                              {question.answer_keys.includes(choice.id) && (
                                <CheckCircle className="h-4 w-4 text-green-600 float-right" />
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {question.explanation && (
                          <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            <strong>Explication:</strong> {question.explanation}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                
                {/* Improvement Section */}
                <div className="space-y-3 border-t pt-4">
                  <Label>Demander des améliorations</Label>
                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Ex: Rendre les questions plus difficiles, ajouter plus de vocabulaire..."
                      value={improvementFeedback}
                      onChange={(e) => setImprovementFeedback(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleImproveQuiz}
                      disabled={!improvementFeedback.trim() || isImproving}
                      variant="outline"
                    >
                      {isImproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="border-t pt-4">
                  <Button 
                    onClick={handleSaveQuiz}
                    disabled={!selectedClassroom || !quizTitle.trim() || isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sauvegarde en cours...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder le Quiz
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}