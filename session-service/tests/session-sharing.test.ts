import { describe, expect, test, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { SessionService } from '../app/services/session-service';
import { supabase } from '../app/core/supabase';
import { createServer } from '../app/server';
import { SessionStatus } from '../types';

// Mock data
const MOCK_USER_ID = 'user-123';
const MOCK_SESSION_ID = 'session-456';
const MOCK_PRESENTATION_ID = 'presentation-789';
const MOCK_REVIEWER_ID = 'reviewer-123';
const MOCK_BASE_URL = 'http://localhost:3000';

// Mock session data
const mockSession = {
  id: MOCK_SESSION_ID,
  user_id: MOCK_USER_ID,
  presentation_id: MOCK_PRESENTATION_ID,
  name: 'Test Presentation',
  description: 'Test Description',
  status: SessionStatus.READY,
  source_language: 'en',
  target_languages: ['fr', 'es'],
  slide_count: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  metadata: { test: true },
  review_token: null,
  last_accessed_by: null,
  last_accessed_at: null
};

// Mock Supabase responses
mock.module('../app/core/supabase', () => {
  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: mockSession, error: null })
          }),
          order: () => ({ data: [mockSession], error: null })
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: mockSession, error: null })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ 
                data: { ...mockSession, review_token: 'test-token' }, 
                error: null 
              })
            })
          })
        }),
        delete: () => ({
          eq: () => ({ error: null })
        })
      })
    },
    handleSupabaseResponse: (data: any, error: any) => {
      if (error) {
        return { data: null, error: error.message };
      }
      return { data, error: null };
    }
  };
});

describe('Session Sharing Tests', () => {
  let sessionService: SessionService;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Initialize the session service
    sessionService = new SessionService();
    
    // Start a test server
    server = createServer();
    await server.listen({ port: 0 }); // Use a random available port
    const address = server.server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    // Close the server
    await server.close();
  });

  beforeEach(() => {
    // Reset any mocked data between tests
    mockSession.review_token = null;
    mockSession.last_accessed_by = null;
    mockSession.last_accessed_at = null;
  });

  describe('Backend Service Tests', () => {
    test('should generate a shareable link', async () => {
      const result = await sessionService.generateShareLink(
        MOCK_SESSION_ID, 
        MOCK_USER_ID, 
        MOCK_BASE_URL
      );
      
      expect(result.error).toBeNull();
      expect(result.shareableLink).toBeDefined();
      expect(result.shareableLink).toContain(MOCK_SESSION_ID);
      expect(result.shareableLink).toContain('token=');
    });

    test('should validate owner access correctly', async () => {
      const result = await sessionService.validateSessionAccess(
        MOCK_SESSION_ID,
        MOCK_USER_ID
      );
      
      expect(result.canAccess).toBe(true);
      expect(result.role).toBe('owner');
      expect(result.error).toBeNull();
    });

    test('should validate reviewer access correctly', async () => {
      // Assume the session has a review token
      mockSession.review_token = 'test-review-token';
      
      const result = await sessionService.validateSessionAccess(
        MOCK_SESSION_ID,
        undefined,
        'test-review-token'
      );
      
      expect(result.canAccess).toBe(true);
      expect(result.role).toBe('reviewer');
      expect(result.error).toBeNull();
    });

    test('should reject invalid access', async () => {
      const result = await sessionService.validateSessionAccess(
        MOCK_SESSION_ID,
        'wrong-user-id',
        'wrong-token'
      );
      
      expect(result.canAccess).toBe(false);
      expect(result.role).toBe('viewer');
      expect(result.error).not.toBeNull();
    });

    test('should update session access', async () => {
      const result = await sessionService.updateSessionAccess(
        MOCK_SESSION_ID,
        MOCK_USER_ID,
        'Test User'
      );
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    test('should prevent concurrent editing', async () => {
      // Set up a session that's already being edited
      mockSession.last_accessed_by = 'another-user';
      mockSession.last_accessed_at = new Date().toISOString();
      
      const result = await sessionService.updateSessionAccess(
        MOCK_SESSION_ID,
        MOCK_USER_ID,
        'Test User'
      );
      
      expect(result.error).not.toBeNull();
      expect(result.error).toContain('being edited by');
    });

    test('should release session access', async () => {
      // Set up a session that's being edited by the current user
      mockSession.last_accessed_by = MOCK_USER_ID;
      mockSession.last_accessed_at = new Date().toISOString();
      
      const result = await sessionService.releaseSessionAccess(
        MOCK_SESSION_ID,
        MOCK_USER_ID
      );
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe('API Endpoint Tests', () => {
    test('should generate a shareable link via API', async () => {
      const response = await fetch(`${baseUrl}/api/sessions/${MOCK_SESSION_ID}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base-url': MOCK_BASE_URL
        },
        body: JSON.stringify({ userId: MOCK_USER_ID })
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.shareableLink).toBeDefined();
    });

    test('should validate access via API', async () => {
      const response = await fetch(
        `${baseUrl}/api/sessions/${MOCK_SESSION_ID}/access?userId=${MOCK_USER_ID}`
      );
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.canAccess).toBe(true);
      expect(data.role).toBe('owner');
    });

    test('should update session access via API', async () => {
      const response = await fetch(`${baseUrl}/api/sessions/${MOCK_SESSION_ID}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          editorId: MOCK_USER_ID,
          editorName: 'Test User'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session).toBeDefined();
    });

    test('should release session access via API', async () => {
      // Set up a session that's being edited by the current user
      mockSession.last_accessed_by = MOCK_USER_ID;
      
      const response = await fetch(
        `${baseUrl}/api/sessions/${MOCK_SESSION_ID}/access?editorId=${MOCK_USER_ID}`,
        { method: 'DELETE' }
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle missing user ID when generating share link', async () => {
      const response = await fetch(`${baseUrl}/api/sessions/${MOCK_SESSION_ID}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Missing userId
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle missing access credentials', async () => {
      const response = await fetch(
        `${baseUrl}/api/sessions/${MOCK_SESSION_ID}/access`
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle missing editor ID when releasing access', async () => {
      const response = await fetch(
        `${baseUrl}/api/sessions/${MOCK_SESSION_ID}/access`,
        { method: 'DELETE' }
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
}); 