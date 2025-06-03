import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'owner' | 'reviewer' | 'viewer'

interface SessionState {
  sessionId: string | null
  role: UserRole
  userId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setSession: (sessionId: string) => void
  clearSession: () => void
  setRole: (role: UserRole) => void
  setUserId: (userId: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      role: 'viewer',
      userId: null,
      isLoading: false,
      error: null,
      
      setSession: (sessionId) => set({ sessionId, error: null }),
      clearSession: () => set({ sessionId: null, error: null }),
      setRole: (role) => set({ role }),
      setUserId: (userId) => set({ userId }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'pptx-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        role: state.role,
        userId: state.userId
      })
    }
  )
)