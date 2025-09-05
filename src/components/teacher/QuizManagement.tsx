'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Plus, Trash2, ChevronDown, ChevronRight, Calendar, Clock } from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description: string | null
  level: string
  is_published: boolean
  classroom_id: string | null
  created_at: string
  published_at?: string | null
  unpublish_at?: string | null
  classroom?: {
    id: string
    name: string
    grade: string
  }
}

interface QuizManagementProps {
  quizzes: Quiz[]
  onPublishQuiz: (quizId: string, currentStatus: boolean) => void
  onDeleteQuiz: (quizId: string, quizTitle: string) => void
  onCreateQuiz: () => void
}

interface DeleteConfirmationProps {
  quiz: Quiz | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmationDialog({ quiz, isOpen, onClose, onConfirm }: DeleteConfirmationProps) {
  if (!quiz) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-400">
            <Trash2 className="h-5 w-5" />
            <span>Supprimer le quiz</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Cette action est irréversible. Êtes-vous sûr de vouloir supprimer ce quiz ?
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
          <h4 className="font-semibold text-white mb-2">{quiz.title}</h4>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Créé le {new Date(quiz.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {quiz.classroom && (
              <div className="flex items-center space-x-1">
                <span>Classe: {quiz.classroom.name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer définitivement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function QuizManagement({ quizzes, onPublishQuiz, onDeleteQuiz, onCreateQuiz }: QuizManagementProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['thisWeek']))
  const [deleteQuiz, setDeleteQuiz] = useState<Quiz | null>(null)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const categorizeQuizzes = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const thisWeek: Quiz[] = []
    const lastWeek: Quiz[] = []
    const older: Quiz[] = []

    quizzes.forEach(quiz => {
      const createdAt = new Date(quiz.created_at)
      if (createdAt >= oneWeekAgo) {
        thisWeek.push(quiz)
      } else if (createdAt >= twoWeeksAgo) {
        lastWeek.push(quiz)
      } else {
        older.push(quiz)
      }
    })

    // Sort each category by creation date (newest first)
    const sortByDate = (a: Quiz, b: Quiz) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    
    return {
      thisWeek: thisWeek.sort(sortByDate),
      lastWeek: lastWeek.sort(sortByDate),
      older: older.sort(sortByDate)
    }
  }

  const formatUnpublishDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpiringSoon = (dateStr: string) => {
    const expiry = new Date(dateStr)
    const now = new Date()
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0
  }

  const handleDeleteClick = (quiz: Quiz) => {
    setDeleteQuiz(quiz)
  }

  const handleDeleteConfirm = () => {
    if (deleteQuiz) {
      onDeleteQuiz(deleteQuiz.id, deleteQuiz.title)
      setDeleteQuiz(null)
    }
  }

  const renderQuizCard = (quiz: Quiz) => (
    <div key={quiz.id} className="group relative">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-white font-medium text-base mb-2">
              {quiz.title}
            </h3>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{new Date(quiz.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              
              {quiz.is_published ? (
                <div className="text-sm text-slate-300">
                  {quiz.unpublish_at && (
                    <span className={isExpiringSoon(quiz.unpublish_at) ? 'text-amber-400' : 'text-slate-300'}>
                      En ligne jusqu'au {formatUnpublishDate(quiz.unpublish_at)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Brouillon
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {!quiz.is_published ? (
              <Button
                size="sm"
                onClick={() => onPublishQuiz(quiz.id, quiz.is_published)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
              >
                Publier
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPublishQuiz(quiz.id, quiz.is_published)}
                className="border-slate-600/50 text-slate-400 hover:bg-slate-600/10 hover:border-slate-500 px-3 py-1 text-xs"
              >
                Dépublier
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteClick(quiz)}
              className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-500 px-2 py-1"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSection = (title: string, sectionKey: string, quizzes: Quiz[], count: number) => {
    const isExpanded = expandedSections.has(sectionKey)
    
    return (
      <div key={sectionKey} className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/10 to-slate-500/10 rounded-2xl blur-xl"></div>
        <div className="relative bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-3 py-1 rounded-full border border-blue-500/30">
                <span className="text-blue-400 text-sm font-medium">{count}</span>
              </div>
            </div>
          </button>
          
          {isExpanded && (
            <div className="px-6 pb-6 space-y-3 border-t border-slate-600/30">
              {quizzes.length > 0 ? (
                quizzes.map(renderQuizCard)
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun quiz dans cette période</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl"></div>
                  <div className="relative bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-slate-600/30 rounded-3xl p-12">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <FileText className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Aucun quiz créé</h3>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto mb-8">
                      Commencez par créer votre premier quiz avec l'assistant Futur Génie
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105"
                      onClick={onCreateQuiz}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Créer mon premier quiz
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { thisWeek, lastWeek, older } = categorizeQuizzes()

  return (
    <div className="space-y-6">
      {renderSection('Cette semaine', 'thisWeek', thisWeek, thisWeek.length)}
      {renderSection('La semaine dernière', 'lastWeek', lastWeek, lastWeek.length)}
      {renderSection('Plus tôt', 'older', older, older.length)}
      
      <DeleteConfirmationDialog
        quiz={deleteQuiz}
        isOpen={!!deleteQuiz}
        onClose={() => setDeleteQuiz(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
