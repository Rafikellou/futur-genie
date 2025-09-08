import { NextRequest, NextResponse } from 'next/server'
import { generateQuizFromLesson } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { lessonDescription, gradeLevel, aiModel } = await request.json()

    if (!lessonDescription || !gradeLevel) {
      return NextResponse.json(
        { error: 'Description de la leçon et niveau requis' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API OpenAI manquante. Veuillez vérifier la configuration.' },
        { status: 500 }
      )
    }

    const quiz = await generateQuizFromLesson(lessonDescription, gradeLevel, aiModel)

    return NextResponse.json(quiz)
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération du quiz' },
      { status: 500 }
    )
  }
}