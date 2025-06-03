import { createSupabaseServerClient } from "@/lib/supabase/server"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import SessionCard from "@/components/dashboard/session-card"
import EmptyState from "@/components/dashboard/empty-state"
import type { TranslationSession, SessionStatus, PermissionType } from "@/types"
import { redirect } from "next/navigation" // For redirecting if not authenticated
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // This should ideally be handled by middleware in a full Next.js app
    // For Next.js, this server-side redirect will work.
    redirect("/auth/login")
  }

  // Fetch owned sessions
  const { data: ownedSessionsData, error: ownedError } = await supabase
    .from("translation_sessions")
    .select("*")
    .eq("user_id", user.id) // Fetch only sessions for the current user
    .order("created_at", { ascending: false })

  if (ownedError) {
    console.error("Error fetching owned sessions:", ownedError)
  }

  // Fetch shared sessions
  const { data: permissionsData, error: permissionsError } = await supabase
    .from("session_permissions")
    .select("*")
    .eq("user_id", user.id)
    
  if (permissionsError) {
    console.error("Error fetching permissions:", permissionsError)
  }

  // If there are shared sessions, fetch their details
  let sharedSessions: TranslationSession[] = []
  if (permissionsData && permissionsData.length > 0) {
    const sessionIds = permissionsData.map(p => p.session_id)
    
    const { data: sharedSessionsData, error: sharedError } = await supabase
      .from("translation_sessions")
      .select("*")
      .in("id", sessionIds)
      .order("created_at", { ascending: false })
    
    if (sharedError) {
      console.error("Error fetching shared sessions:", sharedError)
    } else if (sharedSessionsData) {
      // For each shared session, also fetch owner info
      for (const session of sharedSessionsData) {
        // Find the permission associated with this session
        const permission = permissionsData.find(p => p.session_id === session.id)
        
        // Convert session to TranslationSession type with additional shared properties
        const translationSession: TranslationSession = {
          ...session,
          status: session.status as SessionStatus,
          is_shared: true,
          permission_type: permission ? permission.permission_type as PermissionType : 'view' as PermissionType
        }
        
        // Add to shared sessions array
        sharedSessions.push(translationSession)
      }
    }
  }

  // Convert owned sessions data to TranslationSession type
  const ownedSessions: TranslationSession[] = ownedSessionsData ? 
    ownedSessionsData.map(session => ({
      ...session,
      status: session.status as SessionStatus
    })) : []

  // Server actions for SessionCard operations
  const handleShare = async (sessionId: string) => {
    "use server"
    // Redirect to the session sharing page
    redirect(`/dashboard/share/${sessionId}`)
  }
  
  const handleExport = async (sessionId: string) => {
    "use server"
    console.log("Export session:", sessionId)
    // Implement export logic
  }
  
  const handleDelete = async (sessionId: string) => {
    "use server"
    console.log("Delete session:", sessionId)
    // Implement delete logic, e.g., call Supabase to delete
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <DashboardHeader user={user} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="owned" className="w-full">
          <TabsList className="mb-6 grid w-[400px] grid-cols-2">
            <TabsTrigger value="owned">My Sessions</TabsTrigger>
            <TabsTrigger value="shared">Shared With Me</TabsTrigger>
          </TabsList>
          
          <TabsContent value="owned">
            {ownedSessions.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ownedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    // @ts-expect-error Server Action type mismatch for client component prop
                    onShare={handleShare}
                    // @ts-expect-error Server Action type mismatch for client component prop
                    onExport={handleExport}
                    // @ts-expect-error Server Action type mismatch for client component prop
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="shared">
            {sharedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="mb-2 text-xl font-semibold">No Shared Sessions</h3>
                <p className="max-w-md text-muted-foreground">
                  You don't have any sessions shared with you yet. When someone shares a session with you, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sharedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isShared={true}
                    // @ts-expect-error Server Action type mismatch for client component prop
                    onExport={session.permission_type === "edit" ? handleExport : undefined}
                    // @ts-expect-error Server Action type mismatch for client component prop
                    onShare={undefined}
                    // @ts-expect-error Server Action type mismatch for client component prop
                    onDelete={undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
