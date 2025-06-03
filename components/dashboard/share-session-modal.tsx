"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Mail, Trash2 } from "lucide-react"
import { SessionPermission, PermissionType } from "@/types"

interface ShareSessionModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  sessionName: string
  existingPermissions: SessionPermission[]
  onShareComplete: () => void
}

export default function ShareSessionModal({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  existingPermissions,
  onShareComplete,
}: ShareSessionModalProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [permissionType, setPermissionType] = useState<PermissionType>("view")
  const [isLoading, setIsLoading] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  const handleShare = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email address to share with.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // First, get the user ID for the email
      const res = await fetch("/api/users/lookup?email=" + encodeURIComponent(email))
      const data = await res.json()

      if (!res.ok || !data.userId) {
        toast({
          title: "User not found",
          description: "No user with that email address was found.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Now share the session with the user
      const shareRes = await fetch("/api/sessions/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId: data.userId,
          permissionType,
        }),
      })

      if (!shareRes.ok) {
        const error = await shareRes.json()
        throw new Error(error.error || "Failed to share session")
      }

      toast({
        title: "Session shared",
        description: `Session "${sessionName}" has been shared with ${email}.`,
      })

      setEmail("")
      onShareComplete()
    } catch (error) {
      console.error("Error sharing session:", error)
      toast({
        title: "Error sharing session",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeAccess = async (permissionId: string, userId: string, userEmail: string) => {
    setIsRevoking(permissionId)

    try {
      const res = await fetch("/api/sessions/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to revoke access")
      }

      toast({
        title: "Access revoked",
        description: `Access for "${userEmail}" has been revoked.`,
      })

      onShareComplete()
    } catch (error) {
      console.error("Error revoking access:", error)
      toast({
        title: "Error revoking access",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Session</DialogTitle>
          <DialogDescription>
            Share this translation session with other users.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email"
                placeholder="example@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Permission</Label>
            <RadioGroup value={permissionType} onValueChange={(value) => setPermissionType(value as PermissionType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="view" id="view" />
                <Label htmlFor="view" className="font-normal">View only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edit" id="edit" />
                <Label htmlFor="edit" className="font-normal">Can edit</Label>
              </div>
            </RadioGroup>
          </div>

          {existingPermissions.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 font-medium">Shared with</h4>
              <div className="space-y-2">
                {existingPermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between rounded border p-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{permission.user?.email || "Unknown user"}</span>
                      <Badge variant="outline">
                        {permission.permission_type === "edit" ? "Can edit" : "View only"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => 
                        permission.user && 
                        handleRevokeAccess(permission.id, permission.user_id, permission.user.email)
                      }
                      disabled={isRevoking === permission.id}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {isRevoking === permission.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleShare} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 