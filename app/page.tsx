import React from "react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  // Landing page for unauthenticated users
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/40">
      <div className="container flex max-w-4xl flex-col items-center space-y-8 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            PowerPoint Translator
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground sm:text-lg md:text-xl">
            Translate your PowerPoint presentations while preserving formatting and enabling collaboration.
            High-fidelity translation with interactive editing capabilities.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/auth/signup">
              Get Started
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/auth/login">
              Sign In
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">High-Fidelity Translation</h3>
            <p className="text-sm text-muted-foreground">
              Preserve your original slide formatting with server-side SVG conversion
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Interactive Editing</h3>
            <p className="text-sm text-muted-foreground">
              Edit translations directly in an intuitive visual editor
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Collaboration Ready</h3>
            <p className="text-sm text-muted-foreground">
              Share and collaborate on translations with your team
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 