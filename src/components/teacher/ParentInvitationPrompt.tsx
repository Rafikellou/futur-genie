'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Mail, Copy, X, CheckCircle } from 'lucide-react'

interface ParentInvitationPromptProps {
  hasParents: boolean
  invitationLink: string
  onClose: () => void
}

export function ParentInvitationPrompt({ hasParents, invitationLink, onClose }: ParentInvitationPromptProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed this prompt in this session
    const dismissed = sessionStorage.getItem('invitationPromptDismissed')
    if (dismissed) {
      setHasBeenDismissed(true)
      return
    }

    // Show popup after a delay if no parents and not dismissed
    if (!hasParents && !hasBeenDismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [hasParents, hasBeenDismissed])

  const handleClose = () => {
    setIsOpen(false)
    setHasBeenDismissed(true)
    sessionStorage.setItem('invitationPromptDismissed', 'true')
    onClose()
  }

  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const sendInvitationByEmail = () => {
    const subject = encodeURIComponent('Invitation à rejoindre Futur Génie')
    const body = encodeURIComponent(`Bonjour,\n\nVous êtes invité(e) à rejoindre la classe de votre enfant sur Futur Génie.\n\nCliquez sur ce lien pour vous inscrire :\n${invitationLink}\n\nCordialement`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  if (hasParents || hasBeenDismissed) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2 text-blue-400">
              <Users className="h-5 w-5" />
              <span>Invitez des parents !</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Votre classe est prête ! Partagez le lien d'invitation avec les parents pour qu'ils puissent suivre les progrès de leurs enfants.
            </p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/30">
            <div className="flex items-center space-x-2 mb-2">
              <code className="text-blue-400 text-xs break-all flex-1">{invitationLink}</code>
              <Button
                onClick={copyInvitationLink}
                variant="outline"
                size="sm"
                className="bg-slate-600/50 hover:bg-slate-500/50 border-slate-500/50 text-white p-2 h-auto"
              >
                {copySuccess ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            {copySuccess && (
              <div className="text-green-400 text-xs">Lien copié !</div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={sendInvitationByEmail}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm py-2"
            >
              <Mail className="h-4 w-4 mr-2" />
              Envoyer par Email
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-sm py-2"
            >
              Plus tard
            </Button>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-xs">
              Ce message ne s'affichera plus dans cette session
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
