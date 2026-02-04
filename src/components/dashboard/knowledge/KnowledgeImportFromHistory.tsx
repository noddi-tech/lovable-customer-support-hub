import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TagMultiSelect } from "./TagMultiSelect";
import { 
  Play, 
  Loader2, 
  Check, 
  X, 
  Edit3, 
  Star, 
  MessageSquare, 
  User,
  RefreshCw,
  CheckCheck
} from "lucide-react";

interface KnowledgeImportFromHistoryProps {
  organizationId: string;
}

interface PendingEntry {
  id: string;
  customer_context: string;
  agent_response: string;
  suggested_category_id: string | null;
  suggested_tags: string[] | null;
  ai_quality_score: number | null;
  review_status: string;
  source_conversation_id: string | null;
  source_message_id: string | null;
  created_at: string;
}

interface ExtractionJob {
  id: string;
  status: string;
  total_conversations: number;
  total_processed: number;
  entries_created: number;
  entries_skipped: number;
  started_at: string | null;
  completed_at: string | null;
}

export function KnowledgeImportFromHistory({ organizationId }: KnowledgeImportFromHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<{ customer: string; agent: string }>({ customer: '', agent: '' });
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});

  // Fetch latest extraction job
  const { data: latestJob, isLoading: jobLoading } = useQuery({
    queryKey: ['knowledge-extraction-job', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_extraction_jobs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ExtractionJob | null;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch pending entries
  const { data: pendingEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['knowledge-pending-entries', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_pending_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('review_status', 'pending')
        .order('ai_quality_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as PendingEntry[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch categories for assignment
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
      return data;
    },
    staleTime: 0,
  });

  // Start extraction mutation
  const startExtractionMutation = useMutation({
    mutationFn: async () => {
      setIsExtracting(true);
      let offset = 0;
      let jobId: string | null = null;
      
      while (true) {
        const { data, error } = await supabase.functions.invoke('extract-knowledge-from-history', {
          body: { 
            organizationId, 
            jobId,
            batchSize: 50,
            offset 
          }
        });

        if (error) throw error;

        jobId = data.jobId;
        
        // Refetch job status to update progress
        await queryClient.invalidateQueries({ queryKey: ['knowledge-extraction-job', organizationId] });

        if (data.status === 'completed' || data.nextOffset === null) {
          break;
        }

        offset = data.nextOffset;
      }

      return { success: true };
    },
    onSuccess: () => {
      setIsExtracting(false);
      toast({
        title: "Extraction Complete",
        description: "Q&A pairs have been extracted and are ready for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-pending-entries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-extraction-job', organizationId] });
    },
    onError: (error) => {
      setIsExtracting(false);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract knowledge",
        variant: "destructive",
      });
    },
  });

  // Approve entry mutation
  const approveEntryMutation = useMutation({
    mutationFn: async ({ entryId, categoryId, tags, customerContext, agentResponse }: { 
      entryId: string; 
      categoryId?: string;
      tags?: string[];
      customerContext?: string;
      agentResponse?: string;
    }) => {
      const entry = pendingEntries?.find(e => e.id === entryId);
      if (!entry) throw new Error('Entry not found');

      const finalCustomerContext = customerContext || entry.customer_context;
      const finalAgentResponse = agentResponse || entry.agent_response;

      // Create embedding for the entry
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('create-embedding', {
        body: { text: `${finalCustomerContext}\n\n${finalAgentResponse}` }
      });

      if (embeddingError) {
        console.warn('Failed to create embedding:', embeddingError);
      }

      // Insert into knowledge_entries
      const { error: insertError } = await supabase
        .from('knowledge_entries')
        .insert({
          organization_id: organizationId,
          customer_context: finalCustomerContext,
          agent_response: finalAgentResponse,
          category: categoryId || null,
          tags: tags && tags.length > 0 ? tags : null,
          embedding: embeddingData?.embedding ? JSON.stringify(embeddingData.embedding) : null,
          quality_score: entry.ai_quality_score || 3.0,
          is_manually_curated: true,
          created_from_message_id: entry.source_message_id,
        });

      if (insertError) throw insertError;

      // Mark pending entry as approved
      const { error: updateError } = await supabase
        .from('knowledge_pending_entries')
        .update({ 
          review_status: customerContext || agentResponse ? 'edited' : 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Entry Approved",
        description: "Entry has been added to the knowledge base.",
      });
      setEditingEntry(null);
      queryClient.invalidateQueries({ queryKey: ['knowledge-pending-entries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-entries', organizationId] });
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve entry",
        variant: "destructive",
      });
    },
  });

  // Reject entry mutation
  const rejectEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('knowledge_pending_entries')
        .update({ 
          review_status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Entry Skipped",
        description: "Entry has been removed from the review queue.",
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-pending-entries', organizationId] });
    },
  });

  // Bulk approve high-quality entries
  const bulkApproveMutation = useMutation({
    mutationFn: async (minScore: number) => {
      const highQualityEntries = pendingEntries?.filter(
        e => e.ai_quality_score !== null && e.ai_quality_score >= minScore
      ) || [];

      for (const entry of highQualityEntries) {
        await approveEntryMutation.mutateAsync({ 
          entryId: entry.id,
        });
      }

      return { approved: highQualityEntries.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Approval Complete",
        description: `${data.approved} entries have been added to the knowledge base.`,
      });
    },
  });

  const progressPercentage = latestJob 
    ? Math.round((latestJob.total_processed / Math.max(latestJob.total_conversations, 1)) * 100)
    : 0;

  const startEditing = (entry: PendingEntry) => {
    setEditingEntry(entry.id);
    setEditedContent({
      customer: entry.customer_context,
      agent: entry.agent_response,
    });
  };

  const renderQualityStars = (score: number | null) => {
    if (score === null) return <span className="text-muted-foreground text-sm">No score</span>;
    const stars = Math.round(score);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({score.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Extraction Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Import from Conversation History
          </CardTitle>
          <CardDescription>
            Extract Q&A pairs from closed HelpScout conversations to build your knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => startExtractionMutation.mutate()}
              disabled={isExtracting || latestJob?.status === 'running'}
            >
              {isExtracting || latestJob?.status === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Extraction
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['knowledge-extraction-job', organizationId] });
                queryClient.invalidateQueries({ queryKey: ['knowledge-pending-entries', organizationId] });
                queryClient.invalidateQueries({ queryKey: ['knowledge-tags', organizationId] });
                queryClient.invalidateQueries({ queryKey: ['knowledge-categories', organizationId] });
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {latestJob && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Progress: {latestJob.total_processed} / {latestJob.total_conversations} conversations
                </span>
                <Badge variant={latestJob.status === 'completed' ? 'default' : 'secondary'}>
                  {latestJob.status}
                </Badge>
              </div>
              <Progress value={progressPercentage} />
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Created: {latestJob.entries_created}</span>
                <span>Skipped: {latestJob.entries_skipped}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Review Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>
                {pendingEntries?.length || 0} entries awaiting review
              </CardDescription>
            </div>
            {pendingEntries && pendingEntries.length > 0 && (
              <Button
                variant="outline"
                onClick={() => bulkApproveMutation.mutate(4.0)}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCheck className="w-4 h-4" />
                Bulk Approve (Score ≥ 4.0)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pendingEntries || pendingEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending entries to review.</p>
              <p className="text-sm">Start an extraction to import Q&A pairs from your conversations.</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {pendingEntries.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="pt-4 space-y-4">
                      {/* Customer Context */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <User className="w-4 h-4" />
                          Customer
                        </div>
                        {editingEntry === entry.id ? (
                          <Textarea
                            value={editedContent.customer}
                            onChange={(e) => setEditedContent(prev => ({ ...prev, customer: e.target.value }))}
                            className="min-h-[80px]"
                          />
                        ) : (
                          <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                            {entry.customer_context}
                          </p>
                        )}
                      </div>

                      {/* Agent Response */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <MessageSquare className="w-4 h-4" />
                          Agent Response
                        </div>
                        {editingEntry === entry.id ? (
                          <Textarea
                            value={editedContent.agent}
                            onChange={(e) => setEditedContent(prev => ({ ...prev, agent: e.target.value }))}
                            className="min-h-[120px]"
                          />
                        ) : (
                          <p className="text-sm bg-primary/5 p-3 rounded-md whitespace-pre-wrap">
                            {entry.agent_response}
                          </p>
                        )}
                      </div>

                      {/* Quality Score, Category & Tags */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center flex-wrap gap-4">
                          {renderQualityStars(entry.ai_quality_score)}
                          
                          <Select
                            value={selectedCategories[entry.id] ?? entry.suggested_category_id ?? 'none'}
                            onValueChange={(value) => {
                              setSelectedCategories(prev => ({
                                ...prev,
                                [entry.id]: value
                              }));
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No category</SelectItem>
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <div className="w-[280px]">
                            <TagMultiSelect
                              organizationId={organizationId}
                              selectedTags={selectedTags[entry.id] ?? entry.suggested_tags ?? []}
                              onChange={(tags) => {
                                setSelectedTags(prev => ({
                                  ...prev,
                                  [entry.id]: tags
                                }));
                              }}
                              placeholder="Select tags..."
                              selectedCategoryId={
                                selectedCategories[entry.id] !== 'none' 
                                  ? selectedCategories[entry.id] 
                                  : entry.suggested_category_id
                              }
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {editingEntry === entry.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveEntryMutation.mutate({
                                  entryId: entry.id,
                                  categoryId: selectedCategories[entry.id] !== 'none' ? selectedCategories[entry.id] : undefined,
                                  tags: selectedTags[entry.id] ?? entry.suggested_tags ?? [],
                                  customerContext: editedContent.customer,
                                  agentResponse: editedContent.agent,
                                })}
                                disabled={approveEntryMutation.isPending}
                              >
                                <Check className="w-4 h-4" />
                                Save & Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingEntry(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveEntryMutation.mutate({ 
                                  entryId: entry.id,
                                  categoryId: selectedCategories[entry.id] !== 'none' ? selectedCategories[entry.id] : undefined,
                                  tags: selectedTags[entry.id] ?? entry.suggested_tags ?? [],
                                })}
                                disabled={approveEntryMutation.isPending}
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(entry)}
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => rejectEntryMutation.mutate(entry.id)}
                                disabled={rejectEntryMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                                Skip
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
