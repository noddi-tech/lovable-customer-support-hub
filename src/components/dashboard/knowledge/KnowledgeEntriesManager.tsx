import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Database, Search, Trash2, Edit, Save, X, Star } from "lucide-react";
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

interface KnowledgeEntry {
  id: string;
  customer_context: string;
  agent_response: string;
  quality_score: number | null;
  usage_count: number | null;
  acceptance_count: number | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  is_active: boolean | null;
}

export function KnowledgeEntriesManager({ organizationId }: { organizationId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<KnowledgeEntry | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['knowledge-entries', organizationId, searchQuery, filterSource],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('quality_score', { ascending: false });

      if (searchQuery) {
        query = query.or(`customer_context.ilike.%${searchQuery}%,agent_response.ilike.%${searchQuery}%`);
      }

      if (filterSource !== 'all') {
        query = query.eq('category', filterSource);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeEntry[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (entry: KnowledgeEntry) => {
      const { error } = await supabase
        .from('knowledge_entries')
        .update({
          customer_context: entry.customer_context,
          agent_response: entry.agent_response,
          tags: entry.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entry updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-entries'] });
      setEditingEntry(null);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('knowledge_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entry deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-entries'] });
      setDeleteConfirmEntry(null);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-500';
    switch (category) {
      case 'technical_support': return 'bg-blue-500';
      case 'billing': return 'bg-green-500';
      case 'general_inquiry': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Knowledge Entries Manager
          </h2>
          <p className="text-muted-foreground">View and manage your knowledge base entries</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {entries?.length || 0} Entries
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="technical_support">Technical Support</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="general_inquiry">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading entries...</div>
      ) : (
        <div className="space-y-4">
          {entries?.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold mb-2">
                      Customer Message
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mb-4">
                      {entry.customer_context.substring(0, 200)}
                      {entry.customer_context.length > 200 && '...'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmEntry(entry)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Agent Response</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.agent_response.substring(0, 200)}
                    {entry.agent_response.length > 200 && '...'}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {entry.category && (
                    <Badge className={getCategoryColor(entry.category)}>
                      {entry.category.replace('_', ' ')}
                    </Badge>
                  )}
                  {entry.quality_score !== null && (
                    <div className="flex items-center gap-1">
                      <Star className={`w-4 h-4 ${getQualityColor(entry.quality_score)}`} />
                      <span className={`text-sm font-bold ${getQualityColor(entry.quality_score)}`}>
                        {entry.quality_score.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Used: {entry.usage_count || 0} times
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Accepted: {entry.acceptance_count || 0} times
                  </span>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1">
                      {entry.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Knowledge Entry</DialogTitle>
              <DialogDescription>
                Update the customer message and agent response
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Customer Context</label>
                <Textarea
                  value={editingEntry.customer_context}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, customer_context: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Agent Response</label>
                <Textarea
                  value={editingEntry.agent_response}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, agent_response: e.target.value })
                  }
                  rows={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                <Input
                  value={editingEntry.tags?.join(', ') || ''}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t),
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingEntry(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={() => updateMutation.mutate(editingEntry)}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmEntry && (
        <Dialog open={!!deleteConfirmEntry} onOpenChange={() => setDeleteConfirmEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this knowledge entry? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmEntry(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteConfirmEntry.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
