import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Building, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface DepartmentColumnsOptions {
  onEdit: (department: DepartmentRow) => void;
  onDelete: (departmentId: string) => void;
  isDeleting: boolean;
  t: (key: string) => string;
}

export function getDepartmentColumns({
  onEdit,
  onDelete,
  isDeleting,
  t,
}: DepartmentColumnsOptions): ColumnDef<DepartmentRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Building className="h-4 w-4 mr-2" />
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const desc = row.getValue("description") as string | null;
        return (
          <span className="text-muted-foreground">{desc || "—"}</span>
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
        const department = row.original;
        return (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => onEdit(department)}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("admin.deleteDepartment")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("conversation.deleteConfirmation")} &quot;{department.name}&quot;.{" "}
                    {t("conversation.deleteDescription")} {t("admin.moveToDefault")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(department.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? t("admin.deleting") : t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];
}
