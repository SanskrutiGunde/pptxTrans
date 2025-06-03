export interface Session {
  id: string;
  user_id: string;
  presentation_id: string;
  name: string;
  description?: string | null;
  status: SessionStatus;
  source_language: string;
  target_languages: string[];
  slide_count: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  review_token?: string | null;
  last_accessed_by?: string | null;
  last_accessed_at?: string | null;
}

export enum SessionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error'
}

export interface CreateSessionDto {
  name: string;
  description?: string;
  presentation_id: string;
  source_language: string;
  target_languages: string[];
  metadata?: Record<string, any>;
}

export interface UpdateSessionDto {
  name?: string;
  description?: string | null;
  status?: SessionStatus;
  target_languages?: string[];
  metadata?: Record<string, any>;
  review_token?: string | null;
  last_accessed_by?: string | null;
  last_accessed_at?: string | null;
}

export interface SessionResponse {
  data: Session | null;
  error: string | null;
}

export interface SessionsResponse {
  data: Session[];
  error: string | null;
}

export interface ShareSessionResponse {
  shareableLink: string;
  error: string | null;
}

export interface SessionAccessResponse {
  canAccess: boolean;
  role: 'owner' | 'reviewer' | 'viewer';
  currentEditor?: string | null;
  error: string | null;
} 