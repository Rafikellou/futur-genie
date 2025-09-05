/**
 * Quiz Auto-Unpublish Scheduler
 * Gère la dépublication automatique des quiz après 7 jours
 */

import { supabase } from './supabase'

export interface QuizScheduleInfo {
  id: string
  title: string
  published_at: string
  unpublish_date: string
  is_published: boolean
}

/**
 * Calcule la date de dépublication (7 jours après publication)
 */
export function calculateUnpublishDate(publishedAt: Date): Date {
  const unpublishDate = new Date(publishedAt)
  unpublishDate.setDate(unpublishDate.getDate() + 7)
  return unpublishDate
}

/**
 * Met à jour un quiz avec sa date de publication et de dépublication
 */
export async function scheduleQuizUnpublish(quizId: string, isPublished: boolean): Promise<void> {
  const now = new Date().toISOString()
  
  const updateData: any = {
    is_published: isPublished,
    updated_at: now
  }

  if (isPublished) {
    // Si on publie le quiz, définir la date de publication et calculer la dépublication
    updateData.published_at = now
    updateData.unpublish_date = calculateUnpublishDate(new Date(now)).toISOString()
  } else {
    // Si on dépublie manuellement, effacer les dates
    updateData.published_at = null
    updateData.unpublish_date = null
  }

  const { error } = await supabase
    .from('quizzes')
    .update(updateData)
    .eq('id', quizId)

  if (error) throw error
}

/**
 * Récupère tous les quiz qui doivent être dépubliés
 */
export async function getQuizzesToUnpublish(): Promise<QuizScheduleInfo[]> {
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, published_at, unpublish_date, is_published')
    .eq('is_published', true)
    .not('unpublish_date', 'is', null)
    .lte('unpublish_date', now)

  if (error) throw error
  return data || []
}

/**
 * Dépublie automatiquement les quiz expirés
 */
export async function unpublishExpiredQuizzes(): Promise<number> {
  const expiredQuizzes = await getQuizzesToUnpublish()
  
  if (expiredQuizzes.length === 0) {
    return 0
  }

  const quizIds = expiredQuizzes.map(q => q.id)
  
  const { error } = await supabase
    .from('quizzes')
    .update({
      is_published: false,
      unpublish_date: null,
      updated_at: new Date().toISOString()
    })
    .in('id', quizIds)

  if (error) throw error
  
  return expiredQuizzes.length
}

/**
 * Formate une date de dépublication pour l'affichage
 */
export function formatUnpublishDate(unpublishDate: string): string {
  const date = new Date(unpublishDate)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Vérifie si un quiz va expirer bientôt (dans les 24h)
 */
export function isQuizExpiringSoon(unpublishDate: string): boolean {
  const expiry = new Date(unpublishDate)
  const now = new Date()
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0
}

/**
 * Obtient le temps restant avant dépublication
 */
export function getTimeUntilUnpublish(unpublishDate: string): string {
  const expiry = new Date(unpublishDate)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  
  if (diffMs <= 0) {
    return 'Expiré'
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days}j ${hours}h restantes`
  } else {
    return `${hours}h restantes`
  }
}
