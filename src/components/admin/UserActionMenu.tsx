import React, { useEffect, useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Shield, Building2, Trash2, Mail, History } from 'lucide-react';
import { ManageUserRolesDialog } from './ManageUserRolesDialog';
import { ManageUserOrganizationsDialog } from './ManageUserOrganizationsDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { InviteHistoryDialog } from './InviteHistoryDialog';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAuth } from '@/hooks/useAuth';

interface UserActionMenuProps {
  user: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    organization_memberships?: Array<{
      id: string;
      role: string;
      organization?: { id: string; name: string };
    }>;
    auth_data?: {
      last_sign_in_at: string | null;
      email_confirmed_at: string | null;
      created_at: string;
    } | null;
  };
}

export function UserActionMenu({ user }: UserActionMenuProps) {
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [orgsDialogOpen, setOrgsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteHistoryOpen, setInviteHistoryOpen] = useState(false);

  // Prevent accidental double-clicking / rate-limit errors by applying a local 60s cooldown.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { deleteUser, isDeletingUser, resendInvite, isResendingInvite } = useUserManagement();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!cooldownUntil) return;

    if (nowMs >= cooldownUntil) {
      setCooldownUntil(null);
      return;
    }

    const t = window.setTimeout(() => setNowMs(Date.now()), 500);
    return () => window.clearTimeout(t);
  }, [cooldownUntil, nowMs]);

  const cooldownRemainingSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000));
  }, [cooldownUntil, nowMs]);

  const isCooldownActive = cooldownRemainingSeconds > 0;

  const handleDeleteUser = () => {
    deleteUser(user.user_id);
    setDeleteDialogOpen(false);
  };

  const handleResendInvite = () => {
    setNowMs(Date.now());
    setCooldownUntil(Date.now() + 60_000);
    resendInvite(user.email);
  };

  const isSelf = currentUser?.id === user.user_id;
  const hasNeverLoggedIn = !user.auth_data?.last_sign_in_at;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {hasNeverLoggedIn && (
            <>
              <DropdownMenuItem 
                onClick={handleResendInvite}
                disabled={isResendingInvite || isCooldownActive}
              >
                <Mail className="h-4 w-4 mr-2" />
                {isResendingInvite
                  ? 'Sending...'
                  : isCooldownActive
                    ? `Resend in ${cooldownRemainingSeconds}s`
                    : 'Resend Invite Email'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setInviteHistoryOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                View Invite History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setRolesDialogOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Manage Roles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrgsDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Manage Organizations
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isSelf}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageUserRolesDialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        user={user}
      />

      <ManageUserOrganizationsDialog
        open={orgsDialogOpen}
        onOpenChange={setOrgsDialogOpen}
        user={user}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${user.full_name || user.email}?`}
        itemName={user.email}
        isLoading={isDeletingUser}
      />

      <InviteHistoryDialog
        email={user.email}
        open={inviteHistoryOpen}
        onOpenChange={setInviteHistoryOpen}
      />
    </>
  );
}
