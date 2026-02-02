import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, FolderOpen } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface KnowledgeCategory {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const COLOR_OPTIONS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#EF4444", label: "Red" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
];

interface CategoryManagerProps {
  organizationId: string;
}

export function CategoryManager({ organizationId }: CategoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3B82F6',
    description: '',
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['knowledge-categories', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return data as KnowledgeCategory[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: usageCounts } = useQuery({
    queryKey: ['category-usage-counts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_entries')
        .select('category')
        .eq('organization_id', organizationId);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(entry => {
        if (entry.category) {
          counts[entry.category] = (counts[entry.category] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (category: typeof newCategory) => {
      const { error } = await supabase
        .from('knowledge_categories')
        .insert({
          organization_id: organizationId,
          name: category.name,
          color: category.color,
          description: category.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category created successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      setCreatingCategory(false);
      setNewCategory({ name: '', color: '#3B82F6', description: '' });
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (category: KnowledgeCategory) => {
      const { error } = await supabase
        .from('knowledge_categories')
        .update({
          name: category.name,
          color: category.color,
          description: category.description,
        })
        .eq('id', category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      setEditingCategory(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update category",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('knowledge_categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete category",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const getCategoryUsageCount = (categoryName: string) => {
    return usageCounts?.[categoryName] || 0;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Categories
        </CardTitle>
        <Button size="sm" onClick={() => setCreatingCategory(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading categories...</p>
        ) : categories?.length === 0 ? (
          <p className="text-muted-foreground">No categories yet. Create your first category to get started.</p>
        ) : (
          <div className="space-y-3">
            {categories?.map((category) => (
              <div
                key={category.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-4 h-4 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Used in {getCategoryUsageCount(category.name)} entries
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingCategory(category)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(category)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={creatingCategory} onOpenChange={setCreatingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new category for knowledge entries.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name *</label>
              <Input
                placeholder="e.g., Technical Support"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <Select
                value={newCategory.color}
                onValueChange={(value) => setNewCategory({ ...newCategory, color: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: newCategory.color }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Brief description of this category..."
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingCategory(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newCategory)}
              disabled={!newCategory.name.trim() || createMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update category details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name *</label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <Select
                  value={editingCategory.color}
                  onValueChange={(value) => setEditingCategory({ ...editingCategory, color: value })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: editingCategory.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(editingCategory)}
                disabled={!editingCategory.name.trim() || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteConfirm.name}"?
                {getCategoryUsageCount(deleteConfirm.name) > 0 && (
                  <span className="block mt-2 text-destructive">
                    Warning: This category is used by {getCategoryUsageCount(deleteConfirm.name)} entries.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
