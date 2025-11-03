import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Loader2 } from 'lucide-react';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const { createOrganization, isCreating } = useOrganizations();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primary_color: '#3B82F6',
    sender_display_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createOrganization(formData);
    onOpenChange(false);
    setFormData({
      name: '',
      slug: '',
      primary_color: '#3B82F6',
      sender_display_name: '',
    });
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Add a new organization to the system. This will create a new tenant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
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
              Create Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
