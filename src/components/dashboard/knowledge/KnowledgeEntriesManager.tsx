import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Database, Search, Trash2, Edit, Save, X, Star, Plus } from "lucide-react";
import { useState } from "react";
import { sanitizeForPostgrest } from "@/utils/queryUtils";
import { SimpleRichEditor } from "@/components/ui/simple-rich-editor";
import { StarRatingInput } from "@/components/ui/star-rating-input";
import { sanitizeEmailHTML } from "@/utils/htmlSanitizer";
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
import { TagMultiSelect } from "./TagMultiSelect";
import type { KnowledgeCategory } from "./CategoryManager";
import type { KnowledgeTag } from "./TagManager";

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
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    customer_context: '',
    agent_response: '',
    category: '',
    tags: [] as string[],
  });

  // Fetch dynamic categories
  const { data: categories } = useQuery({
    queryKey: ['knowledge-categories', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as KnowledgeCategory[];
    },
  });

  // Fetch dynamic tags for color lookup
  const { data: tagsData } = useQuery({
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

  const { data: entries, isLoading } = useQuery({
    queryKey: ['knowledge-entries', organizationId, searchQuery, filterSource],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('quality_score', { ascending: false });

      if (searchQuery) {
        const safeSearch = sanitizeForPostgrest(searchQuery);
        query = query.or(`customer_context.ilike.%${safeSearch}%,agent_response.ilike.%${safeSearch}%`);
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
          category: entry.category,
          tags: entry.tags,
          quality_score: entry.quality_score,
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

  const createMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const { error } = await supabase
        .from('knowledge_entries')
        .insert({
          organization_id: organizationId,
          customer_context: entry.customer_context,
          agent_response: entry.agent_response,
          category: entry.category,
          tags: entry.tags.length > 0 ? entry.tags : null,
          quality_score: 3.0,
          usage_count: 0,
          acceptance_count: 0,
          is_active: true,
          is_manually_curated: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entry created successfully" });
      queryClient.invalidateQueries({ queryKey: ['knowledge-entries'] });
      setCreatingEntry(false);
      setNewEntry({ customer_context: '', agent_response: '', category: '', tags: [] });
    },
    onError: (error) => {
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (categoryName: string | null) => {
    if (!categoryName) return '#6B7280';
    const category = categories?.find(c => c.name === categoryName);
    return category?.color || '#6B7280';
  };

  const getTagColor = (tagName: string) => {
    const tag = tagsData?.find(t => t.name === tagName);
    return tag?.color || '#6B7280';
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
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {entries?.length || 0} Entries
          </Badge>
          <Button onClick={() => setCreatingEntry(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
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
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
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
                  <div 
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeEmailHTML(
                        entry.agent_response.length > 200 
                          ? entry.agent_response.substring(0, 200) + '...' 
                          : entry.agent_response
                      ) 
                    }}
                  />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {entry.category && (
                    <Badge 
                      variant="outline"
                      style={{ 
                        backgroundColor: `${getCategoryColor(entry.category)}20`,
                        borderColor: getCategoryColor(entry.category),
                        color: getCategoryColor(entry.category),
                      }}
                    >
                      {entry.category}
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
                    <div className="flex gap-1 flex-wrap">
                      {entry.tags.map((tag, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs"
                          style={{
                            backgroundColor: `${getTagColor(tag)}20`,
                            borderColor: getTagColor(tag),
                            color: getTagColor(tag),
                          }}
                        >
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
                <SimpleRichEditor
                  value={editingEntry.agent_response}
                  onChange={(value) =>
                    setEditingEntry({ ...editingEntry, agent_response: value })
                  }
                  minHeight="150px"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Quality Score</label>
                <StarRatingInput
                  value={editingEntry.quality_score ?? 3}
                  onChange={(value) =>
                    setEditingEntry({ ...editingEntry, quality_score: value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher scores prioritize this entry in AI suggestions
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select 
                  value={editingEntry.category || ''} 
                  onValueChange={(v) => setEditingEntry({ ...editingEntry, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <TagMultiSelect
                  organizationId={organizationId}
                  selectedTags={editingEntry.tags || []}
                  onChange={(tags) => setEditingEntry({ ...editingEntry, tags })}
                  selectedCategoryId={categories?.find(c => c.name === editingEntry.category)?.id}
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

      {/* Create Entry Dialog */}
      <Dialog open={creatingEntry} onOpenChange={setCreatingEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Knowledge Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to your knowledge base. This will be available for AI suggestions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Customer Question/Context *</label>
              <Textarea
                placeholder="What is the typical customer question or situation?"
                value={newEntry.customer_context}
                onChange={(e) => setNewEntry({ ...newEntry, customer_context: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ideal Agent Response *</label>
              <SimpleRichEditor
                placeholder="What is the best response to this question?"
                value={newEntry.agent_response}
                onChange={(value) => setNewEntry({ ...newEntry, agent_response: value })}
                minHeight="150px"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={newEntry.category} onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <TagMultiSelect
                organizationId={organizationId}
                selectedTags={newEntry.tags}
                onChange={(tags) => setNewEntry({ ...newEntry, tags })}
                selectedCategoryId={categories?.find(c => c.name === newEntry.category)?.id}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingEntry(false)}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate(newEntry)}
              disabled={!newEntry.customer_context.trim() || !newEntry.agent_response.trim() || createMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
