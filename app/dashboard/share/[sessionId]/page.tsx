"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import ShareSessionModal from "@/components/dashboard/share-session-modal"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { TranslationSession, SessionStatus, SessionPermission } from "@/types"

export default function ShareSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<TranslationSession | null>(null)
  const [permissions, setPermissions] = useState<SessionPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const fetchUserAndSession = async () => {
      setIsLoading(true)
      
      // Check if user is authenticated
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        router.push("/auth/login")
        return
      }
      
      setUser(userData.user)
      
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from("translation_sessions")
        .select("*")
        .eq("id", sessionId)
        .single()
      
      if (sessionError) {
        toast({
          title: "Error",
          description: "Failed to load session details",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }
      
      // Convert to TranslationSession type
      setSession({
        ...sessionData,
        status: sessionData.status as SessionStatus
      })
      
      setIsOwner(sessionData.user_id === userData.user.id)
      
      // If not the owner, check if has permission
      if (sessionData.user_id !== userData.user.id) {
        const { data: permissionData, error: permissionError } = await supabase
          .from("session_permissions")
          .select("*")
          .eq("session_id", sessionId)
          .eq("user_id", userData.user.id)
          .single()
          
        if (permissionError || !permissionData) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to share this session",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }
      }
      
      // Fetch existing permissions
      await fetchPermissions()
      
      setIsLoading(false)
    }
    
    fetchUserAndSession()
  }, [sessionId, router, supabase, toast])
  
  const fetchPermissions = async () => {
    const response = await fetch(`/api/sessions/shared-users?sessionId=${sessionId}`)
    
    if (response.ok) {
      const data = await response.json()
      setPermissions(data.data)
    } else {
      toast({
        title: "Error",
        description: "Failed to load shared user list",
        variant: "destructive",
      })
    }
  }
  
  const handleShareComplete = async () => {
    await fetchPermissions()
  }

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading session details...</p>
          </div>
        </main>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center space-y-6">
          <div className="w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold sm:text-3xl">Share "{session?.name}"</h1>
            <p className="text-muted-foreground">
              Manage who has access to this session and their permission level.
            </p>
          </div>
          
          <ShareSessionModal
            isOpen={true}
            onClose={handleBackToDashboard}
            sessionId={sessionId}
            sessionName={session?.name || ""}
            existingPermissions={permissions}
            onShareComplete={handleShareComplete}
          />
          
          <Button variant="outline" onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
} 