import { NextRequest, NextResponse } from 'next/server'
import { improveQuizQuestions } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { currentQuestions, feedback, gradeLevel, aiModel } = await request.json()

    if (!currentQuestions || !feedback || !gradeLevel) {
      return NextResponse.json(
        { error: 'Questions actuelles, commentaires et niveau requis' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée' },
        { status: 500 }
      )
    }

    const improvedQuestions = await improveQuizQuestions(currentQuestions, feedback, gradeLevel, aiModel)

    return NextResponse.json({ questions: improvedQuestions })
  } catch (error: any) {
    console.error('Quiz improvement error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'amélioration du quiz' },
      { status: 500 }
    )
  }
}