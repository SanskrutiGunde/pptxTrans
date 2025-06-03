import { describe, test, expect, afterEach, beforeEach, mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSessionSharing } from '@/hooks/useSessionSharing';
import { ShareSessionButton } from '@/components/editor/ShareSessionButton';
import { SessionAccessIndicator } from '@/components/editor/SessionAccessIndicator';
import { useSessionStore } from '@/store';

// Mock global fetch
global.fetch = vi.fn();

// Mock useSessionStore
vi.mock('@/store', () => ({
  useSessionStore: vi.fn()
}));

// Setup test session data
const testSessionId = 'test-session-123';
const testUserId = 'test-user-456';

describe('Session Sharing Frontend Components', () => {
  // Reset mocks between tests
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
  });
  
  describe('ShareSessionButton Component', () => {
    beforeEach(() => {
      // Mock useSessionStore to return owner role
      vi.mocked(useSessionStore).mockReturnValue({
        userId: testUserId,
        role: 'owner',
        setRole: vi.fn()
      });
      
      // Setup fetch mock to return a valid share link
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ shareableLink: 'http://example.com/shared-link' }),
        status: 200
      } as Response);
    });
    
    test('renders only for session owners', async () => {
      // Test with owner role
      render(<ShareSessionButton sessionId={testSessionId} />);
      expect(screen.getByText(/Share with reviewer/i)).toBeInTheDocument();
      
      // Change role to reviewer and verify button doesn't show
      vi.mocked(useSessionStore).mockReturnValue({
        userId: testUserId,
        role: 'reviewer',
        setRole: vi.fn()
      });
      
      render(<ShareSessionButton sessionId={testSessionId} />);
      expect(screen.queryByText(/Share with reviewer/i)).not.toBeInTheDocument();
    });
    
    test('generates a shareable link on click', async () => {
      render(<ShareSessionButton sessionId={testSessionId} />);
      
      // Click the share button
      fireEvent.click(screen.getByText(/Share with reviewer/i));
      
      // Verify fetch was called with correct params
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/sessions/${testSessionId}/share`),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(testUserId)
          })
        );
      });
      
      // Verify link is displayed
      await waitFor(() => {
        expect(screen.getByDisplayValue(/http:\/\/example.com\/shared-link/)).toBeInTheDocument();
      });
    });
    
    test('shows copied state when link is copied', async () => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });
      
      render(<ShareSessionButton sessionId={testSessionId} />);
      
      // Click the share button
      fireEvent.click(screen.getByText(/Share with reviewer/i));
      
      // Wait for link to be generated
      await waitFor(() => {
        expect(screen.getByDisplayValue(/http:\/\/example.com\/shared-link/)).toBeInTheDocument();
      });
      
      // Click the copy button
      fireEvent.click(screen.getByText(/Copy/i));
      
      // Verify navigator.clipboard.writeText was called
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://example.com/shared-link');
      
      // Verify copied text is shown
      await waitFor(() => {
        expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('SessionAccessIndicator Component', () => {
    beforeEach(() => {
      // Mock useSessionStore
      vi.mocked(useSessionStore).mockReturnValue({
        userId: testUserId,
        role: 'owner',
        setRole: vi.fn()
      });
      
      // Setup fetch mock for access checks
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ 
          canAccess: true, 
          role: 'owner',
          currentEditor: null,
          error: null
        }),
        status: 200
      } as Response);
    });
    
    test('shows role information', async () => {
      render(<SessionAccessIndicator sessionId={testSessionId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Role: owner/i)).toBeInTheDocument();
      });
    });
    
    test('shows edit session controls when no one is editing', async () => {
      render(<SessionAccessIndicator sessionId={testSessionId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/No one is currently editing this session/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
        expect(screen.getByText(/Start Editing/i)).toBeInTheDocument();
      });
    });
    
    test('starts editing session when button clicked', async () => {
      render(<SessionAccessIndicator sessionId={testSessionId} />);
      
      // Enter username
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter your name/i);
        fireEvent.change(input, { target: { value: 'Test Editor' } });
      });
      
      // Mock fetch for starting session
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          session: { 
            id: testSessionId,
            last_accessed_by: 'Test Editor' 
          } 
        }),
        status: 200
      } as Response);
      
      // Click start editing button
      fireEvent.click(screen.getByText(/Start Editing/i));
      
      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/sessions/${testSessionId}/access`),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Test Editor')
          })
        );
      });
    });
    
    test('shows warning when someone else is editing', async () => {
      // Mock session being edited by someone else
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          canAccess: true, 
          role: 'owner',
          currentEditor: 'Another Editor',
          error: null
        }),
        status: 200
      } as Response);
      
      render(<SessionAccessIndicator sessionId={testSessionId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Currently being edited by: Another Editor/i)).toBeInTheDocument();
        expect(screen.getByText(/Please wait until they finish editing/i)).toBeInTheDocument();
      });
    });
    
    test('shows controls to end editing when user is editing', async () => {
      // Mock current user editing
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          canAccess: true, 
          role: 'owner',
          currentEditor: testUserId,
          error: null
        }),
        status: 200
      } as Response);
      
      render(<SessionAccessIndicator sessionId={testSessionId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/You are currently editing this session/i)).toBeInTheDocument();
        expect(screen.getByText(/End editing session/i)).toBeInTheDocument();
      });
      
      // Mock fetch for ending session
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200
      } as Response);
      
      // Click end editing button
      fireEvent.click(screen.getByText(/End editing session/i));
      
      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/sessions/${testSessionId}/access?editorId=${testUserId}`),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
    
    test('shows access error when present', async () => {
      // Mock access error
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          canAccess: false, 
          role: 'viewer',
          error: 'You do not have permission to access this session'
        }),
        status: 200
      } as Response);
      
      render(<SessionAccessIndicator sessionId={testSessionId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Access Error/i)).toBeInTheDocument();
        expect(screen.getByText(/You do not have permission to access this session/i)).toBeInTheDocument();
      });
    });
  });
}); 