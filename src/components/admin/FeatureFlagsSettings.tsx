import { Code2, Copy, Flag, Pencil, Plus, Search, Trash2 } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useFeatureFlagList, useFeatureFlagMutations } from "@/hooks/useFeatureFlags"
import type { FeatureFlagRecord } from "@/lib/feature-flags/types"

const OFREP_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ofrep/ofrep/v1/evaluate/flags`

interface FormState {
  id?: string
  key: string
  name: string
  description: string
  enabled: boolean
  onValue: string
  offValue: string
}

const emptyForm: FormState = {
  key: "",
  name: "",
  description: "",
  enabled: false,
  onValue: "true",
  offValue: "false",
}

const parseValue = (raw: string): unknown => {
  const trimmed = raw.trim()
  if (trimmed === "") return ""
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

export const FeatureFlagsSettings: React.FC = () => {
  const { data: flags = [], isLoading } = useFeatureFlagList()
  const { upsertFlag, toggleFlag, deleteFlag } = useFeatureFlagMutations()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<FeatureFlagRecord | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return flags
    return flags.filter((f) =>
      [f.key, f.name ?? "", f.description ?? ""].join(" ").toLowerCase().includes(q),
    )
  }, [flags, search])

  const openCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (flag: FeatureFlagRecord) => {
    setForm({
      id: flag.organization_id ? flag.id : undefined,
      key: flag.key,
      name: flag.name ?? "",
      description: flag.description ?? "",
      enabled: flag.enabled,
      onValue: JSON.stringify(flag.variants?.on ?? true),
      offValue: JSON.stringify(flag.variants?.off ?? false),
    })
    setDialogOpen(true)
  }

  const save = () => {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(form.key.trim())) {
      toast.error('Use a key like "new_inbox_ui" (letters, numbers, . _ -)')
      return
    }
    const on = parseValue(form.onValue)
    const off = parseValue(form.offValue)
    upsertFlag.mutate(
      {
        id: form.id,
        key: form.key,
        name: form.name || null,
        description: form.description || null,
        enabled: form.enabled,
        value_type:
          typeof on === "boolean"
            ? "boolean"
            : typeof on === "number"
              ? "number"
              : typeof on === "string"
                ? "string"
                : "json",
        variants: { on, off },
        default_variant: "off",
      },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  const copyCurl = (key: string) => {
    const snippet = `curl -X POST "${OFREP_BASE}/${key}" \\
  -H "Authorization: Bearer <SUPABASE_USER_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"context":{"targetingKey":"user-123"}}'`
    navigator.clipboard.writeText(snippet)
    toast.success("OFREP request copied")
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              Feature flags
            </CardTitle>
            <CardDescription>
              Toggle features for your organization. The same flags are served over the OpenFeature
              Remote Evaluation Protocol (OFREP), so services and scripts can read them through the
              API.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New flag
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flags…"
              className="pl-9"
            />
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading flags…</p>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <Flag className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {flags.length === 0
                  ? "No feature flags yet. Create your first one to start rolling features out safely."
                  : "No flags match your search."}
              </p>
              {flags.length === 0 && (
                <Button variant="outline" onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create a flag
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-medium">{flag.key}</code>
                    {!flag.organization_id && <Badge variant="outline">global default</Badge>}
                    <Badge variant={flag.enabled ? "default" : "secondary"}>
                      {flag.enabled ? "on" : "off"}
                    </Badge>
                    <Badge variant="outline">{flag.value_type}</Badge>
                  </div>
                  {(flag.name || flag.description) && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {flag.name ? `${flag.name} — ` : ""}
                      {flag.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Copy OFREP request"
                    onClick={() => copyCurl(flag.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(flag)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {flag.organization_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => setDeleteTarget(flag)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(enabled) => toggleFlag.mutate({ flag, enabled })}
                    aria-label={`Toggle ${flag.key}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4 text-primary" />
            OpenFeature API (OFREP)
          </CardTitle>
          <CardDescription>
            Any OpenFeature SDK with an OFREP provider can read these flags. Authenticate with a
            Supabase user token; evaluation is scoped to that user's organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {`POST ${OFREP_BASE}          → evaluate all flags
POST ${OFREP_BASE}/{key}    → evaluate one flag
Header: Authorization: Bearer <SUPABASE_USER_JWT>
Body:   { "context": { "targetingKey": "user-123" } }`}
          </pre>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit feature flag" : "New feature flag"}</DialogTitle>
            <DialogDescription>
              Values are parsed as JSON when possible, so a flag can serve booleans, numbers,
              strings or objects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flag-key">Key</Label>
              <Input
                id="flag-key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="new_inbox_ui"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="New inbox UI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-desc">Description</Label>
              <Textarea
                id="flag-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="flag-on">Value when on</Label>
                <Input
                  id="flag-on"
                  value={form.onValue}
                  onChange={(e) => setForm({ ...form, onValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-off">Value when off</Label>
                <Input
                  id="flag-off"
                  value={form.offValue}
                  onChange={(e) => setForm({ ...form, offValue: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Serve the "on" value</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm({ ...form, enabled })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsertFlag.isPending}>
              Save flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete feature flag</DialogTitle>
            <DialogDescription>
              {deleteTarget?.key} will be removed. Code reading this flag falls back to its default
              value.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteFlag.mutate(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
