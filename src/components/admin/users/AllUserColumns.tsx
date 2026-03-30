import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Crown, Shield, UserCheck, User, Building2, Clock, AlertCircle, Send, CheckCircle, Activity } from "lucide-react";
import { UserActionMenu } from "../UserActionMenu";
import { formatDistanceToNow } from "date-fns";

export interface AllUserRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  system_roles?: string[];
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
  // invite status injected externally
  _inviteStatus?: {
    status: string;
    created_at: string;
  } | null;
  // callback for activity button
  _onActivity?: (userId: string, email: string) => void;
}

const roleConfig: Record<string, { icon: any; className: string; label: string }> = {
  super_admin: {
    icon: Crown,
    className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    label: 'Super Admin',
  },
  admin: {
    icon: Shield,
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    label: 'Admin',
  },
  agent: {
    icon: UserCheck,
    className: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
    label: 'Agent',
  },
  user: {
    icon: User,
    className: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30',
    label: 'User',
  },
};

export const allUserColumns: ColumnDef<AllUserRow>[] = [
  {
    accessorKey: "full_name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const name = row.getValue("full_name") as string | null;
      const roles = row.original.system_roles ?? [];
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{name || "—"}</span>
          {roles.map((role) => {
            const config = roleConfig[role];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Badge key={role} className={`text-xs ${config.className}`}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            );
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    id: "organizations",
    header: "Organizations",
    cell: ({ row }) => {
      const memberships = row.original.organization_memberships ?? [];
      if (memberships.length === 0) {
        return (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            No organizations
          </Badge>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {memberships.map((m) => (
            <div key={m.id} className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {m.organization?.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const user = row.original;
      const lastSignIn = user.auth_data?.last_sign_in_at;
      const inviteStatus = user._inviteStatus;

      if (lastSignIn) {
        return (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last seen {formatDistanceToNow(new Date(lastSignIn))} ago
          </span>
        );
      }

      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Never logged in
          </Badge>
          {inviteStatus?.status === 'sent' && (
            <Badge variant="secondary" className="text-xs">
              <Send className="h-3 w-3 mr-1" />
              Sent {formatDistanceToNow(new Date(inviteStatus.created_at))} ago
            </Badge>
          )}
          {(inviteStatus?.status === 'bounced' || inviteStatus?.status === 'failed') && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Email {inviteStatus.status}
            </Badge>
          )}
          {inviteStatus?.status === 'delivered' && (
            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
              <CheckCircle className="h-3 w-3 mr-1" />
              Delivered
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => new Date(row.getValue("created_at") as string).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => user._onActivity?.(user.user_id, user.email)}
          >
            <Activity className="h-4 w-4 mr-1" />
            Activity
          </Button>
          <UserActionMenu user={user} />
        </div>
      );
    },
  },
];
