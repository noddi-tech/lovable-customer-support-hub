import { AlertTriangle, Loader2 } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOrganizations } from "@/hooks/useOrganizations"
import { useServiceOrganizations } from "@/hooks/useServiceOrganizations"

interface CreateOrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MANUAL = "manual"

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const EMPTY_FORM = {
  name: "",
  slug: "",
  primary_color: "#3B82F6",
  sender_display_name: "",
  navio_organization_id: null as number | null,
}

/**
 * Service organizations are mastered in the Navio backend API, so creating a
 * tenant here means mirroring one of those: pick it from the cached catalog and
 * the local row is linked through `navio_organization_id`.
 */
export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const { createOrganization, isCreating, organizations } = useOrganizations()
  const {
    data: serviceOrgs,
    isLoading: loadingServiceOrgs,
    error: serviceOrgsError,
  } = useServiceOrganizations()
  const [selected, setSelected] = useState<string>(MANUAL)
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) {
      setSelected(MANUAL)
      setFormData(EMPTY_FORM)
    }
  }, [open])

  const linkedIds = new Set(
    organizations.map((o) => o.navio_organization_id).filter((id): id is number => id != null),
  )

  const handleServiceOrgChange = (value: string) => {
    setSelected(value)
    if (value === MANUAL) {
      setFormData({ ...formData, navio_organization_id: null })
      return
    }
    const org = serviceOrgs?.find((o) => String(o.id) === value)
    if (!org) return
    setFormData({
      ...formData,
      name: org.name,
      slug: slugify(org.name),
      navio_organization_id: org.id,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createOrganization(formData)
    onOpenChange(false)
    setSelected(MANUAL)
    setFormData(EMPTY_FORM)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Service Organization</DialogTitle>
          <DialogDescription>
            Mirror a service organization from the Navio backend as a tenant in the Support Hub.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-org">Service organization (Navio)</Label>
            <Select value={selected} onValueChange={handleServiceOrgChange}>
              <SelectTrigger id="service-org">
                <SelectValue
                  placeholder={loadingServiceOrgs ? "Loading…" : "Select a service organization"}
                />
              </SelectTrigger>
              <SelectContent>
                {serviceOrgs?.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)} disabled={linkedIds.has(org.id)}>
                    {org.name}
                    {linkedIds.has(org.id) ? " (already added)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value={MANUAL}>Other / not in Navio</SelectItem>
              </SelectContent>
            </Select>
            {serviceOrgsError && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Could not reach the Navio backend — you can still create the organization manually.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The catalog is fetched from the Navio backend on demand and cached for a few hours.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value, slug: slugify(e.target.value) })
              }
              placeholder="Acme Corporation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="acme-corporation"
              required
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens allowed"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender_display_name">Sender Display Name</Label>
            <Input
              id="sender_display_name"
              value={formData.sender_display_name}
              onChange={(e) => setFormData({ ...formData, sender_display_name: e.target.value })}
              placeholder="Acme Support"
            />
            <p className="text-xs text-muted-foreground">
              Name shown when sending emails from this organization
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.name || !formData.slug}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Service Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
