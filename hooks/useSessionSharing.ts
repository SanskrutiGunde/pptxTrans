import { useState, useCallback, useEffect } from 'react'
import { useSessionStore } from '../store'

interface SessionAccessStatus {
  canAccess: boolean
  role: 'owner' | 'reviewer' | 'viewer'
  currentEditor: string | null
  error: string | null
}

export function useSessionSharing(sessionId: string | null) {
  const { userId, role, setRole } = useSessionStore()
  const [shareableLink, setShareableLink] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [currentEditor, setCurrentEditor] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [isCheckingAccess, setIsCheckingAccess] = useState(false)

  // Check if current user has access to this session
  const checkSessionAccess = useCallback(async () => {
    if (!sessionId) return

    setIsCheckingAccess(true)
    setAccessError(null)

    try {
      // Get token from URL if present
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      // Call API to check access
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (token) params.append('token', token)
      
      const response = await fetch(`/api/sessions/${sessionId}/access?${params.toString()}`)
      const data: SessionAccessStatus = await response.json()
      
      if (data.canAccess) {
        // Set role based on access check
        setRole(data.role)
        setCurrentEditor(data.currentEditor)
      } else {
        setAccessError(data.error || 'You do not have access to this session')
      }
    } catch (error) {
      console.error('Failed to check session access:', error)
      setAccessError('Failed to check session access')
    } finally {
      setIsCheckingAccess(false)
    }
  }, [sessionId, userId, setRole])

  // Generate shareable link for reviewers
  const generateShareableLink = useCallback(async () => {
    if (!sessionId || !userId || role !== 'owner') return null

    setIsGeneratingLink(true)
    setShareableLink(null)

    try {
      // Use session-service API instead of directly accessing Supabase
      const response = await fetch(`/api/sessions/${sessionId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base-url': window.location.origin
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate shareable link')
      }

      const data = await response.json()
      setShareableLink(data.shareableLink)
      return data.shareableLink
    } catch (error) {
      console.error('Error generating shareable link:', error)
      return null
    } finally {
      setIsGeneratingLink(false)
    }
  }, [sessionId, userId, role])

  // Copy link to clipboard
  const copyLinkToClipboard = useCallback(async () => {
    if (!shareableLink) {
      const link = await generateShareableLink()
      if (!link) return false
    }
    
    try {
      await navigator.clipboard.writeText(shareableLink!)
      setIsCopied(true)
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
      
      return true
    } catch (error) {
      console.error('Failed to copy link to clipboard:', error)
      return false
    }
  }, [shareableLink, generateShareableLink])

  // Start editing session
  const startEditing = useCallback(async (editorName: string) => {
    if (!sessionId || !userId) return false

    try {
      const response = await fetch(`/api/sessions/${sessionId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          editorId: userId,
          editorName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setAccessError(error.error || 'Failed to start editing')
        return false
      }

      // Successfully acquired edit access
      const data = await response.json()
      setCurrentEditor(editorName)
      setAccessError(null)
      return true
    } catch (error) {
      console.error('Error starting edit session:', error)
      setAccessError('Failed to start editing')
      return false
    }
  }, [sessionId, userId])

  // Release editing access
  const stopEditing = useCallback(async () => {
    if (!sessionId || !userId) return false

    try {
      const response = await fetch(`/api/sessions/${sessionId}/access?editorId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to release editing access:', error)
        return false
      }

      setCurrentEditor(null)
      return true
    } catch (error) {
      console.error('Error releasing edit session:', error)
      return false
    }
  }, [sessionId, userId])

  // Check access when session ID changes or on initial load
  useEffect(() => {
    if (sessionId) {
      checkSessionAccess()
    }
  }, [sessionId, checkSessionAccess])

  // Set up cleanup - release edit lock when component unmounts
  useEffect(() => {
    return () => {
      if (sessionId && userId && currentEditor) {
        stopEditing()
      }
    }
  }, [sessionId, userId, currentEditor, stopEditing])

  return {
    role,
    shareableLink,
    isCopied,
    isGeneratingLink,
    currentEditor,
    accessError,
    isCheckingAccess,
    generateShareableLink,
    copyLinkToClipboard,
    startEditing,
    stopEditing,
    checkSessionAccess
  }
} 