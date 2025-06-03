import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface SlideMetadata {
  id: string
  index: number
  svgUrl: string
  thumbnailUrl: string
  textElements: TextElement[]
}

export interface TextElement {
  id: string
  content: string
  translatedContent: Record<string, string> // language code -> content
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  type: 'title' | 'body' | 'footer' | 'other'
}

export interface EditBuffer {
  originalContent: string
  currentContent: string
  language: string
  isDirty: boolean
  isSaving: boolean
}

export interface SlideState {
  metadata: SlideMetadata | null
  editBuffers: Record<string, EditBuffer> // textElementId -> EditBuffer
  isSelected: boolean
  isVisible: boolean
}

interface SlidesState {
  slides: Record<string, SlideState> // slideId -> SlideState
  currentSlideId: string | null
  selectedSlideIds: string[]
  reorderState: {
    isDragging: boolean
    sourceIndex: number | null
    targetIndex: number | null
  }
  isLoading: boolean
  error: string | null
  
  // Actions
  setSlides: (slides: SlideMetadata[]) => void
  setCurrentSlide: (slideId: string) => void
  selectSlide: (slideId: string, isMultiSelect?: boolean) => void
  deselectSlide: (slideId: string) => void
  clearSelection: () => void
  updateEditBuffer: (slideId: string, textElementId: string, content: string) => void
  saveEditBuffer: (slideId: string, textElementId: string) => Promise<void>
  startReorder: (sourceIndex: number) => void
  updateReorderTarget: (targetIndex: number) => void
  completeReorder: () => void
  cancelReorder: () => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useSlidesStore = create<SlidesState>()(
  immer((set, get) => ({
    slides: {},
    currentSlideId: null,
    selectedSlideIds: [],
    reorderState: {
      isDragging: false,
      sourceIndex: null,
      targetIndex: null
    },
    isLoading: false,
    error: null,
    
    setSlides: (slidesMetadata) => set((state) => {
      // Initialize slides with metadata
      const slides: Record<string, SlideState> = {}
      
      slidesMetadata.forEach((metadata) => {
        // Preserve existing state if slide already exists
        const existingSlide = state.slides[metadata.id]
        
        slides[metadata.id] = {
          metadata,
          editBuffers: existingSlide?.editBuffers || {},
          isSelected: existingSlide?.isSelected || false,
          isVisible: existingSlide?.isVisible || true
        }
      })
      
      state.slides = slides
      state.currentSlideId = slidesMetadata[0]?.id || null
      state.selectedSlideIds = []
      state.error = null
    }),
    
    setCurrentSlide: (slideId) => set((state) => {
      state.currentSlideId = slideId
    }),
    
    selectSlide: (slideId, isMultiSelect = false) => set((state) => {
      if (!isMultiSelect) {
        // Clear previous selections
        state.selectedSlideIds.forEach((id) => {
          if (state.slides[id]) {
            state.slides[id].isSelected = false
          }
        })
        state.selectedSlideIds = [slideId]
      } else if (!state.selectedSlideIds.includes(slideId)) {
        state.selectedSlideIds.push(slideId)
      }
      
      if (state.slides[slideId]) {
        state.slides[slideId].isSelected = true
      }
    }),
    
    deselectSlide: (slideId) => set((state) => {
      state.selectedSlideIds = state.selectedSlideIds.filter(id => id !== slideId)
      
      if (state.slides[slideId]) {
        state.slides[slideId].isSelected = false
      }
    }),
    
    clearSelection: () => set((state) => {
      state.selectedSlideIds.forEach((id) => {
        if (state.slides[id]) {
          state.slides[id].isSelected = false
        }
      })
      state.selectedSlideIds = []
    }),
    
    updateEditBuffer: (slideId, textElementId, content) => set((state) => {
      const slide = state.slides[slideId]
      if (!slide) return
      
      const textElement = slide.metadata?.textElements.find(el => el.id === textElementId)
      if (!textElement) return
      
      // Initialize edit buffer if it doesn't exist
      if (!slide.editBuffers[textElementId]) {
        slide.editBuffers[textElementId] = {
          originalContent: textElement.content,
          currentContent: textElement.content,
          language: 'en', // Default language code
          isDirty: false,
          isSaving: false
        }
      }
      
      // Update buffer content
      const buffer = slide.editBuffers[textElementId]
      buffer.currentContent = content
      buffer.isDirty = buffer.originalContent !== content
    }),
    
    saveEditBuffer: async (slideId, textElementId) => {
      // Set saving state
      set((state) => {
        const slide = state.slides[slideId]
        if (!slide || !slide.editBuffers[textElementId]) return
        
        slide.editBuffers[textElementId].isSaving = true
      })
      
      try {
        // Here you would implement the actual API call to save the content
        // const buffer = get().slides[slideId]?.editBuffers[textElementId]
        // await apiCall(buffer.currentContent)
        
        // Update state after successful save
        set((state) => {
          const slide = state.slides[slideId]
          if (!slide || !slide.editBuffers[textElementId]) return
          
          const buffer = slide.editBuffers[textElementId]
          buffer.originalContent = buffer.currentContent
          buffer.isDirty = false
          buffer.isSaving = false
        })
      } catch (error) {
        // Handle errors
        set((state) => {
          state.error = 'Failed to save changes'
          
          const slide = state.slides[slideId]
          if (slide && slide.editBuffers[textElementId]) {
            slide.editBuffers[textElementId].isSaving = false
          }
        })
      }
    },
    
    startReorder: (sourceIndex) => set((state) => {
      state.reorderState = {
        isDragging: true,
        sourceIndex,
        targetIndex: sourceIndex
      }
    }),
    
    updateReorderTarget: (targetIndex) => set((state) => {
      state.reorderState.targetIndex = targetIndex
    }),
    
    completeReorder: () => set((state) => {
      const { sourceIndex, targetIndex } = state.reorderState
      if (sourceIndex === null || targetIndex === null || sourceIndex === targetIndex) {
        // Reset reorder state if no actual change
        state.reorderState = {
          isDragging: false,
          sourceIndex: null,
          targetIndex: null
        }
        return
      }
      
      // Get slide IDs in the current order
      const slideIds = Object.entries(state.slides)
        .sort(([, a], [, b]) => (a.metadata?.index || 0) - (b.metadata?.index || 0))
        .map(([id]) => id)
      
      // Perform the reordering by updating indexes
      const movedSlideId = slideIds[sourceIndex]
      slideIds.splice(sourceIndex, 1)
      slideIds.splice(targetIndex, 0, movedSlideId)
      
      // Update all slide indexes
      slideIds.forEach((id, index) => {
        if (state.slides[id]?.metadata) {
          state.slides[id].metadata!.index = index
        }
      })
      
      // Reset reorder state
      state.reorderState = {
        isDragging: false,
        sourceIndex: null,
        targetIndex: null
      }
    }),
    
    cancelReorder: () => set((state) => {
      state.reorderState = {
        isDragging: false,
        sourceIndex: null,
        targetIndex: null
      }
    }),
    
    setLoading: (isLoading) => set((state) => {
      state.isLoading = isLoading
    }),
    
    setError: (error) => set((state) => {
      state.error = error
    })
  }))
) 