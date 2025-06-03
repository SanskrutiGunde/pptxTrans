import { useCallback, useEffect } from 'react'
import { 
  useSessionStore, 
  useSlidesStore, 
  useCommentsStore,
  SlideMetadata
} from '../store'

export function useEditorState(sessionId: string | null) {
  // Access stores
  const { 
    setSession, 
    role,
    setRole 
  } = useSessionStore()
  
  const { 
    slides, 
    currentSlideId,
    setSlides, 
    setCurrentSlide,
    updateEditBuffer,
    saveEditBuffer
  } = useSlidesStore()
  
  const {
    commentsBySlide,
    unreadCount,
    totalUnread,
    loadComments
  } = useCommentsStore()

  // Initialize session
  useEffect(() => {
    if (sessionId) {
      setSession(sessionId)
      
      // You would typically fetch session details and determine role here
      // For example:
      // fetchSessionDetails(sessionId).then(data => {
      //   setRole(data.userRole)
      // })
    }
  }, [sessionId, setSession, setRole])

  // Load comments for current slide
  useEffect(() => {
    if (sessionId && currentSlideId) {
      loadComments(currentSlideId)
    }
  }, [sessionId, currentSlideId, loadComments])

  // Utility function to load slide data for a session
  const loadSlides = useCallback(async () => {
    if (!sessionId) return
    
    try {
      // Here you would fetch slides from your API
      // const slidesData = await fetchSlidesForSession(sessionId)
      // setSlides(slidesData)
    } catch (error) {
      console.error('Failed to load slides:', error)
    }
  }, [sessionId, setSlides])

  // Utility function to handle text editing
  const handleTextEdit = useCallback((
    slideId: string, 
    elementId: string, 
    newContent: string
  ) => {
    updateEditBuffer(slideId, elementId, newContent)
  }, [updateEditBuffer])

  // Utility function to save text changes
  const handleSaveText = useCallback(async (
    slideId: string,
    elementId: string
  ) => {
    await saveEditBuffer(slideId, elementId)
  }, [saveEditBuffer])

  // Current slide data
  const currentSlide = currentSlideId ? slides[currentSlideId] : null
  const currentSlideComments = currentSlideId ? commentsBySlide[currentSlideId] || [] : []
  const currentSlideUnreadCount = currentSlideId ? unreadCount[currentSlideId] || 0 : 0

  return {
    // Session state
    sessionId,
    role,
    
    // Slides state
    slides,
    currentSlideId,
    currentSlide,
    
    // Comments state
    currentSlideComments,
    currentSlideUnreadCount,
    totalUnread,
    
    // Actions
    loadSlides,
    setCurrentSlide,
    handleTextEdit,
    handleSaveText
  }
} 