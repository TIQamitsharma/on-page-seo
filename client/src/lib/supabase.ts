import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          key_name: string
          key_value: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          key_name: string
          key_value: string
          is_active?: boolean
        }
        Update: {
          key_value?: string
          is_active?: boolean
        }
      }
      audits: {
        Row: {
          id: string
          user_id: string
          url: string
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          total_pages: number
          completed_pages: number
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
      }
      page_results: {
        Row: {
          id: string
          audit_id: string
          user_id: string
          url: string
          onpage_score: number
          overall_status: string
          [key: string]: any
        }
      }
      ai_recommendations: {
        Row: {
          id: string
          page_result_id: string
          user_id: string
          recommendations: any
          generated_at: string
        }
      }
    }
  }
}
