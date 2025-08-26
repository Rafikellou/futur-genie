import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Basic UI Component Tests
describe('UI Components Integration', () => {
  // Test a simple button component
  const SimpleButton = ({ onClick, children, disabled = false }: {
    onClick?: () => void
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )

  it('should render and handle button clicks', () => {
    const handleClick = jest.fn()
    render(<SimpleButton onClick={handleClick}>Click me</SimpleButton>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should handle disabled state', () => {
    const handleClick = jest.fn()
    render(<SimpleButton onClick={handleClick} disabled>Disabled Button</SimpleButton>)
    
    const button = screen.getByRole('button', { name: /disabled button/i })
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })
})

// Test form validation logic
describe('Form Validation Logic', () => {
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('test+tag@example.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test.example.com')).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak passwords', () => {
      const result = validatePassword('weak')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should provide specific error messages', () => {
      const result = validatePassword('lowercase123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).not.toContain('Password must contain at least one lowercase letter')
    })
  })

  describe('Quiz Validation', () => {
    it('should validate complete quiz data', () => {
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

    it('should reject incomplete quiz data', () => {
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
  })
})

// Test statistics calculation logic
describe('Statistics Calculations', () => {
  const calculateAverage = (scores: number[]): number => {
    if (scores.length === 0) return 0
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
  }

  const calculatePercentage = (numerator: number, denominator: number): number => {
    if (denominator === 0) return 0
    return Math.round((numerator / denominator) * 100)
  }

  const calculateEngagementStats = (submissions: any[]) => {
    const totalSubmissions = submissions.length
    const scores = submissions.map(sub => (sub.score / sub.total_questions) * 100)
    const averageScore = calculateAverage(scores)
    const perfectScores = submissions.filter(sub => sub.score === sub.total_questions).length
    
    // This week's activity (mock with recent submissions)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const thisWeekSubmissions = submissions.filter(sub => 
      new Date(sub.created_at) > oneWeekAgo
    ).length
    
    return {
      totalSubmissions,
      averageScore,
      perfectScores,
      thisWeekSubmissions,
      perfectScoreRate: calculatePercentage(perfectScores, totalSubmissions)
    }
  }

  describe('Average Calculations', () => {
    it('should calculate correct averages', () => {
      expect(calculateAverage([80, 90, 70])).toBe(80)
      expect(calculateAverage([100, 85, 95])).toBe(93.33)
      expect(calculateAverage([50])).toBe(50)
    })

    it('should handle edge cases', () => {
      expect(calculateAverage([])).toBe(0)
      expect(calculateAverage([0, 0, 0])).toBe(0)
      expect(calculateAverage([100])).toBe(100)
    })
  })

  describe('Percentage Calculations', () => {
    it('should calculate correct percentages', () => {
      expect(calculatePercentage(1, 4)).toBe(25)
      expect(calculatePercentage(3, 4)).toBe(75)
      expect(calculatePercentage(4, 4)).toBe(100)
    })

    it('should handle edge cases', () => {
      expect(calculatePercentage(0, 4)).toBe(0)
      expect(calculatePercentage(1, 0)).toBe(0) // Division by zero
    })
  })

  describe('Engagement Statistics', () => {
    const mockSubmissions = [
      {
        id: 'sub-1',
        score: 8,
        total_questions: 10,
        created_at: new Date().toISOString() // Recent
      },
      {
        id: 'sub-2',
        score: 10,
        total_questions: 10,
        created_at: new Date().toISOString() // Recent
      },
      {
        id: 'sub-3',
        score: 6,
        total_questions: 10,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
      }
    ]

    it('should calculate engagement statistics correctly', () => {
      const stats = calculateEngagementStats(mockSubmissions)
      
      expect(stats.totalSubmissions).toBe(3)
      expect(stats.averageScore).toBe(80) // (80 + 100 + 60) / 3
      expect(stats.perfectScores).toBe(1)
      expect(stats.thisWeekSubmissions).toBe(2)
      expect(stats.perfectScoreRate).toBe(33) // 1/3 * 100
    })

    it('should handle empty submissions', () => {
      const stats = calculateEngagementStats([])
      
      expect(stats.totalSubmissions).toBe(0)
      expect(stats.averageScore).toBe(0)
      expect(stats.perfectScores).toBe(0)
      expect(stats.thisWeekSubmissions).toBe(0)
      expect(stats.perfectScoreRate).toBe(0)
    })
  })
})

// Test utility functions
describe('Utility Functions', () => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR')
  }
  const slugify = (text: string): string => {
    // Normalize and remove diacritics, keep alphanumerics, spaces and dashes
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim()
    return normalized
  }

  const generateQuizCode = (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const testDate = new Date('2024-01-15')
      expect(formatDate(testDate)).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('Text Slugification', () => {
    it('should create valid slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('Math Quiz #1')).toBe('math-quiz-1')
      expect(slugify('français & english')).toBe('francais-english')
    })

    it('should handle edge cases', () => {
      expect(slugify('')).toBe('')
      expect(slugify('   multiple   spaces   ')).toBe('multiple-spaces')
      expect(slugify('---dashes---')).toBe('dashes')
    })
  })

  describe('Quiz Code Generation', () => {
    it('should generate codes of correct length', () => {
      expect(generateQuizCode(8)).toHaveLength(8)
      expect(generateQuizCode(12)).toHaveLength(12)
    })

    it('should generate unique codes', () => {
      const code1 = generateQuizCode()
      const code2 = generateQuizCode()
      // While not guaranteed, very unlikely to be the same
      expect(code1).not.toBe(code2)
    })

    it('should only contain valid characters', () => {
      const code = generateQuizCode()
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })
  })
})

// Test component integration
describe('Component Integration', () => {
  // Simple tab component for testing
  const TabComponent = ({ activeTab, onTabChange, tabs }: {
    activeTab: string
    onTabChange: (tab: string) => void
    tabs: { id: string; label: string; content: string }[]
  }) => {
    return (
      <div>
        <div role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {tabs.find(tab => tab.id === activeTab)?.content || 'No content'}
        </div>
      </div>
    )
  }

  it('should handle tab switching', () => {
    const mockOnTabChange = jest.fn()
    const tabs = [
      { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
      { id: 'tab2', label: 'Tab 2', content: 'Content 2' }
    ]

    render(
      <TabComponent
        activeTab="tab1"
        onTabChange={mockOnTabChange}
        tabs={tabs}
      />
    )

    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument()

    const tab2Button = screen.getByRole('tab', { name: /tab 2/i })
    fireEvent.click(tab2Button)

    expect(mockOnTabChange).toHaveBeenCalledWith('tab2')
  })

  it('should handle proper ARIA attributes', () => {
    const tabs = [
      { id: 'tab1', label: 'Tab 1', content: 'Content 1' }
    ]

    render(
      <TabComponent
        activeTab="tab1"
        onTabChange={jest.fn()}
        tabs={tabs}
      />
    )

    const tabButton = screen.getByRole('tab', { name: /tab 1/i })
    const tabPanel = screen.getByRole('tabpanel')

    expect(tabButton).toHaveAttribute('aria-selected', 'true')
    expect(tabPanel).toBeInTheDocument()
  })
})