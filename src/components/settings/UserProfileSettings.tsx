import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Building2, Calendar, Loader2, Lock, Shield, Trash2, Upload, Users } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { useAvatarUpload } from "@/hooks/useAvatarUpload"
import { supabase } from "@/integrations/supabase/client"

export const UserProfileSettings = () => {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [emailDisplayName, setEmailDisplayName] = useState(
    (profile as any)?.email_display_name || "",
  )
  const [isSaving, setIsSaving] = useState(false)

  const { uploadAvatar, removeAvatar, isUploading, progress } = useAvatarUpload({
    userId: user?.id || "",
  })

  // Fetch organization details
  const { data: organization } = useQuery({
    queryKey: ["user-organization", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null
      const { data, error } = await supabase
        .from("organizations")
        .select("name, created_at")
        .eq("id", profile.organization_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!profile?.organization_id,
  })

  // Fetch department details
  const { data: department } = useQuery({
    queryKey: ["user-department", profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return null
      const { data, error } = await supabase
        .from("departments")
        .select("name")
        .eq("id", profile.department_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!profile?.department_id,
  })

  // Update when profile changes
  useState(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name)
    }
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadAvatar(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email_display_name: emailDisplayName.trim() || null,
        })
        .eq("user_id", user.id)

      if (error) throw error

      void queryClient.invalidateQueries({ queryKey: ["profile", user.id] })
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user?.email) return

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast.success("Password reset email sent. Check your inbox.")
    } catch (error) {
      console.error("Password reset error:", error)
      toast.error("Failed to send password reset email")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isDirty =
    fullName !== profile.full_name ||
    emailDisplayName !== ((profile as any).email_display_name || "")

  return (
    <div className="space-y-4">
      {/* Profile: photo + personal details in one card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.personalInfo", "Profile")}</CardTitle>
          <CardDescription>
            {t(
              "settings.profile.personalInfoDescription",
              "Your photo, name and the sender name used on outgoing email.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading... {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t("settings.profile.uploadPhoto", "Upload photo")}
                    </>
                  )}
                </Button>
                {profile.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                    disabled={isUploading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("settings.profile.removePhoto", "Remove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.profile.photoHint", "JPG, PNG or WebP. Max 2MB.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("settings.profile.fullName", "Full name")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.profile.email", "Email address")}</Label>
              <div className="relative">
                <Input id="email" value={profile.email} disabled className="bg-muted pr-9" />
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "settings.profile.emailHint",
                  "Email cannot be changed. Contact support if needed.",
                )}
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emailDisplayName">Email display name (optional)</Label>
              <Input
                id="emailDisplayName"
                value={emailDisplayName}
                onChange={(e) => setEmailDisplayName(e.target.value)}
                placeholder="e.g. Anna fra Noddi rekruttering"
              />
              <p className="text-xs text-muted-foreground">
                Used as the From name when you send recruitment emails. Falls back to your full
                name.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving || !isDirty}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                t("settings.profile.saveChanges", "Save changes")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization & Role */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.organizationRole", "Organization & role")}</CardTitle>
          <CardDescription>
            {t(
              "settings.profile.organizationRoleDescription",
              "Your organization membership details",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: Building2,
                label: t("settings.profile.organization", "Organization"),
                value: organization?.name || "Not assigned",
              },
              {
                icon: Users,
                label: t("settings.profile.department", "Department"),
                value: department?.name || "Not assigned",
              },
              {
                icon: Shield,
                label: t("settings.profile.role", "Role"),
                value: formatRole(profile.role),
                badge: true,
              },
              {
                icon: Calendar,
                label: t("settings.profile.memberSince", "Member since"),
                value: profile.created_at
                  ? format(new Date(profile.created_at), "MMMM yyyy")
                  : "Unknown",
              },
            ].map(({ icon: Icon, label, value, badge }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {badge ? (
                    <Badge variant="secondary" className="mt-1">
                      {value}
                    </Badge>
                  ) : (
                    <p className="truncate text-sm font-medium">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.security", "Security")}</CardTitle>
          <CardDescription>
            {t("settings.profile.securityDescription", "Manage your account security settings")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("settings.profile.password", "Password")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.profile.passwordHint", "Send a password reset link to your email")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangePassword}>
              {t("settings.profile.changePassword", "Change password")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
