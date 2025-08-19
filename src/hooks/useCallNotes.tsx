import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CallNote {
  id: string;
  call_id: string;
  organization_id: string;
  created_by_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useCallNotes(callId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user's organization
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      return { ...user, organization_id: profile?.organization_id };
    },
  });

  // Fetch notes for a specific call
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['call-notes', callId],
    queryFn: async () => {
      if (!callId) return [];
      
      console.log('🔍 Fetching notes for call:', callId);
      
      const { data, error } = await supabase
        .from('call_notes')
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('call_id', callId)
        .order('created_at', { ascending: false });

      console.log('📝 Call notes query result:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Error fetching call notes:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!callId,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async ({ callId, content, isPrivate = false }: { 
      callId: string; 
      content: string; 
      isPrivate?: boolean;
    }) => {
      if (!currentUser?.organization_id) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase
        .from('call_notes')
        .insert([{
          call_id: callId,
          organization_id: currentUser.organization_id,
          created_by_id: currentUser.id,
          content: content.trim(),
          is_private: isPrivate
        }])
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Note added",
        description: "Call note has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['call-notes', data.call_id] });
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast({
        title: "Failed to add note",
        description: "Could not save the call note",
        variant: "destructive"
      });
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content, isPrivate }: { 
      noteId: string; 
      content: string; 
      isPrivate?: boolean;
    }) => {
      const updateData: any = { content: content.trim() };
      if (isPrivate !== undefined) {
        updateData.is_private = isPrivate;
      }

      const { data, error } = await supabase
        .from('call_notes')
        .update(updateData)
        .eq('id', noteId)
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Note updated",
        description: "Call note has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['call-notes', data.call_id] });
    },
    onError: (error) => {
      console.error('Error updating note:', error);
      toast({
        title: "Failed to update note",
        description: "Could not update the call note",
        variant: "destructive"
      });
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('call_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Note deleted",
        description: "Call note has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['call-notes'] });
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast({
        title: "Failed to delete note",
        description: "Could not delete the call note",
        variant: "destructive"
      });
    }
  });

  // Set up real-time subscription for call notes
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call-notes-${callId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'call_notes',
        filter: `call_id=eq.${callId}`
      }, (payload) => {
        console.log('Call note change received:', payload);
        queryClient.invalidateQueries({ queryKey: ['call-notes', callId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, queryClient]);

  const canEditNoteFunc = (note: CallNote) => {
    return currentUser?.id === note.created_by_id;
  };

  return {
    notes,
    isLoading,
    error,
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    canEditNote: canEditNoteFunc,
  };
}