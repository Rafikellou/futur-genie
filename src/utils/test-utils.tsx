import React from 'react'
import { render } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock Supabase client for testing
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            is: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: [],
                  error: null,
                })),
                data: [],
                error: null,
              })),
              single: jest.fn(() => ({
                data: null,
                error: null,
              })),
              data: [],
              error: null,
            })),
          })),
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
          order: jest.fn(() => ({
            data: [],
            error: null,
          })),
          limit: jest.fn(() => ({
            data: [],
            error: null,
          })),
          data: [],
          error: null,
        })),
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
        limit: jest.fn(() => ({
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
      order: jest.fn(() => ({
        data: [],
        error: null,
      })),
      limit: jest.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
})

// Mock user profiles for different roles
export const mockProfiles = {
  director: {
    id: 'director-123',
    role: 'DIRECTOR' as const,
    school_id: 'school-123',
    full_name: 'John Director',
    email: 'director@test.com',
    created_at: new Date().toISOString(),
  },
  teacher: {
    id: 'teacher-123',
    role: 'TEACHER' as const,
    school_id: 'school-123',
    full_name: 'Jane Teacher',
    email: 'teacher@test.com',
    created_at: new Date().toISOString(),
  },
  student: {
    id: 'student-123',
    role: 'STUDENT' as const,
    school_id: 'school-123',
    full_name: 'Alice Student',
    email: 'student@test.com',
    created_at: new Date().toISOString(),
  },
  parent: {
    id: 'parent-123',
    role: 'PARENT' as const,
    school_id: 'school-123',
    full_name: 'Bob Parent',
    email: 'parent@test.com',
    created_at: new Date().toISOString(),
  },
}

// Mock school data
export const mockSchool = {
  id: 'school-123',
  name: 'École Primaire Test',
  created_at: new Date().toISOString(),
}

// Mock classroom data
export const mockClassrooms = [
  {
    id: 'classroom-1',
    name: 'CM1 A',
    grade: 'CM1' as const,
    school_id: 'school-123',
    teacher_id: 'teacher-123',
    created_at: new Date().toISOString(),
  },
  {
    id: 'classroom-2',
    name: 'CM2 B',
    grade: 'CM2' as const,
    school_id: 'school-123',
    teacher_id: 'teacher-123',
    created_at: new Date().toISOString(),
  },
]

// Mock quiz data
export const mockQuizzes = [
  {
    id: 'quiz-1',
    title: 'Math Quiz 1',
    description: 'Basic math operations',
    level: 'CM1' as const,
    owner_id: 'teacher-123',
    classroom_id: 'classroom-1',
    is_published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'quiz-2',
    title: 'French Quiz 1',
    description: 'Grammar and vocabulary',
    level: 'CM2' as const,
    owner_id: 'teacher-123',
    classroom_id: 'classroom-2',
    is_published: false,
    created_at: new Date().toISOString(),
  },
]

// Mock quiz items
export const mockQuizItems = [
  {
    id: 'item-1',
    quiz_id: 'quiz-1',
    question: 'What is 2 + 2?',
    choices: [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
      { id: 'c', text: '5' },
    ],
    answer_keys: ['b'],
    order_index: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-2',
    quiz_id: 'quiz-1',
    question: 'What is 5 - 3?',
    choices: [
      { id: 'a', text: '1' },
      { id: 'b', text: '2' },
      { id: 'c', text: '3' },
    ],
    answer_keys: ['b'],
    order_index: 2,
    created_at: new Date().toISOString(),
  },
]

// Mock submissions
export const mockSubmissions = [
  {
    id: 'submission-1',
    quiz_id: 'quiz-1',
    student_id: 'student-123',
    answers: { 'item-1': ['b'], 'item-2': ['b'] },
    score: 2,
    total_questions: 2,
    created_at: new Date().toISOString(),
  },
]

// Mock statistics
export const mockStatistics = {
  school: {
    totalUsers: 50,
    totalTeachers: 10,
    totalStudents: 35,
    totalParents: 5,
    totalClasses: 8,
  },
  teacher: {
    totalQuizzes: 5,
    publishedQuizzes: 3,
    draftQuizzes: 2,
    totalSubmissions: 25,
    thisWeekSubmissions: 8,
  },
  student: {
    totalQuizzesTaken: 12,
    averageScore: 85,
    thisWeekQuizzes: 3,
    perfectScores: 4,
    bestScore: 95,
  },
  parent: {
    totalChildren: 2,
    totalQuizzesTaken: 24,
    averageScore: 82,
    thisWeekActivity: 6,
    perfectScores: 8,
  },
}

// Custom render function with AuthProvider
export const renderWithAuth = (ui: React.ReactElement, options = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Mock auth context values
export const createMockAuthContext = (profile: any = null, loading = false) => ({
  user: profile ? { id: profile.id, email: profile.email } : null,
  profile,
  loading,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
})

// Helper to create mock database responses
export const createMockDatabaseResponse = (data: any = null, error: any = null) => ({
  data,
  error,
})

// Helper to create mock async function
export const createMockAsyncFunction = (returnValue: any) => 
  jest.fn().mockResolvedValue(returnValue)

// Helper to create mock error async function
export const createMockErrorAsyncFunction = (error: Error) => 
  jest.fn().mockRejectedValue(error)

// Helper to wait for async operations
export const waitForAsyncOperations = () => 
  new Promise(resolve => setTimeout(resolve, 0))

// Mock date helpers
export const mockDate = (dateString: string) => {
  const mockDate = new Date(dateString)
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
  return mockDate
}

// Clean up mocks
export const cleanupMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

// Mock localStorage
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {}
  
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach(key => delete store[key])
      },
    },
    writable: true,
  })
  
  return store
}

// Mock window.location
export const mockWindowLocation = (url = 'http://localhost:3000/') => {
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    writable: true,
  })
}

// Helper to create mock form data
export const createMockFormData = (data: Record<string, any>) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

// Helper to simulate user interactions
export const userInteractions = {
  typeIntoInput: async (input: HTMLElement, text: string) => {
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input, { target: { value: text } })
  },
  
  clickButton: async (button: HTMLElement) => {
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(button)
  },
  
  submitForm: async (form: HTMLElement) => {
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.submit(form)
  },
}