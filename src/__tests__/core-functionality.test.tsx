import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Core functionality tests for the educational platform
describe('Core Platform Functionality', () => {
  
  // Test form validation logic
  describe('Validation Functions', () => {
    const validateEmail = (email: string): boolean => {
      return email.includes('@') && email.includes('.')
    }

    const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
      const errors: string[] = []
      
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long')
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number')
      }
      
      return { isValid: errors.length === 0, errors }
    }

    it('should validate email addresses correctly', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user@domain.org')).toBe(true)
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
    })

    it('should validate password strength', () => {
      const strongPassword = validatePassword('StrongPass123')
      expect(strongPassword.isValid).toBe(true)
      expect(strongPassword.errors).toHaveLength(0)

      const weakPassword = validatePassword('weak')
      expect(weakPassword.isValid).toBe(false)
      expect(weakPassword.errors.length).toBeGreaterThan(0)
    })
  })

  // Test statistics calculations
  describe('Statistics Calculations', () => {
    const calculateAverage = (scores: number[]): number => {
      if (scores.length === 0) return 0
      return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
    }

    const calculatePercentage = (numerator: number, denominator: number): number => {
      if (denominator === 0) return 0
      return Math.round((numerator / denominator) * 100)
    }

    it('should calculate averages correctly', () => {
      expect(calculateAverage([80, 90, 70])).toBe(80)
      expect(calculateAverage([100, 85, 95])).toBe(93.33)
      expect(calculateAverage([])).toBe(0)
    })

    it('should calculate percentages correctly', () => {
      expect(calculatePercentage(1, 4)).toBe(25)
      expect(calculatePercentage(3, 4)).toBe(75)
      expect(calculatePercentage(0, 4)).toBe(0)
      expect(calculatePercentage(1, 0)).toBe(0) // Division by zero
    })

    it('should handle engagement statistics', () => {
      const submissions = [
        { score: 8, total_questions: 10 },
        { score: 10, total_questions: 10 },
        { score: 6, total_questions: 10 }
      ]

      const scores = submissions.map(sub => (sub.score / sub.total_questions) * 100)
      const averageScore = calculateAverage(scores)
      const perfectScores = submissions.filter(sub => sub.score === sub.total_questions).length

      expect(averageScore).toBe(80) // (80 + 100 + 60) / 3
      expect(perfectScores).toBe(1)
    })
  })

  // Test utility functions
  describe('Utility Functions', () => {
    const formatUserRole = (role: string): string => {
      const roleMap: { [key: string]: string } = {
        'DIRECTOR': 'Directeur',
        'TEACHER': 'Enseignant',
        'STUDENT': 'Élève',
        'PARENT': 'Parent'
      }
      return roleMap[role] || role
    }

    const generateRandomCode = (length: number = 8): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }

    it('should format user roles correctly', () => {
      expect(formatUserRole('DIRECTOR')).toBe('Directeur')
      expect(formatUserRole('TEACHER')).toBe('Enseignant')
      expect(formatUserRole('STUDENT')).toBe('Élève')
      expect(formatUserRole('PARENT')).toBe('Parent')
      expect(formatUserRole('UNKNOWN')).toBe('UNKNOWN')
    })

    it('should generate random codes', () => {
      const code = generateRandomCode(8)
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[A-Z0-9]+$/)

      const longerCode = generateRandomCode(12)
      expect(longerCode).toHaveLength(12)
    })
  })

  // Test component rendering
  describe('Component Rendering', () => {
    const SimpleButton = ({ onClick, children, disabled = false }: {
      onClick?: () => void
      children: React.ReactNode
      disabled?: boolean
    }) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    )

    const StatCard = ({ title, value, subtitle }: {
      title: string
      value: number | string
      subtitle?: string
    }) => (
      <div data-testid="stat-card">
        <h3>{title}</h3>
        <div data-testid="stat-value">{value}</div>
        {subtitle && <p>{subtitle}</p>}
      </div>
    )

    it('should render buttons correctly', () => {
      const handleClick = jest.fn()
      render(<SimpleButton onClick={handleClick}>Test Button</SimpleButton>)
      
      const button = screen.getByRole('button', { name: /test button/i })
      expect(button).toBeInTheDocument()
      
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should handle disabled button state', () => {
      const handleClick = jest.fn()
      render(<SimpleButton onClick={handleClick} disabled>Disabled Button</SimpleButton>)
      
      const button = screen.getByRole('button', { name: /disabled button/i })
      expect(button).toBeDisabled()
      
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should render stat cards correctly', () => {
      render(<StatCard title="Total Users" value={42} subtitle="Active this week" />)
      
      expect(screen.getByText('Total Users')).toBeInTheDocument()
      expect(screen.getByTestId('stat-value')).toHaveTextContent('42')
      expect(screen.getByText('Active this week')).toBeInTheDocument()
    })
  })

  // Test quiz functionality
  describe('Quiz Functionality', () => {
    const validateQuizData = (quiz: any): { isValid: boolean; errors: string[] } => {
      const errors: string[] = []
      
      if (!quiz.title || quiz.title.trim().length === 0) {
        errors.push('Quiz title is required')
      }
      if (!quiz.level) {
        errors.push('Quiz level is required')
      }
      if (!quiz.questions || quiz.questions.length === 0) {
        errors.push('Quiz must have at least one question')
      }
      
      return { isValid: errors.length === 0, errors }
    }

    const calculateQuizScore = (answers: any[], correctAnswers: any[]): number => {
      if (answers.length !== correctAnswers.length) return 0
      
      let correct = 0
      for (let i = 0; i < answers.length; i++) {
        if (JSON.stringify(answers[i]) === JSON.stringify(correctAnswers[i])) {
          correct++
        }
      }
      
      return Math.round((correct / correctAnswers.length) * 100)
    }

    it('should validate quiz data', () => {
      const validQuiz = {
        title: 'Math Quiz',
        level: 'CM1',
        questions: [
          { question: 'What is 2+2?', choices: ['3', '4', '5'], answer: '4' }
        ]
      }
      
      const result = validateQuizData(validQuiz)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid quiz data', () => {
      const invalidQuiz = {
        title: '',
        level: null,
        questions: []
      }
      
      const result = validateQuizData(invalidQuiz)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Quiz title is required')
      expect(result.errors).toContain('Quiz level is required')
      expect(result.errors).toContain('Quiz must have at least one question')
    })

    it('should calculate quiz scores correctly', () => {
      const studentAnswers = ['4', '6', '8']
      const correctAnswers = ['4', '5', '8']
      
      const score = calculateQuizScore(studentAnswers, correctAnswers)
      expect(score).toBe(67) // 2 out of 3 correct = 66.67% rounded to 67%
    })

    it('should handle perfect scores', () => {
      const studentAnswers = ['4', '5', '8']
      const correctAnswers = ['4', '5', '8']
      
      const score = calculateQuizScore(studentAnswers, correctAnswers)
      expect(score).toBe(100)
    })

    it('should handle empty or mismatched answers', () => {
      expect(calculateQuizScore([], ['4', '5'])).toBe(0)
      expect(calculateQuizScore(['4'], ['4', '5'])).toBe(0)
    })
  })

  // Test dashboard logic
  describe('Dashboard Logic', () => {
    const formatDashboardStats = (rawStats: any) => {
      return {
        totalUsers: rawStats.users || 0,
        totalClasses: rawStats.classes || 0,
        averageScore: Math.round(rawStats.averageScore || 0),
        engagement: rawStats.thisWeekActivity || 0
      }
    }

    const getDashboardGreeting = (role: string, name: string): string => {
      const greetings = {
        'DIRECTOR': `Bonjour ${name}, bienvenue sur votre tableau de bord directeur`,
        'TEACHER': `Bonjour ${name}, prêt pour une nouvelle journée d'enseignement ?`,
        'STUDENT': `Salut ${name} ! Prêt pour de nouveaux défis ?`,
        'PARENT': `Bonjour ${name}, suivez les progrès de vos enfants`
      }
      return greetings[role] || `Bonjour ${name}`
    }

    it('should format dashboard statistics', () => {
      const rawStats = {
        users: 45,
        classes: 8,
        averageScore: 78.6,
        thisWeekActivity: 12
      }

      const formatted = formatDashboardStats(rawStats)
      expect(formatted.totalUsers).toBe(45)
      expect(formatted.totalClasses).toBe(8)
      expect(formatted.averageScore).toBe(79) // Rounded
      expect(formatted.engagement).toBe(12)
    })

    it('should handle missing statistics gracefully', () => {
      const formatted = formatDashboardStats({})
      expect(formatted.totalUsers).toBe(0)
      expect(formatted.totalClasses).toBe(0)
      expect(formatted.averageScore).toBe(0)
      expect(formatted.engagement).toBe(0)
    })

    it('should generate appropriate greetings by role', () => {
      expect(getDashboardGreeting('DIRECTOR', 'John')).toContain('directeur')
      expect(getDashboardGreeting('TEACHER', 'Jane')).toContain('enseignement')
      expect(getDashboardGreeting('STUDENT', 'Alice')).toContain('défis')
      expect(getDashboardGreeting('PARENT', 'Bob')).toContain('enfants')
    })
  })
})