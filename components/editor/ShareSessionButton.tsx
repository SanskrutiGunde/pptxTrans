'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSessionSharing } from '@/hooks/useSessionSharing'
import { Button } from '@/components/ui/button'

interface ShareSessionButtonProps {
  sessionId: string
}

export function ShareSessionButton({ sessionId }: ShareSessionButtonProps) {
  const router = useRouter()
  const {
    role,
    shareableLink,
    isCopied,
    isGeneratingLink,
    generateShareableLink,
    copyLinkToClipboard
  } = useSessionSharing(sessionId)

  // Only show this component for session owners
  if (role !== 'owner') return null

  const handleShareClick = () => {
    // Redirect to the share page
    router.push(`/dashboard/share/${sessionId}`)
  }

  return (
    <Button 
      onClick={handleShareClick} 
      className="bg-blue-500 hover:bg-blue-600 text-white"
    >
      Share Session
    </Button>
  )
} 