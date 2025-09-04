import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface QuizQuestion {
  question: string
  choices: Array<{
    id: string
    text: string
  }>
  answer_keys: string[]
  explanation?: string
}

export interface GeneratedQuiz {
  title: string
  description: string
  questions: QuizQuestion[]
}

export async function generateQuizFromLesson(lessonDescription: string, gradeLevel: string): Promise<GeneratedQuiz> {
  try {
    const prompt = `Tu es un enseignant expert. Génère un quiz de 10 questions à choix multiples basé sur la leçon suivante pour des élèves de niveau ${gradeLevel}.

Leçon: ${lessonDescription}

Instructions:
- Crée exactement 10 questions variées (compréhension, application, analyse)
- Chaque question doit avoir 4 choix de réponse (A, B, C, D)
- Une seule réponse correcte par question
- Questions progressives en difficulté
- Adaptées au niveau ${gradeLevel}
- En français
- Ajoute une courte explication pour chaque réponse correcte

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "title": "Titre sans le mot 'quiz' (ex: 'L'addition avec retenue' au lieu de 'Quiz sur l'addition avec retenue')",
  "description": "Description courte du quiz",
  "questions": [
    {
      "question": "Question 1?",
      "choices": [
        {"id": "A", "text": "Réponse A"},
        {"id": "B", "text": "Réponse B"},
        {"id": "C", "text": "Réponse C"},
        {"id": "D", "text": "Réponse D"}
      ],
      "answer_keys": ["A"],
      "explanation": "Explication de la réponse correcte"
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant spécialisé dans la création de quiz éducatifs. Tu réponds UNIQUEMENT avec du JSON valide, sans texte supplémentaire."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const response = completion.choices[0]?.message?.content?.trim()
    
    if (!response) {
      throw new Error('Aucune réponse reçue de l\'IA')
    }

    // Clean up the response to ensure it's valid JSON
    let cleanedResponse = response
    
    // Remove any markdown code blocks
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    
    // Try to parse the JSON
    let parsedQuiz: GeneratedQuiz
    try {
      parsedQuiz = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw Response:', response)
      throw new Error('Réponse de l\'IA non valide. Veuillez réessayer.')
    }

    // Validate the structure
    if (!parsedQuiz.title || !parsedQuiz.questions || !Array.isArray(parsedQuiz.questions)) {
      throw new Error('Structure de quiz invalide reçue de l\'IA')
    }

    if (parsedQuiz.questions.length !== 10) {
      throw new Error(`Nombre de questions incorrect: ${parsedQuiz.questions.length} au lieu de 10`)
    }

    // Validate each question
    for (let i = 0; i < parsedQuiz.questions.length; i++) {
      const q = parsedQuiz.questions[i]
      if (!q.question || !q.choices || !Array.isArray(q.choices) || q.choices.length !== 4 || !q.answer_keys || !Array.isArray(q.answer_keys)) {
        throw new Error(`Question ${i + 1} a une structure invalide`)
      }
    }

    return parsedQuiz

  } catch (error: any) {
    console.error('OpenAI API Error:', error)
    
    if (error.message?.includes('API key')) {
      throw new Error('Clé API OpenAI non configurée. Veuillez contacter l\'administrateur.')
    }
    
    if (error.message?.includes('quota')) {
      throw new Error('Quota API dépassé. Veuillez réessayer plus tard.')
    }
    
    throw new Error(error.message || 'Erreur lors de la génération du quiz')
  }
}

export async function improveQuizQuestions(currentQuestions: QuizQuestion[], feedback: string, gradeLevel: string): Promise<QuizQuestion[]> {
  try {
    const prompt = `Tu es un enseignant expert. Améliore ces questions de quiz selon les commentaires fournis.

Questions actuelles:
${JSON.stringify(currentQuestions, null, 2)}

Commentaires/demandes d'amélioration:
${feedback}

Niveau: ${gradeLevel}

Instructions:
- Garde le même nombre de questions (${currentQuestions.length})
- Applique les améliorations demandées
- Maintiens 4 choix de réponse par question
- Adapte au niveau ${gradeLevel}
- En français

Réponds UNIQUEMENT avec un JSON valide contenant le tableau de questions améliorées:
[
  {
    "question": "Question améliorée?",
    "choices": [
      {"id": "A", "text": "Réponse A"},
      {"id": "B", "text": "Réponse B"},
      {"id": "C", "text": "Réponse C"},
      {"id": "D", "text": "Réponse D"}
    ],
    "answer_keys": ["A"],
    "explanation": "Explication"
  }
]`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant spécialisé dans l'amélioration de quiz éducatifs. Tu réponds UNIQUEMENT avec du JSON valide."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const response = completion.choices[0]?.message?.content?.trim()
    
    if (!response) {
      throw new Error('Aucune réponse reçue de l\'IA')
    }

    // Clean up the response
    let cleanedResponse = response
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    
    let improvedQuestions: QuizQuestion[]
    try {
      improvedQuestions = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw Response:', response)
      throw new Error('Réponse de l\'IA non valide. Veuillez réessayer.')
    }

    if (!Array.isArray(improvedQuestions)) {
      throw new Error('Format de réponse invalide')
    }

    // Validate each improved question
    for (let i = 0; i < improvedQuestions.length; i++) {
      const q = improvedQuestions[i]
      if (!q.question || !q.choices || !Array.isArray(q.choices) || q.choices.length !== 4 || !q.answer_keys || !Array.isArray(q.answer_keys)) {
        console.error(`Question améliorée ${i + 1} a une structure invalide:`, q)
        throw new Error(`Question améliorée ${i + 1} a une structure invalide`)
      }
    }

    console.log('Questions améliorées validées:', improvedQuestions.length)
    return improvedQuestions

  } catch (error: any) {
    console.error('OpenAI API Error:', error)
    throw new Error(error.message || 'Erreur lors de l\'amélioration du quiz')
  }
}