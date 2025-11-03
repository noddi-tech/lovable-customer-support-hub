import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';

interface OrganizationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationPickerModal({ open, onOpenChange }: OrganizationPickerModalProps) {
  const { memberships } = useAuth();
  const { setCurrentOrganization } = useOrganizationStore();

  const handleSelect = (orgId: string) => {
    setCurrentOrganization(orgId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Organization</DialogTitle>
          <DialogDescription>
            Choose which organization you'd like to access
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {memberships.map((membership) => (
            <Card
              key={membership.organization_id}
              className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary"
              onClick={() => handleSelect(membership.organization_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Organization</p>
                      <p className="text-sm text-muted-foreground capitalize">{membership.role}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {memberships.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              You don't have access to any organizations yet
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
