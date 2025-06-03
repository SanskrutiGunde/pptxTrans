import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Get email from query params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Use the correct method to get user by email in Supabase
    // Since direct email lookup isn't available in the JavaScript SDK,
    // we'll need to list users and filter manually
    const { data, error } = await adminClient.auth.admin.listUsers()

    if (error) {
      console.error("Error looking up user:", error)
      return NextResponse.json(
        { error: "Failed to lookup user" },
        { status: 500 }
      )
    }

    // Find the user with the matching email
    const foundUser = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    // Check if user was found
    if (!foundUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Return minimal user info
    return NextResponse.json({
      id: foundUser.id,
      email: foundUser.email,
      full_name: foundUser.user_metadata?.full_name || null
    })
  } catch (error) {
    console.error("Error in user lookup API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}