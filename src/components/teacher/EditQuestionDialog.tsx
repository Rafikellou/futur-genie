'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { updateQuizItem } from '@/lib/database'

// Custom scrollbar styles
const customScrollbarStyles = `
  .edit-question-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .edit-question-scrollbar::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.5);
    border-radius: 4px;
  }
  .edit-question-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #60a5fa, #a78bfa);
    border-radius: 4px;
  }
  .edit-question-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
  }
`

interface EditQuestionDialogProps {
  isOpen: boolean
  onClose: () => void
  question: {
    id: string
    question: string
    choices: Array<{ id: string; text: string }>
    answer_keys: string[]
  } | null
  onQuestionUpdated: () => void
}

export function EditQuestionDialog({ isOpen, onClose, question, onQuestionUpdated }: EditQuestionDialogProps) {
  const [questionText, setQuestionText] = useState('')
  const [choices, setChoices] = useState<Array<{ id: string; text: string }>>([])
  const [correctAnswerId, setCorrectAnswerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when question changes
  useEffect(() => {
    if (question) {
      setQuestionText(question.question)
      setChoices([...question.choices])
      setCorrectAnswerId(question.answer_keys[0] || '')
    }
  }, [question])

  const handleChoiceChange = (choiceId: string, newText: string) => {
    setChoices(prev => {
      // Create a deep copy of the choices array
      const newChoices = JSON.parse(JSON.stringify(prev))
      const choiceIndex = newChoices.findIndex((c: any) => c.id === choiceId)
      if (choiceIndex !== -1) {
        newChoices[choiceIndex].text = newText
      }
      return newChoices
    })
  }

  const handleSave = async () => {
    if (!question) return
    
    try {
      setLoading(true)
      setError(null)
      
      await updateQuizItem(question.id, {
        question: questionText,
        choices: choices,
        answer_keys: [correctAnswerId]
      })
      
      onQuestionUpdated()
      onClose()
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la mise à jour de la question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customScrollbarStyles }} />
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600/50 max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier la question</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifiez le texte de la question, les choix de réponse et sélectionnez la bonne réponse.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {question && (
            <div className="flex-1 overflow-y-auto edit-question-scrollbar pr-2 py-2">
              <div className="space-y-6 pb-4">
                <div>
                  <label htmlFor="question-text" className="text-white mb-2 block text-sm font-medium">
                    Texte de la question
                  </label>
                  <textarea
                    id="question-text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 rounded-lg p-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-white mb-2 block text-sm font-medium">
                    Choix de réponses
                  </label>
                  <div className="space-y-3">
                    {choices.map((choice) => (
                      <div key={choice.id} className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`choice-${choice.id}`}
                            name="correct-answer"
                            checked={correctAnswerId === choice.id}
                            onChange={() => setCorrectAnswerId(choice.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`choice-${choice.id}`} className="text-white text-sm">
                            {choice.id}
                          </label>
                        </div>
                        <input
                          value={choice.text}
                          onChange={(e) => handleChoiceChange(choice.id, e.target.value)}
                          className="flex-1 bg-slate-700/50 border-slate-600/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-slate-600 text-white hover:bg-slate-700"
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}