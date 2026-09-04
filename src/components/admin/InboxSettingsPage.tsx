import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ExternalLink, Mail, MessageSquare, Plug2, Tag, UserCheck } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { InboxSlaSettings } from "@/components/admin/InboxSlaSettings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useNoddiBrands } from "@/hooks/useNoddiBrands"
import { useServiceDepartments } from "@/hooks/useServiceDepartments"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import { supabase } from "@/integrations/supabase/client"
import { toastError } from "@/lib/errorToast"
import { useNavigate } from "@/router/compat"

export const INBOX_COLOR_PALETTE = [
  { value: "#6656D9", label: "Primary Purple" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#22C55E", label: "Success Green" },
  { value: "#F59E0B", label: "Warning Orange" },
  { value: "#EF4444", label: "Destructive Red" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#EC4899", label: "Pink" },
  { value: "#06B6D4", label: "Cyan" },
]

interface InboxData {
  id: string
  name: string
  description: string | null
  department_id: string | null
  navio_department_id: number | null
  is_default: boolean
  color: string
  is_active: boolean
  conversation_count: number
  sender_display_name: string | null
  purpose: "support" | "recruitment"
  ai_draft_enabled: boolean
  auto_assignment_rules: {
    assign_to_profile_id?: string | null
    default_brand?: string | null
  } | null
}

const NO_AUTO_ASSIGN = "no-auto-assign"
const NO_DEFAULT_BRAND = "no-default-brand"

interface InboundRoute {
  id: string
  inbox_id: string | null
  address: string
  group_email: string | null
}
interface EmailAccount {
  id: string
  inbox_id: string | null
  email_address: string
  provider: string
}

export function InboxSettingsPage({ inboxId }: { inboxId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<InboxData | null>(null)
  const [groupEmail, setGroupEmail] = useState("")

  const { data: inboxes, isLoading } = useQuery({
    queryKey: ["inboxes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inboxes")
      if (error) throw error
      return data as unknown as InboxData[]
    },
  })

  const { data: teamMembers } = useTeamMembers()

  const { data: departments } = useServiceDepartments()

  const { brands, isLoading: brandsLoading } = useNoddiBrands()

  const { data: inboundRoutes } = useQuery({
    queryKey: ["inbound_routes"],
    queryFn: async (): Promise<InboundRoute[]> => {
      const { data, error } = await supabase
        .from("inbound_routes")
        .select("id,inbox_id,address,group_email")
      if (error) throw error
      return data
    },
  })

  const { data: emailAccounts } = useQuery({
    queryKey: ["email_accounts"],
    queryFn: async (): Promise<EmailAccount[]> => {
      const { data, error } = await supabase.rpc("get_email_accounts")
      if (error) throw error
      return data || []
    },
  })

  const inbox = useMemo(() => inboxes?.find((i) => i.id === inboxId) || null, [inboxes, inboxId])
  const route = useMemo(
    () => (inboundRoutes || []).find((r) => r.inbox_id === inboxId) || null,
    [inboundRoutes, inboxId],
  )
  const accounts = useMemo(
    () => (emailAccounts || []).filter((a) => a.inbox_id === inboxId),
    [emailAccounts, inboxId],
  )

  useEffect(() => {
    if (inbox) setForm(inbox)
  }, [inbox])
  useEffect(() => {
    setGroupEmail(route?.group_email || "")
  }, [route])

  const updateInbox = useMutation({
    mutationFn: async (updates: Partial<InboxData>) => {
      const { conversation_count, ...rest } = updates as any
      const { error } = await supabase.from("inboxes").update(rest).eq("id", inboxId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inboxes"] })
      toast.success("Inbox updated successfully")
    },
    onError: (error: any) => toastError("Failed to update inbox", error),
  })

  const updateGroupEmail = useMutation({
    mutationFn: async () => {
      if (!route) return
      const { error } = await supabase
        .from("inbound_routes")
        .update({ group_email: groupEmail.trim() })
        .eq("id", route.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inbound_routes"] })
      toast.success("Sending address updated")
    },
    onError: (error: any) => toastError("Failed to update sending address", error),
  })

  if (isLoading || (!form && inbox)) {
    return <div className="p-6 text-muted-foreground">Loading inbox…</div>
  }

  if (!inbox || !form) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/inboxes")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to inboxes
        </Button>
        <p className="text-muted-foreground">Inbox not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => navigate("/admin/inboxes")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to inboxes
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.color }} />
          <Heading level={2}>{form.name || "Inbox"}</Heading>
          {form.is_default && <Badge variant="secondary">Default</Badge>}
          <Badge variant={form.is_active ? "default" : "secondary"}>
            {form.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Configure this inbox's details, routing and sending identity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Basic information shown across the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="inbox-name">Inbox Name</Label>
            <Input
              id="inbox-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="inbox-description">Description</Label>
            <Textarea
              id="inbox-description"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="inbox-department">Service department</Label>
            <Select
              value={form.navio_department_id ? String(form.navio_department_id) : "no-department"}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  navio_department_id: value === "no-department" ? null : Number(value),
                })
              }
            >
              <SelectTrigger id="inbox-department">
                <SelectValue placeholder="Select service department (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-department">No service department</SelectItem>
                {departments?.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Service departments come from the Navio backend and are cached for a few hours.
            </p>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {INBOX_COLOR_PALETTE.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === color.value
                      ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behaviour</CardTitle>
          <CardDescription>Purpose, sender identity and availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="inbox-sender">Sender Display Name (Optional)</Label>
            <Input
              id="inbox-sender"
              value={form.sender_display_name || ""}
              onChange={(e) => setForm({ ...form, sender_display_name: e.target.value || null })}
              placeholder="Leave empty to use organization default"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Override the organization-level sender name for this inbox
            </p>
          </div>
          <div>
            <Label htmlFor="inbox-purpose">Purpose</Label>
            <Select
              value={form.purpose || "support"}
              onValueChange={(v: "support" | "recruitment") => setForm({ ...form, purpose: v })}
            >
              <SelectTrigger id="inbox-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="recruitment">Recruitment</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Recruitment inboxes auto-link inbound emails to applicants by email.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="inbox-active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
            <Label htmlFor="inbox-active">Active</Label>
          </div>
          <div className="flex items-start space-x-2">
            <Switch
              id="inbox-ai-draft"
              checked={form.ai_draft_enabled !== false}
              onCheckedChange={(checked) => setForm({ ...form, ai_draft_enabled: checked })}
            />
            <div>
              <Label htmlFor="inbox-ai-draft">AI draft replies</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When on, incoming emails to this inbox get an AI-written draft reply. Drafts are
                internal and are never sent automatically — an agent must review and press Send.
              </p>
            </div>
          </div>
          {!inbox.is_default && (
            <div className="flex items-center space-x-2">
              <Switch
                id="inbox-default"
                checked={form.is_default}
                onCheckedChange={(checked) => setForm({ ...form, is_default: checked })}
              />
              <Label htmlFor="inbox-default">Set as default inbox</Label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-assignment</CardTitle>
          <CardDescription>
            Automatically give new conversations in this inbox an owner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="inbox-auto-assign" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Assign new conversations to
          </Label>
          <Select
            value={form.auto_assignment_rules?.assign_to_profile_id || NO_AUTO_ASSIGN}
            onValueChange={(value) =>
              setForm({
                ...form,
                auto_assignment_rules: {
                  ...(form.auto_assignment_rules || {}),
                  assign_to_profile_id: value === NO_AUTO_ASSIGN ? null : value,
                },
              })
            }
          >
            <SelectTrigger id="inbox-auto-assign">
              <SelectValue placeholder="No one (leave unassigned)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_AUTO_ASSIGN}>No one (leave unassigned)</SelectItem>
              {teamMembers?.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Every new email, chat or text conversation landing in this inbox without an owner is
            assigned to this person. Existing conversations are untouched, and agents can always
            reassign afterwards.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" /> Default brand
          </CardTitle>
          <CardDescription>Label new conversations in this inbox with a brand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="inbox-default-brand">Brand</Label>
          <Select
            value={form.auto_assignment_rules?.default_brand || NO_DEFAULT_BRAND}
            onValueChange={(value) =>
              setForm({
                ...form,
                auto_assignment_rules: {
                  ...(form.auto_assignment_rules || {}),
                  default_brand: value === NO_DEFAULT_BRAND ? null : value,
                },
              })
            }
          >
            <SelectTrigger id="inbox-default-brand">
              <SelectValue placeholder={brandsLoading ? "Loading brands…" : "No default brand"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DEFAULT_BRAND}>No default brand</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            New conversations in this inbox are labelled with this brand unless the message already
            carries one. Brands come from the Navio backend and are cached for a few hours.
          </p>
        </CardContent>
      </Card>

      <InboxSlaSettings inboxId={inboxId} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Email routing</CardTitle>
              <CardDescription>
                Connected addresses and the From address used for replies
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/integrations")}
              className="gap-2"
            >
              <Plug2 className="w-4 h-4" />
              Integrations & Routing
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4" /> Connected email(s)
            </span>
            <div className="text-muted-foreground">
              {accounts.length + (route ? 1 : 0) === 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>No email connected yet.</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate("/admin/integrations")}
                    className="gap-2"
                  >
                    <Plug2 className="w-4 h-4" />
                    Connect an email
                  </Button>
                </div>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {accounts.map((a) => (
                    <li key={a.id}>
                      <span className="font-medium">{a.email_address}</span>
                      <span className="ml-2 text-xs">({a.provider})</span>
                    </li>
                  ))}
                  {route && (
                    <li>
                      <span className="font-medium">
                        {route.group_email || "Public email not set"}
                      </span>
                      <span className="ml-2">→ forwards to </span>
                      <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/50">
                        {route.address}
                      </code>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="inbox-group-email">Sending/Receiving address</Label>
            {route ? (
              <div className="mt-1 flex gap-2">
                <Input
                  id="inbox-group-email"
                  value={groupEmail}
                  onChange={(e) => setGroupEmail(e.target.value)}
                  placeholder="e.g., hei@noddi.no"
                />
                <Button
                  onClick={() => updateGroupEmail.mutate()}
                  disabled={updateGroupEmail.isPending || groupEmail.trim().length === 0}
                >
                  {updateGroupEmail.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                No inbound route linked to this inbox yet. Set it up in Admin → Integrations →
                Inbound Addresses.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Used as the From address when replying. Must match your authenticated domain in
              SendGrid.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Conversations
            </span>
            <Badge variant="outline">{inbox.conversation_count}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={() => navigate("/admin/inboxes")}>
          Cancel
        </Button>
        <Button onClick={() => updateInbox.mutate(form)} disabled={updateInbox.isPending}>
          {updateInbox.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
