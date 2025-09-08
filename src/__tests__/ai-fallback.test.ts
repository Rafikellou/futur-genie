import { generateQuizFromLesson, improveQuizQuestions } from '@/lib/openai'

// Mock the OpenAI client
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      }
    })
  }
})

describe('AI Fallback Mechanism', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateQuizFromLesson', () => {
    it('should use GPT model when available', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: "Test Quiz",
              description: "A test quiz",
              questions: [
                {
                  question: "What is 2+2?",
                  choices: [
                    { id: "A", text: "3" },
                    { id: "B", text: "4" },
                    { id: "C", text: "5" },
                    { id: "D", text: "6" }
                  ],
                  answer_keys: ["B"]
                }
              ]
            })
          }
        }]
      }

      const OpenAI = require('openai').default
      const mockOpenAI = new OpenAI()
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await generateQuizFromLesson("Basic math", "CE1", "gpt-5-mini")
      
      expect(result.title).toBe("Test Quiz")
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5-mini"
        })
      )
    })

    it('should handle JSON parsing errors gracefully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: "This is not JSON"
          }
        }]
      }

      const OpenAI = require('openai').default
      const mockOpenAI = new OpenAI()
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      await expect(generateQuizFromLesson("Basic math", "CE1", "gpt-5-mini"))
        .rejects
        .toThrow("Réponse de l'IA non valide")
    })
  })

  describe('improveQuizQuestions', () => {
    it('should improve quiz questions with GPT model', async () => {
      const currentQuestions = [
        {
          question: "What is 2+2?",
          choices: [
            { id: "A", text: "3" },
            { id: "B", text: "4" },
            { id: "C", text: "5" },
            { id: "D", text: "6" }
          ],
          answer_keys: ["B"]
        }
      ]

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                question: "What is 2+2?",
                choices: [
                  { id: "A", text: "3" },
                  { id: "B", text: "4" },
                  { id: "C", text: "5" },
                  { id: "D", text: "6" }
                ],
                answer_keys: ["B"],
                explanation: "2+2 equals 4"
              }
            ])
          }
        }]
      }

      const OpenAI = require('openai').default
      const mockOpenAI = new OpenAI()
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await improveQuizQuestions(currentQuestions, "Add explanation", "CE1", "gpt-5-mini")
      
      expect(result[0].explanation).toBe("2+2 equals 4")
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5-mini"
        })
      )
    })
  })
})