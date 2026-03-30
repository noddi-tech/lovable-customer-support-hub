import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building } from "lucide-react";
import { Heading } from '@/components/ui/heading';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';
import { DataTable } from "./DataTable";
import { getDepartmentColumns, DepartmentRow } from "./departments/DepartmentColumns";

interface DepartmentFormData {
  name: string;
  description: string;
}

export function DepartmentManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRow | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({ name: '', description: '' });
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DepartmentRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (departmentData: DepartmentFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (profileError || !profile) throw new Error("Failed to get user organization");

      const { data, error } = await supabase
        .from("departments")
        .insert({ ...departmentData, organization_id: profile.organization_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Department created", description: "The department has been created successfully." });
      setShowCreateDialog(false);
      setFormData({ name: '', description: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create department.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, departmentData }: { id: string; departmentData: DepartmentFormData }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(departmentData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Department updated", description: "The department has been updated successfully." });
      setEditingDepartment(null);
      setFormData({ name: '', description: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update department.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (departmentId: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", departmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: t('admin.departmentDeleted'), description: t('admin.departmentDeletedDescription') });
    },
    onError: () => {
      toast({ title: "Error", description: t('admin.failedToDelete'), variant: "destructive" });
    },
  });

  const startEdit = (department: DepartmentRow) => {
    setEditingDepartment(department);
    setFormData({ name: department.name, description: department.description || '' });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Department name is required.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment || !formData.name.trim()) {
      toast({ title: "Validation Error", description: "Department name is required.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editingDepartment.id, departmentData: formData });
  };

  const columns = useMemo(
    () => getDepartmentColumns({
      onEdit: startEdit,
      onDelete: (id) => deleteMutation.mutate(id),
      isDeleting: deleteMutation.isPending,
      t,
    }),
    [deleteMutation.isPending, t]
  );

  if (isLoading) {
    return <div className="text-center py-8"><p>Loading departments...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>{t('settings.tabs.departments')}</Heading>
          <p className="text-muted-foreground mt-1">{t('admin.organizeDepartments')}</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.createDepartment')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.createDepartment')}</DialogTitle>
              <DialogDescription>{t('admin.addNewDepartment')}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Customer Support, Sales, Technical"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this department's role..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('admin.creating') : t('admin.createDepartment')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={departments}
        searchPlaceholder="Search departments..."
        searchColumnId="name"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingDepartment} onOpenChange={() => { setEditingDepartment(null); setFormData({ name: '', description: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.editDepartment')}</DialogTitle>
            <DialogDescription>Update the department details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('admin.departmentName')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Customer Support, Sales, Technical"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">{t('admin.description')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this department's role..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setEditingDepartment(null); setFormData({ name: '', description: '' }); }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Department"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
