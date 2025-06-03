import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { SessionPermission, PermissionType } from "@/types"

export async function GET(request: Request) {
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

    // Get sessionId from URL
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    // Validate that session exists and user has access
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

    // Check if user is owner or has access to the session
    const isOwner = session.user_id === user.id
    
    if (!isOwner) {
      const { data: permission, error: permissionError } = await supabase
        .from("session_permissions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .single()

      if (permissionError || !permission) {
        return NextResponse.json(
          { error: "Not authorized to view session permissions" },
          { status: 403 }
        )
      }
    }

    // Fetch permissions with user details
    const { data: permissions, error: permissionsError } = await supabase
      .from("session_permissions")
      .select("*")
      .eq("session_id", sessionId)

    if (permissionsError) {
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      )
    }

    // Use the admin client to fetch user details for each permission
    const sharedUsers: SessionPermission[] = []
    
    for (const permission of permissions || []) {
      // Fetch user details
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(permission.user_id)
      
      if (!userError && userData.user) {
        sharedUsers.push({
          ...permission,
          permission_type: permission.permission_type as PermissionType,
          user: {
            id: userData.user.id,
            email: userData.user.email || '',
            full_name: userData.user.user_metadata?.full_name,
          }
        })
      } else {
        // Include permission even if user details can't be fetched
        sharedUsers.push({
          ...permission,
          permission_type: permission.permission_type as PermissionType
        })
      }
    }

    return NextResponse.json(
      { 
        data: sharedUsers,
        isOwner
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching shared users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 