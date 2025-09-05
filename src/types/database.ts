export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          role: 'DIRECTOR' | 'TEACHER' | 'PARENT'
          school_id: string | null
          classroom_id: string | null
          email: string | null
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'DIRECTOR' | 'TEACHER' | 'PARENT'
          school_id?: string | null
          classroom_id?: string | null
          email?: string | null
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'DIRECTOR' | 'TEACHER' | 'PARENT'
          school_id?: string | null
          classroom_id?: string | null
          email?: string | null
          full_name?: string | null
          created_at?: string
        }
      }
      classrooms: {
        Row: {
          id: string
          name: string
          grade: Database['public']['Enums']['grade_level']
          school_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          grade: Database['public']['Enums']['grade_level']
          school_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          grade?: Database['public']['Enums']['grade_level']
          school_id?: string
          created_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          title: string
          description: string | null
          level: Database['public']['Enums']['grade_level']
          owner_id: string | null
          classroom_id: string
          school_id: string
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          level: Database['public']['Enums']['grade_level']
          owner_id?: string | null
          classroom_id: string
          school_id: string
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          level?: Database['public']['Enums']['grade_level']
          owner_id?: string | null
          classroom_id?: string
          school_id?: string
          is_published?: boolean
          created_at?: string
        }
      }
      quiz_items: {
        Row: {
          id: string
          quiz_id: string
          question: string
          choices: Json
          answer_keys: string[]
          order_index: number
          school_id: string
          classroom_id: string
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question: string
          choices: Json
          answer_keys: string[]
          order_index?: number
          school_id: string
          classroom_id: string
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          question?: string
          choices?: Json
          answer_keys?: string[]
          order_index?: number
          school_id?: string
          classroom_id?: string
          created_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          quiz_id: string
          parent_id: string
          answers: Json
          score: number
          total_questions: number
          quiz_duration_minutes: number | null
          school_id: string
          classroom_id: string
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          parent_id: string
          answers: Json
          score: number
          total_questions: number
          quiz_duration_minutes?: number | null
          school_id: string
          classroom_id: string
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          parent_id?: string
          answers?: Json
          score?: number
          total_questions?: number
          quiz_duration_minutes?: number | null
          school_id?: string
          classroom_id?: string
          created_at?: string
        }
      }
      invitation_links: {
        Row: {
          id: string
          school_id: string
          classroom_id: string
          intended_role: 'DIRECTOR' | 'TEACHER' | 'PARENT'
          token: string
          expires_at: string
          used_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          classroom_id: string
          intended_role: 'DIRECTOR' | 'TEACHER' | 'PARENT'
          token: string
          expires_at: string
          used_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          classroom_id?: string
          intended_role?: 'DIRECTOR' | 'TEACHER' | 'PARENT'
          token?: string
          expires_at?: string
          used_at?: string | null
          created_by?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'DIRECTOR' | 'TEACHER' | 'PARENT'
      grade_level: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Additional types for the application
export type UserRole = Database['public']['Enums']['user_role']
export type GradeLevel = Database['public']['Enums']['grade_level']

export interface QuizChoice {
  id: string
  text: string
}

export interface QuizAnswer {
  questionId: string
  choiceIds: string[]
}

export interface QuizSubmission {
  answers: { [questionId: string]: string[] }
  score: number
  totalQuestions: number
}