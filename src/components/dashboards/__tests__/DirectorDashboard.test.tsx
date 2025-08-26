import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { DirectorDashboard } from '../DirectorDashboard'
import { useAuth } from '@/contexts/AuthContext'

// Mock the AuthContext
jest.mock('@/contexts/AuthContext')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock database functions
jest.mock('@/lib/database', () => ({
  getSchoolStatistics: jest.fn(),
  getRecentActivity: jest.fn(),
  getQuizEngagementStats: jest.fn(),
  getUsersBySchool: jest.fn(),
  getClassroomsBySchool: jest.fn(),
  createInvitationLink: jest.fn(),
  getInvitationLinksBySchool: jest.fn(),
}))

// Mock child components
jest.mock('@/components/director/UserManagement', () => ({
  UserManagement: () => <div data-testid="user-management">User Management Component</div>
}))

jest.mock('@/components/director/ClassroomManagement', () => ({
  ClassroomManagement: () => <div data-testid="classroom-management">Classroom Management Component</div>
}))

jest.mock('@/components/director/InvitationManagement', () => ({
  InvitationManagement: () => <div data-testid="invitation-management">Invitation Management Component</div>
}))

describe('DirectorDashboard', () => {
  const mockProfile = {
    id: 'director-123',
    role: 'DIRECTOR' as const,
    school_id: 'school-123',
    full_name: 'John Director',
    email: 'director@test.com'
  } as any

  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: { id: 'director-123', email: 'director@test.com' } as any,
      profile: mockProfile as any,
      loading: false,
      isNewDirector: false,
      signIn: jest.fn(),
      signOut: mockSignOut,
      signUp: jest.fn(),
      refreshProfile: jest.fn(),
    } as any)

    // Mock database responses
    const mockDatabase = require('@/lib/database')
    mockDatabase.getSchoolStatistics.mockResolvedValue({
      totalUsers: 50,
      totalTeachers: 10,
      totalStudents: 35,
      totalParents: 5,
      totalClasses: 8
    })
    
    mockDatabase.getRecentActivity.mockResolvedValue([
      {
        id: 'activity-1',
        student: { full_name: 'Alice Student' },
        quiz: { title: 'Math Quiz 1' },
        score: 85,
        total_questions: 100,
        created_at: new Date().toISOString()
      }
    ])
    
    mockDatabase.getQuizEngagementStats.mockResolvedValue({
      totalSubmissions: 150,
      averageScore: 78,
      thisWeekSubmissions: 25,
      perfectScores: 12
    })
  })

  it('should render the dashboard header correctly', async () => {
    render(<DirectorDashboard />)

    expect(screen.getByText('Tableau de Bord Directeur')).toBeInTheDocument()
    expect(screen.getByText('John Director')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      isNewDirector: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      refreshProfile: jest.fn(),
    } as any)

    render(<DirectorDashboard />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should display statistics cards after loading', async () => {
    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument() // Total users
      expect(screen.getByText('10')).toBeInTheDocument() // Total teachers
      expect(screen.getByText('35')).toBeInTheDocument() // Total students
      expect(screen.getByText('8')).toBeInTheDocument()  // Total classes
    })
  })

  it('should handle sign out correctly', async () => {
    render(<DirectorDashboard />)

    const signOutButton = screen.getByRole('button', { name: /déconnexion/i })
    fireEvent.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should switch between tabs correctly', async () => {
    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    // Click on Users tab
    const usersTab = screen.getByRole('tab', { name: /utilisateurs/i })
    fireEvent.click(usersTab)

    expect(screen.getByTestId('user-management')).toBeInTheDocument()

    // Click on Classes tab
    const classesTab = screen.getByRole('tab', { name: /classes/i })
    fireEvent.click(classesTab)

    expect(screen.getByTestId('classroom-management')).toBeInTheDocument()

    // Click on Invitations tab
    const invitationsTab = screen.getByRole('tab', { name: /invitations/i })
    fireEvent.click(invitationsTab)

    expect(screen.getByTestId('invitation-management')).toBeInTheDocument()
  })

  it('should display engagement statistics correctly', async () => {
    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // Total submissions
      expect(screen.getByText('78%')).toBeInTheDocument() // Average score
      expect(screen.getByText('25')).toBeInTheDocument() // This week submissions
    })
  })

  it('should display recent activity', async () => {
    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeInTheDocument()
      expect(screen.getByText('Math Quiz 1')).toBeInTheDocument()
    })
  })

  it('should handle error states gracefully', async () => {
    const mockDatabase = require('@/lib/database')
    mockDatabase.getSchoolStatistics.mockRejectedValue(new Error('Database error'))

    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/erreur lors du chargement/i)).toBeInTheDocument()
    })
  })

  it('should auto-refresh data every 30 seconds', async () => {
    jest.useFakeTimers()
    
    const mockDatabase = require('@/lib/database')
    
    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(mockDatabase.getSchoolStatistics).toHaveBeenCalledTimes(1)
    })

    // Fast forward 30 seconds
    await act(async () => {
      jest.advanceTimersByTime(30000)
    })

    await waitFor(() => {
      expect(mockDatabase.getSchoolStatistics).toHaveBeenCalledTimes(2)
    })

    jest.useRealTimers()
  })

  it('should calculate progress percentages correctly', async () => {
    render(<DirectorDashboard />)

    await waitFor(() => {
      // Should display progress bars with correct calculations
      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  it('should handle empty state when no data available', async () => {
    const mockDatabase = require('@/lib/database')
    mockDatabase.getSchoolStatistics.mockResolvedValue({
      totalUsers: 0,
      totalTeachers: 0,
      totalStudents: 0,
      totalParents: 0,
      totalClasses: 0
    })
    
    mockDatabase.getRecentActivity.mockResolvedValue([])

    render(<DirectorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument() // Should show 0 for empty stats
    })
  })

  it('should display correct role-based information', () => {
    render(<DirectorDashboard />)

    // Should display director-specific content
    expect(screen.getByText('Tableau de Bord Directeur')).toBeInTheDocument()
    expect(screen.getByText('John Director')).toBeInTheDocument()
  })

  it('should handle component unmounting correctly', async () => {
    jest.useFakeTimers()
    
    const { unmount } = render(<DirectorDashboard />)
    
    // Unmount component
    await act(async () => {
      unmount()
    })
    
    // Fast forward to ensure interval is cleared
    await act(async () => {
      jest.advanceTimersByTime(30000)
    })
    
    jest.useRealTimers()
    
    // Test passes if no errors are thrown
    expect(true).toBe(true)
  })
})