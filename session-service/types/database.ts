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
      sessions: {
        Row: {
          id: string;
          user_id: string;
          presentation_id: string;
          name: string;
          description: string | null;
          status: string;
          source_language: string;
          target_languages: string[];
          slide_count: number;
          created_at: string;
          updated_at: string;
          metadata: Json | null;
          review_token: string | null;
          last_accessed_by: string | null;
          last_accessed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          presentation_id: string;
          name: string;
          description?: string | null;
          status?: string;
          source_language: string;
          target_languages: string[];
          slide_count?: number;
          created_at?: string;
          updated_at?: string;
          metadata?: Json | null;
          review_token?: string | null;
          last_accessed_by?: string | null;
          last_accessed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          presentation_id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          source_language?: string;
          target_languages?: string[];
          slide_count?: number;
          created_at?: string;
          updated_at?: string;
          metadata?: Json | null;
          review_token?: string | null;
          last_accessed_by?: string | null;
          last_accessed_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 