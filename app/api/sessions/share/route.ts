import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const adminClient = await createSupabaseAdminClient()
    
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

    // Get sessionId and email from request body
    const body = await request.json()
    const { sessionId, email, permissionType = "view" } = body

    if (!sessionId || !email) {
      return NextResponse.json(
        { error: "Session ID and email are required" },
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
        { error: "You don't have permission to share this session" },
        { status: 403 }
      )
    }

    // Look up the user by email using the user lookup endpoint
    const userResponse = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`)
    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    const userToShare = await userResponse.json()

    // Check if permission already exists
    const { data: existingPermission, error: permissionError } = await supabase
      .from("session_permissions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userToShare.id)
      .single()

    if (existingPermission) {
      // Update existing permission
      const { error: updateError } = await supabase
        .from("session_permissions")
        .update({
          permission_type: permissionType,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingPermission.id)

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update permission" },
          { status: 500 }
        )
      }
    } else {
      // Create new permission
      const { error: insertError } = await supabase
        .from("session_permissions")
        .insert({
          id: uuidv4(),
          session_id: sessionId,
          user_id: userToShare.id,
          permission_type: permissionType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to share session" },
          { status: 500 }
        )
      }
    }

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        id: uuidv4(),
        user_id: userToShare.id,
        type: "session_shared",
        title: "Session shared with you",
        message: `${user.email} has shared a session with you: ${session.name}`,
        action_url: `/editor/${sessionId}`,
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error("Failed to create notification:", notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      message: "Session shared successfully",
      sharedWith: email,
      permissionType
    })
  } catch (error) {
    console.error("Error in share session API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 