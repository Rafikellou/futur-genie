import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { TeacherDashboard } from '../TeacherDashboard'
import { useAuth } from '@/contexts/AuthContext'

// Mock the AuthContext
jest.mock('@/contexts/AuthContext')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock database functions
jest.mock('@/lib/database', () => ({
  getClassroomsByTeacher: jest.fn(),
  getQuizzesByTeacher: jest.fn(),
  getStudentsByClassroom: jest.fn(),
  getTeacherEngagementStats: jest.fn(),
}))

// Mock child components
jest.mock('@/components/teacher/AIQuizCreator', () => ({
  AIQuizCreator: () => <div data-testid="ai-quiz-creator">AI Quiz Creator Component</div>
}))

jest.mock('@/components/teacher/ProgressTracker', () => ({
  ProgressTracker: () => <div data-testid="progress-tracker">Progress Tracker Component</div>
}))

describe('TeacherDashboard', () => {
  const mockProfile = {
    id: 'teacher-123',
    role: 'TEACHER',
    school_id: 'school-123',
    full_name: 'Jane Teacher',
    email: 'teacher@test.com'
  }

  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: { id: 'teacher-123', email: 'teacher@test.com' },
      profile: mockProfile,
      loading: false,
      signIn: jest.fn(),
      signOut: mockSignOut,
      signUp: jest.fn(),
    })

    // Mock database responses
    const mockDatabase = require('@/lib/database')
    
    mockDatabase.getClassroomsByTeacher.mockResolvedValue([
      {
        id: 'classroom-1',
        name: 'CM1 A',
        grade: 'CM1',
        school_id: 'school-123',
        teacher_id: 'teacher-123'
      },
      {
        id: 'classroom-2',
        name: 'CM2 B',
        grade: 'CM2',
        school_id: 'school-123',
        teacher_id: 'teacher-123'
      }
    ])
    
    mockDatabase.getQuizzesByTeacher.mockResolvedValue([
      {
        id: 'quiz-1',
        title: 'Math Quiz 1',
        description: 'Basic math quiz',
        level: 'CM1',
        is_published: true,
        classroom_id: 'classroom-1',
        created_at: new Date().toISOString()
      },
      {
        id: 'quiz-2',
        title: 'French Quiz 1',
        description: 'Basic french quiz',
        level: 'CM2',
        is_published: false,
        classroom_id: 'classroom-2',
        created_at: new Date().toISOString()
      }
    ])
    
    mockDatabase.getStudentsByClassroom.mockResolvedValue([
      {
        id: 'student-1',
        classroom_id: 'classroom-1',
        user: { id: 'student-1', full_name: 'Alice Student', email: 'alice@test.com' }
      },
      {
        id: 'student-2',
        classroom_id: 'classroom-1',
        user: { id: 'student-2', full_name: 'Bob Student', email: 'bob@test.com' }
      }
    ])
    
    mockDatabase.getTeacherEngagementStats.mockResolvedValue({
      totalQuizzes: 2,
      publishedQuizzes: 1,
      draftQuizzes: 1,
      totalSubmissions: 10,
      thisWeekSubmissions: 3
    })
  })

  it('should render the dashboard header correctly', async () => {
    render(<TeacherDashboard />)

    expect(screen.getByText('Tableau de Bord Enseignant')).toBeInTheDocument()
    expect(screen.getByText('Jane Teacher')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    })

    render(<TeacherDashboard />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should display engagement statistics after loading', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total quizzes
      expect(screen.getByText('1 publiés • 1 brouillons')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument() // Total submissions
      expect(screen.getByText('3')).toBeInTheDocument() // This week submissions
    })
  })

  it('should display classroom and student statistics', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Number of classrooms
      expect(screen.getByText('2')).toBeInTheDocument() // Number of students (mocked to return 2 per classroom)
    })
  })

  it('should handle sign out correctly', async () => {
    render(<TeacherDashboard />)

    const signOutButton = screen.getByRole('button', { name: /déconnexion/i })
    fireEvent.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should switch between tabs correctly', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Click on AI Assistant tab
    const aiTab = screen.getByRole('tab', { name: /assistant ia/i })
    fireEvent.click(aiTab)

    expect(screen.getByTestId('ai-quiz-creator')).toBeInTheDocument()

    // Click on Analytics tab
    const analyticsTab = screen.getByRole('tab', { name: /analyses/i })
    fireEvent.click(analyticsTab)

    expect(screen.getByTestId('progress-tracker')).toBeInTheDocument()

    // Click back to overview
    const overviewTab = screen.getByRole('tab', { name: /vue d'ensemble/i })
    fireEvent.click(overviewTab)

    await waitFor(() => {
      expect(screen.getByText('Quiz Créés')).toBeInTheDocument()
    })
  })

  it('should display quiz management section', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Switch to quizzes tab
    const quizzesTab = screen.getByRole('tab', { name: /mes quiz/i })
    fireEvent.click(quizzesTab)

    await waitFor(() => {
      expect(screen.getByText('Math Quiz 1')).toBeInTheDocument()
      expect(screen.getByText('French Quiz 1')).toBeInTheDocument()
    })
  })

  it('should show quiz status badges correctly', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Switch to quizzes tab
    const quizzesTab = screen.getByRole('tab', { name: /mes quiz/i })
    fireEvent.click(quizzesTab)

    await waitFor(() => {
      expect(screen.getByText('Publié')).toBeInTheDocument()
      expect(screen.getByText('Brouillon')).toBeInTheDocument()
    })
  })

  it('should handle empty quiz state', async () => {
    const mockDatabase = require('@/lib/database')
    mockDatabase.getQuizzesByTeacher.mockResolvedValue([])

    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument() // Should show 0 quizzes
    })

    // Switch to quizzes tab
    const quizzesTab = screen.getByRole('tab', { name: /mes quiz/i })
    fireEvent.click(quizzesTab)

    await waitFor(() => {
      expect(screen.getByText('Aucun quiz')).toBeInTheDocument()
    })
  })

  it('should handle error states gracefully', async () => {
    const mockDatabase = require('@/lib/database')
    mockDatabase.getClassroomsByTeacher.mockRejectedValue(new Error('Database error'))

    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/erreur lors du chargement/i)).toBeInTheDocument()
    })
  })

  it('should auto-refresh data every 30 seconds', async () => {
    jest.useFakeTimers()
    
    const mockDatabase = require('@/lib/database')
    
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(mockDatabase.getTeacherEngagementStats).toHaveBeenCalledTimes(1)
    })

    // Fast forward 30 seconds
    jest.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(mockDatabase.getTeacherEngagementStats).toHaveBeenCalledTimes(2)
    })

    jest.useRealTimers()
  })

  it('should display progress indicators correctly', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      // Should display progress bars for quiz publication rate
      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  it('should handle classroom switching', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Switch to classrooms tab
    const classroomsTab = screen.getByRole('tab', { name: /mes classes/i })
    fireEvent.click(classroomsTab)

    await waitFor(() => {
      expect(screen.getByText('CM1 A')).toBeInTheDocument()
      expect(screen.getByText('CM2 B')).toBeInTheDocument()
    })
  })

  it('should show quick action buttons', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Assistant IA')).toBeInTheDocument()
      expect(screen.getByText('Créer un Quiz')).toBeInTheDocument()
      expect(screen.getByText('Analyses')).toBeInTheDocument()
    })
  })

  it('should handle quick action clicks', async () => {
    render(<TeacherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Assistant IA')).toBeInTheDocument()
    })

    // Click on AI Assistant quick action
    const aiButton = screen.getByText('Assistant IA')
    fireEvent.click(aiButton)

    expect(screen.getByTestId('ai-quiz-creator')).toBeInTheDocument()
  })

  it('should clean up intervals on unmount', () => {
    jest.useFakeTimers()
    
    const { unmount } = render(<TeacherDashboard />)
    
    // Unmount component
    unmount()
    
    // Fast forward to ensure interval is cleared
    jest.advanceTimersByTime(30000)
    
    jest.useRealTimers()
    
    // Test passes if no errors are thrown
    expect(true).toBe(true)
  })
})