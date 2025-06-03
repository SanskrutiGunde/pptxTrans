import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Comment {
  id: string
  slideId: string
  textElementId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt: string
  resolved: boolean
  parentId?: string
  isNew?: boolean
}

interface CommentsState {
  comments: Record<string, Comment> // commentId -> Comment
  commentsByElement: Record<string, string[]> // elementId -> commentIds
  commentsBySlide: Record<string, string[]> // slideId -> commentIds
  unreadCount: Record<string, number> // slideId -> count
  totalUnread: number
  isLoading: boolean
  error: string | null
  
  // Actions
  addComment: (comment: Comment) => void
  updateComment: (commentId: string, updates: Partial<Comment>) => void
  resolveComment: (commentId: string, resolved: boolean) => void
  deleteComment: (commentId: string) => void
  loadComments: (slideId: string) => Promise<void>
  markAsRead: (commentIds: string[]) => void
  setUnreadCount: (slideId: string, count: number) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useCommentsStore = create<CommentsState>()(
  immer((set, get) => ({
    comments: {},
    commentsByElement: {},
    commentsBySlide: {},
    unreadCount: {},
    totalUnread: 0,
    isLoading: false,
    error: null,
    
    addComment: (comment) => set((state) => {
      // Add to main comments record
      state.comments[comment.id] = comment
      
      // Add to element index
      const elementKey = comment.textElementId
      if (!state.commentsByElement[elementKey]) {
        state.commentsByElement[elementKey] = []
      }
      if (!state.commentsByElement[elementKey].includes(comment.id)) {
        state.commentsByElement[elementKey].push(comment.id)
      }
      
      // Add to slide index
      const slideKey = comment.slideId
      if (!state.commentsBySlide[slideKey]) {
        state.commentsBySlide[slideKey] = []
      }
      if (!state.commentsBySlide[slideKey].includes(comment.id)) {
        state.commentsBySlide[slideKey].push(comment.id)
      }
      
      // Update unread count if new
      if (comment.isNew) {
        state.unreadCount[slideKey] = (state.unreadCount[slideKey] || 0) + 1
        state.totalUnread += 1
      }
    }),
    
    updateComment: (commentId, updates) => set((state) => {
      const comment = state.comments[commentId]
      if (!comment) return
      
      // Update the comment
      state.comments[commentId] = {
        ...comment,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }),
    
    resolveComment: (commentId, resolved) => set((state) => {
      const comment = state.comments[commentId]
      if (!comment) return
      
      comment.resolved = resolved
      comment.updatedAt = new Date().toISOString()
    }),
    
    deleteComment: (commentId) => set((state) => {
      const comment = state.comments[commentId]
      if (!comment) return
      
      // Remove from element index
      const elementKey = comment.textElementId
      if (state.commentsByElement[elementKey]) {
        state.commentsByElement[elementKey] = state.commentsByElement[elementKey].filter(
          id => id !== commentId
        )
      }
      
      // Remove from slide index
      const slideKey = comment.slideId
      if (state.commentsBySlide[slideKey]) {
        state.commentsBySlide[slideKey] = state.commentsBySlide[slideKey].filter(
          id => id !== commentId
        )
      }
      
      // Decrease unread count if it was unread
      if (comment.isNew) {
        state.unreadCount[slideKey] = Math.max(0, (state.unreadCount[slideKey] || 0) - 1)
        state.totalUnread = Math.max(0, state.totalUnread - 1)
      }
      
      // Delete the comment
      delete state.comments[commentId]
    }),
    
    loadComments: async (slideId) => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })
      
      try {
        // Here you would implement the actual API call to fetch comments
        // const commentsData = await fetchCommentsForSlide(slideId)
        
        // For now, let's simulate an API response
        // commentsData.forEach(comment => {
        //   get().addComment({
        //     ...comment,
        //     isNew: false
        //   })
        // })
        
        set((state) => {
          state.isLoading = false
        })
      } catch (error) {
        set((state) => {
          state.isLoading = false
          state.error = 'Failed to load comments'
        })
      }
    },
    
    markAsRead: (commentIds) => set((state) => {
      // Create a map of slideId -> count of affected comments
      const affectedSlides: Record<string, number> = {}
      
      // Mark each comment as read
      commentIds.forEach((commentId) => {
        const comment = state.comments[commentId]
        if (comment && comment.isNew) {
          comment.isNew = false
          
          const slideId = comment.slideId
          affectedSlides[slideId] = (affectedSlides[slideId] || 0) + 1
        }
      })
      
      // Update unread counts for affected slides
      Object.entries(affectedSlides).forEach(([slideId, count]) => {
        state.unreadCount[slideId] = Math.max(0, (state.unreadCount[slideId] || 0) - count)
        state.totalUnread = Math.max(0, state.totalUnread - count)
      })
    }),
    
    setUnreadCount: (slideId, count) => set((state) => {
      const oldCount = state.unreadCount[slideId] || 0
      state.unreadCount[slideId] = count
      state.totalUnread = state.totalUnread - oldCount + count
    }),
    
    setLoading: (isLoading) => set((state) => {
      state.isLoading = isLoading
    }),
    
    setError: (error) => set((state) => {
      state.error = error
    })
  }))
) 