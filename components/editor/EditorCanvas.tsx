'use client'

import { useEffect } from 'react'
import { useEditorState } from '@/hooks/useEditorState'

interface EditorCanvasProps {
  sessionId: string
}

export function EditorCanvas({ sessionId }: EditorCanvasProps) {
  const {
    role,
    currentSlide,
    currentSlideComments,
    currentSlideUnreadCount,
    totalUnread,
    loadSlides,
    setCurrentSlide,
    handleTextEdit,
    handleSaveText
  } = useEditorState(sessionId)

  // Load slides when component mounts
  useEffect(() => {
    loadSlides()
  }, [loadSlides])

  // If no current slide, show loading or empty state
  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading slide data...</p>
      </div>
    )
  }

  const isEditable = role === 'owner' || role === 'reviewer'

  return (
    <div className="flex flex-col h-screen">
      {/* Header with info */}
      <header className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {currentSlide.metadata?.index !== undefined && (
              <span className="mr-2">Slide {currentSlide.metadata.index + 1}</span>
            )}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              Role: <span className="font-medium">{role}</span>
            </div>
            
            {totalUnread > 0 && (
              <div className="flex items-center text-sm text-blue-600">
                <span className="font-medium">{totalUnread} unread comments</span>
                {currentSlideUnreadCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 rounded-full text-xs">
                    {currentSlideUnreadCount} on this slide
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main editor area */}
      <main className="flex-1 overflow-auto p-4 bg-gray-100">
        <div 
          className="relative bg-white rounded shadow mx-auto"
          style={{ 
            width: '960px', 
            height: '540px',
            backgroundImage: currentSlide.metadata?.svgUrl
              ? `url(${currentSlide.metadata.svgUrl})`
              : undefined,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Text elements */}
          {currentSlide.metadata?.textElements.map((element) => {
            const editBuffer = currentSlide.editBuffers[element.id]
            const content = editBuffer?.currentContent || element.content
            const isDirty = editBuffer?.isDirty || false
            
            return (
              <div
                key={element.id}
                className="absolute border border-transparent hover:border-blue-400 p-1"
                style={{
                  left: `${element.boundingBox.x}px`,
                  top: `${element.boundingBox.y}px`,
                  width: `${element.boundingBox.width}px`,
                  height: `${element.boundingBox.height}px`
                }}
              >
                {isEditable ? (
                  <div className="relative h-full">
                    <textarea
                      className="w-full h-full p-1 bg-transparent resize-none focus:bg-white/80"
                      value={content}
                      onChange={(e) => 
                        handleTextEdit(
                          currentSlide.metadata?.id || '', 
                          element.id, 
                          e.target.value
                        )
                      }
                      onBlur={() => {
                        if (isDirty) {
                          handleSaveText(currentSlide.metadata?.id || '', element.id)
                        }
                      }}
                    />
                    
                    {isDirty && (
                      <div className="absolute top-0 right-0 text-xs bg-yellow-200 px-1 rounded">
                        Unsaved
                      </div>
                    )}
                    
                    {/* Comment indicator */}
                    {currentSlideComments.some(commentId => 
                      commentId.includes(element.id)
                    ) && (
                      <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-xs px-1 rounded">
                        Comments
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full overflow-auto p-1">
                    {content}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
} 