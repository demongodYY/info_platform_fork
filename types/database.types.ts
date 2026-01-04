export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          title: string
          content: string
          category: string
          source: string
          published_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: string
          source: string
          published_at: string
          updated_by: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: string
          source?: string
          published_at?: string
          updated_by?: string
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
      [_ in never]: never
    }
  }
}
