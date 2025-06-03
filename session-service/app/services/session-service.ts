import { supabase, handleSupabaseResponse } from '../core/supabase';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { 
  Session, 
  CreateSessionDto, 
  UpdateSessionDto, 
  SessionStatus,
  SessionResponse,
  SessionsResponse,
  ShareSessionResponse,
  SessionAccessResponse
} from '@/types';

export class SessionService {
  private readonly tableName = 'sessions';

  async createSession(userId: string, dto: CreateSessionDto): Promise<SessionResponse> {
    const sessionId = uuidv4();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        id: sessionId,
        user_id: userId,
        presentation_id: dto.presentation_id,
        name: dto.name,
        description: dto.description || null,
        status: SessionStatus.PENDING,
        source_language: dto.source_language,
        target_languages: dto.target_languages,
        slide_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: dto.metadata || null
      })
      .select()
      .single();
    
    return handleSupabaseResponse(data as Session, error);
  }

  async getSessionById(sessionId: string): Promise<SessionResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', sessionId)
      .single();
    
    return handleSupabaseResponse(data as Session, error);
  }

  async getSessionsByUserId(userId: string): Promise<SessionsResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      return { data: [], error: error.message };
    }
    
    return { data: data as Session[] || [], error: null };
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto): Promise<SessionResponse> {
    const updateData = {
      ...dto,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();
    
    return handleSupabaseResponse(data as Session, error);
  }

  async deleteSession(sessionId: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', sessionId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  }

  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<SessionResponse> {
    return this.updateSession(sessionId, { status });
  }

  async updateSlideCount(sessionId: string, slideCount: number): Promise<SessionResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        slide_count: slideCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    return handleSupabaseResponse(data as Session, error);
  }
  
  /**
   * Generate a shareable link for a session that can be used by reviewers
   */
  async generateShareLink(sessionId: string, userId: string, baseUrl: string): Promise<ShareSessionResponse> {
    try {
      // First verify the user is the owner of this session
      const sessionResult = await this.getSessionById(sessionId);
      if (sessionResult.error) {
        return { shareableLink: '', error: sessionResult.error };
      }
      
      if (!sessionResult.data || sessionResult.data.user_id !== userId) {
        return { shareableLink: '', error: 'Not authorized to share this session' };
      }
      
      // Generate a secure token for the session
      const token = randomBytes(32).toString('hex');
      
      // Update the session with the token
      const updateResult = await this.updateSession(sessionId, { review_token: token });
      if (updateResult.error) {
        return { shareableLink: '', error: updateResult.error };
      }
      
      // Construct the shareable link
      const shareableLink = `${baseUrl}/editor/${sessionId}?token=${token}`;
      
      return { shareableLink, error: null };
    } catch (error) {
      console.error('Error generating share link:', error);
      return { shareableLink: '', error: 'Failed to generate share link' };
    }
  }
  
  /**
   * Validate session access based on user ID and/or token
   */
  async validateSessionAccess(sessionId: string, userId?: string, token?: string): Promise<SessionAccessResponse> {
    try {
      const sessionResult = await this.getSessionById(sessionId);
      
      if (sessionResult.error || !sessionResult.data) {
        return { 
          canAccess: false, 
          role: 'viewer',
          error: sessionResult.error || 'Session not found' 
        };
      }
      
      const session = sessionResult.data;
      
      // Check if user is the owner
      if (userId && session.user_id === userId) {
        return { 
          canAccess: true, 
          role: 'owner',
          currentEditor: session.last_accessed_by,
          error: null 
        };
      }
      
      // Check if valid review token provided
      if (token && session.review_token === token) {
        return { 
          canAccess: true, 
          role: 'reviewer',
          currentEditor: session.last_accessed_by,
          error: null 
        };
      }
      
      // No valid access credentials
      return { 
        canAccess: false, 
        role: 'viewer',
        currentEditor: session.last_accessed_by,
        error: 'Not authorized to access this session' 
      };
    } catch (error) {
      console.error('Error validating session access:', error);
      return { 
        canAccess: false, 
        role: 'viewer',
        error: 'Failed to validate session access' 
      };
    }
  }
  
  /**
   * Update the session's access information when someone starts editing
   */
  async updateSessionAccess(sessionId: string, editorId: string, editorName: string): Promise<SessionResponse> {
    try {
      // First check if session is currently being edited by someone else
      const sessionResult = await this.getSessionById(sessionId);
      
      if (sessionResult.error || !sessionResult.data) {
        return { data: null, error: sessionResult.error || 'Session not found' };
      }
      
      const session = sessionResult.data;
      
      // If someone else is actively editing (within the last 5 minutes), prevent access
      const lastAccessTime = session.last_accessed_at 
        ? new Date(session.last_accessed_at).getTime() 
        : 0;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      if (
        session.last_accessed_by && 
        session.last_accessed_by !== editorId && 
        lastAccessTime > fiveMinutesAgo
      ) {
        return { 
          data: null, 
          error: `Session is currently being edited by ${session.last_accessed_by}` 
        };
      }
      
      // Update the session with the new editor
      return this.updateSession(sessionId, {
        last_accessed_by: editorName,
        last_accessed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating session access:', error);
      return { data: null, error: 'Failed to update session access' };
    }
  }
  
  /**
   * Release a session when an editor is done
   */
  async releaseSessionAccess(sessionId: string, editorId: string): Promise<SessionResponse> {
    try {
      const sessionResult = await this.getSessionById(sessionId);
      
      if (sessionResult.error || !sessionResult.data) {
        return { data: null, error: sessionResult.error || 'Session not found' };
      }
      
      const session = sessionResult.data;
      
      // Only allow the current editor to release the session
      if (session.last_accessed_by !== editorId) {
        return { 
          data: null, 
          error: 'Not authorized to release this session' 
        };
      }
      
      // Update the session to clear the current editor
      return this.updateSession(sessionId, {
        last_accessed_by: null,
        last_accessed_at: null
      });
    } catch (error) {
      console.error('Error releasing session access:', error);
      return { data: null, error: 'Failed to release session access' };
    }
  }
} 