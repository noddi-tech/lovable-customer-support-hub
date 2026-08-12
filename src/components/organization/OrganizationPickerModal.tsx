import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, ArrowRight } from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationPickerModal({ open, onOpenChange }: OrganizationPickerModalProps) {
  const { memberships, accessibleOrganizations, isSuperAdmin } = useAuth();
  const { setCurrentOrganization } = useOrganizationStore();

  const orgIds = (() => {
    const fromScope = accessibleOrganizations
      .map((o) => o.localId)
      .filter((id): id is string => !!id);
    if (fromScope.length > 0) return fromScope;
    return memberships.map((m) => m.organization_id);
  })();

  const { data: orgNames = {} } = useQuery({
    queryKey: ['org-picker-names', orgIds],
    queryFn: async () => {
      if (orgIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);
      if (error) return {} as Record<string, string>;
      return Object.fromEntries((data || []).map((o) => [o.id, o.name]));
    },
    enabled: open && orgIds.length > 0,
  });

  const handleSelect = (orgId: string) => {
    setCurrentOrganization(orgId, isSuperAdmin);
    onOpenChange(false);
  };

  const options =
    orgIds.length > 0
      ? orgIds.map((id) => ({
          organization_id: id,
          role:
            memberships.find((m) => m.organization_id === id)?.role ||
            accessibleOrganizations.find((o) => o.localId === id)?.slug ||
            'member',
          name:
            orgNames[id] ||
            accessibleOrganizations.find((o) => o.localId === id)?.name ||
            'Organization',
        }))
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Organization</DialogTitle>
          <DialogDescription>
            Choose a service organization you are a member of
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {options.map((opt) => (
            <Card
              key={opt.organization_id}
              className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary"
              onClick={() => handleSelect(opt.organization_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{opt.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{opt.role}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {options.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              You don&apos;t have access to any organizations yet. Check your Navio service organization memberships.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
