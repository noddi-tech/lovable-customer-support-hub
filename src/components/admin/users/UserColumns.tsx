import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Crown, Shield, Building } from "lucide-react";
import { UserActionMenu } from "../UserActionMenu";

export interface UserRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  primary_role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  department_id: string | null;
  department?: { id: string; name: string } | null;
  // Fields needed by UserActionMenu
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
}

export const userColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "full_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const name = row.getValue("full_name") as string | null;
      const role = row.original.primary_role;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{name || "—"}</span>
          {role === "admin" && <Crown className="h-4 w-4 text-warning" />}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "primary_role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("primary_role") as string;
      return (
        <Badge variant={role === "admin" ? "destructive" : "secondary"}>
          <Shield className="h-3 w-3 mr-1" />
          {role === "admin" ? "Administrator" : "User"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => {
      const dept = row.original.department;
      return (
        <div className="flex items-center gap-1 text-sm">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span>{dept?.name || "No Department"}</span>
        </div>
      );
    },
    filterFn: (row, _id, filterValue) => {
      const dept = row.original.department;
      return dept?.name?.toLowerCase().includes(filterValue.toLowerCase()) ?? false;
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.getValue("is_active") as boolean;
      return (
        <Badge variant={active ? "default" : "secondary"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      return new Date(row.getValue("created_at") as string).toLocaleDateString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return <UserActionMenu user={user} />;
    },
  },
];
