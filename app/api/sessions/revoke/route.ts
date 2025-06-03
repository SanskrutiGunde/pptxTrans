import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse request body
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate that session exists and user is the owner
    const { data: session, error: sessionError } = await supabase
      .from("translation_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to manage permissions for this session" },
        { status: 403 }
      )
    }

    // Delete the permission
    const { error: deleteError } = await supabase
      .from("session_permissions")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId)

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to revoke access" },
        { status: 500 }
      )
    }

    // Create notification for the user whose access was revoked
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "session_access_revoked",
        title: "Access Revoked",
        message: `Your access to the session "${session.name}" has been revoked.`,
        is_read: false,
        created_at: new Date().toISOString(),
      })

    if (notificationError) {
      console.error("Failed to create notification:", notificationError)
      // Continue execution even if notification creation fails
    }

    return NextResponse.json(
      { success: true, message: "Access revoked successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error revoking session access:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 