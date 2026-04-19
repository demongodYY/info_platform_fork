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
      knowledge_documents: {
        Row: {
          id: string
          title: string
          original_filename: string
          file_hash: string
          file_extension: string
          mime_type: string
          category: string
          batch: string | null
          priority_label: string
          storage_bucket: string
          storage_path: string
          source_url: string | null
          import_status: string
          import_notes: string | null
          extracted_char_count: number
          chunk_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          original_filename: string
          file_hash: string
          file_extension: string
          mime_type: string
          category: string
          batch?: string | null
          priority_label?: string
          storage_bucket?: string
          storage_path: string
          source_url?: string | null
          import_status?: string
          import_notes?: string | null
          extracted_char_count?: number
          chunk_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          original_filename?: string
          file_hash?: string
          file_extension?: string
          mime_type?: string
          category?: string
          batch?: string | null
          priority_label?: string
          storage_bucket?: string
          storage_path?: string
          source_url?: string | null
          import_status?: string
          import_notes?: string | null
          extracted_char_count?: number
          chunk_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          page_number: number | null
          section_index: number | null
          content: string
          snippet: string
          embedding: number[] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index: number
          page_number?: number | null
          section_index?: number | null
          content: string
          snippet: string
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          page_number?: number | null
          section_index?: number | null
          content?: string
          snippet?: string
          embedding?: number[] | null
          metadata?: Json
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
      [_ in never]: never
    }
  }
}
