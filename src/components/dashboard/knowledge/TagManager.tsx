import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, Tag } from "lucide-react";
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

export interface KnowledgeTag {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

const TAG_COLOR_OPTIONS = [
  { value: "#6B7280", label: "Gray" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#14B8A6", label: "Teal" },
];

interface TagManagerProps {
  organizationId: string;
}

export function TagManager({ organizationId }: TagManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTag, setEditingTag] = useState<KnowledgeTag | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeTag | null>(null);
  const [newTag, setNewTag] = useState({
    name: '',
    color: '#6B7280',
  });

  const { data: tags, isLoading } = useQuery({
    queryKey: ['knowledge-tags', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_tags')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return data as KnowledgeTag[];
    },
  });

  const { data: tagUsageCounts } = useQuery({
    queryKey: ['tag-usage-counts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_entries')
        .select('tags')
        .eq('organization_id', organizationId);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
          entry.tags.forEach((tag: string) => {
            counts[tag] = (counts[tag] || 0) + 1;
          });
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tag: typeof newTag) => {
      const { error } = await supabase
        .from('knowledge_tags')
        .insert({
          organization_id: organizationId,
          name: tag.name.toLowerCase().trim(),
          color: tag.color,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tag created successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-tags'] });
      setCreatingTag(false);
      setNewTag({ name: '', color: '#6B7280' });
    },
    onError: (error) => {
      toast({
        title: "Failed to create tag",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (tag: KnowledgeTag) => {
      const { error } = await supabase
        .from('knowledge_tags')
        .update({
          name: tag.name.toLowerCase().trim(),
          color: tag.color,
        })
        .eq('id', tag.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tag updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-tags'] });
      setEditingTag(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update tag",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('knowledge_tags')
        .delete()
        .eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tag deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-tags'] });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete tag",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const getTagUsageCount = (tagName: string) => {
    return tagUsageCounts?.[tagName] || 0;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Tags
        </CardTitle>
        <Button size="sm" onClick={() => setCreatingTag(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tag
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading tags...</p>
        ) : tags?.length === 0 ? (
          <p className="text-muted-foreground">No tags yet. Create your first tag to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-muted/50"
              >
                <Badge
                  variant="outline"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    borderColor: tag.color || undefined,
                    color: tag.color || undefined,
                  }}
                >
                  {tag.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({getTagUsageCount(tag.name)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setEditingTag(tag)}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setDeleteConfirm(tag)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={creatingTag} onOpenChange={setCreatingTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>Add a new tag for knowledge entries.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name *</label>
              <Input
                placeholder="e.g., refund"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tags will be automatically converted to lowercase.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <Select
                value={newTag.color}
                onValueChange={(value) => setNewTag({ ...newTag, color: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: newTag.color }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {TAG_COLOR_OPTIONS.map((color) => (
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingTag(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newTag)}
              disabled={!newTag.name.trim() || createMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
              <DialogDescription>Update tag details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name *</label>
                <Input
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <Select
                  value={editingTag.color || '#6B7280'}
                  onValueChange={(value) => setEditingTag({ ...editingTag, color: value })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: editingTag.color || '#6B7280' }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_COLOR_OPTIONS.map((color) => (
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTag(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(editingTag)}
                disabled={!editingTag.name.trim() || updateMutation.isPending}
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
              <DialogTitle>Delete Tag</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteConfirm.name}"?
                {getTagUsageCount(deleteConfirm.name) > 0 && (
                  <span className="block mt-2 text-destructive">
                    Warning: This tag is used by {getTagUsageCount(deleteConfirm.name)} entries.
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
