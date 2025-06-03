'use client'

import { useEffect, useState } from 'react'
import { useSessionSharing } from '@/hooks/useSessionSharing'
import { useSessionStore } from '@/store'

interface SessionAccessIndicatorProps {
  sessionId: string
}

export function SessionAccessIndicator({ sessionId }: SessionAccessIndicatorProps) {
  const { userId } = useSessionStore()
  const {
    role,
    currentEditor,
    accessError,
    isCheckingAccess,
    startEditing,
    stopEditing
  } = useSessionSharing(sessionId)
  
  const [username, setUsername] = useState<string>('')
  const [isStartingEdit, setIsStartingEdit] = useState(false)
  const [isStoppingEdit, setIsStoppingEdit] = useState(false)
  
  // Current user is the editor
  const isCurrentUserEditing = currentEditor && userId && currentEditor === userId
  
  // Session is being edited by someone else
  const isSomeoneElseEditing = currentEditor && (!userId || currentEditor !== userId)
  
  // Handle edit session start
  const handleStartEditing = async () => {
    if (!username.trim()) return
    
    setIsStartingEdit(true)
    const success = await startEditing(username.trim())
    setIsStartingEdit(false)
    
    // Save username in localStorage for future use
    if (success) {
      localStorage.setItem('editor_username', username.trim())
    }
  }
  
  // Handle edit session end
  const handleStopEditing = async () => {
    setIsStoppingEdit(true)
    await stopEditing()
    setIsStoppingEdit(false)
  }
  
  // Load username from localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('editor_username')
    if (savedUsername) {
      setUsername(savedUsername)
    }
  }, [])
  
  if (isCheckingAccess) {
    return <div className="p-3 bg-gray-100 rounded">Checking session access...</div>
  }
  
  if (accessError) {
    return (
      <div className="p-3 bg-red-100 text-red-800 rounded">
        <p className="font-semibold">Access Error</p>
        <p className="text-sm">{accessError}</p>
      </div>
    )
  }
  
  return (
    <div className="p-3 border rounded">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Session Access</div>
        <div className="text-xs px-2 py-1 rounded bg-gray-100">
          Role: <span className="font-semibold">{role}</span>
        </div>
      </div>
      
      {isSomeoneElseEditing ? (
        <div className="text-sm bg-yellow-100 p-2 rounded mb-2">
          <p>Currently being edited by: <span className="font-semibold">{currentEditor}</span></p>
          <p className="text-xs mt-1">Please wait until they finish editing.</p>
        </div>
      ) : isCurrentUserEditing ? (
        <div className="text-sm bg-green-100 p-2 rounded mb-2">
          <p>You are currently editing this session</p>
          <button
            onClick={handleStopEditing}
            disabled={isStoppingEdit}
            className="mt-2 text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-100"
          >
            {isStoppingEdit ? 'Ending session...' : 'End editing session'}
          </button>
        </div>
      ) : (
        <div className="text-sm">
          {(role === 'owner' || role === 'reviewer') && (
            <>
              <p className="mb-2">No one is currently editing this session.</p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="border rounded p-2 text-sm"
                />
                <button
                  onClick={handleStartEditing}
                  disabled={!username.trim() || isStartingEdit}
                  className={`
                    py-1 px-3 rounded text-sm
                    ${!username.trim() || isStartingEdit ? 
                      'bg-gray-300 text-gray-600' : 
                      'bg-blue-500 text-white hover:bg-blue-600'}
                  `}
                >
                  {isStartingEdit ? 'Starting...' : 'Start Editing'}
                </button>
              </div>
            </>
          )}
          
          {role === 'viewer' && (
            <p>You are viewing this session in read-only mode.</p>
          )}
        </div>
      )}
    </div>
  )
} 