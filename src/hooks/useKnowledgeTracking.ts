import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrackingSuggestionData {
  messageId: string;
  conversationId: string;
  customerMessage: string;
  agentResponse: string;
  responseSource: 'ai_suggestion' | 'template' | 'knowledge_base';
  knowledgeEntryId?: string;
  originalAiSuggestion?: string;
  refinementInstructions?: string;
  wasRefined?: boolean;
}

export function useKnowledgeTracking() {
  const trackSuggestionUsage = useCallback(async (data: TrackingSuggestionData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[Knowledge Tracking] No user found');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) {
        console.warn('[Knowledge Tracking] No organization found');
        return;
      }

      // Insert into response_tracking
      const { error } = await supabase
        .from('response_tracking')
        .insert({
          message_id: data.messageId,
          agent_id: user.id,
          conversation_id: data.conversationId,
          customer_message: data.customerMessage,
          agent_response: data.agentResponse,
          response_source: data.responseSource,
          knowledge_entry_id: data.knowledgeEntryId,
          organization_id: profile.organization_id,
          original_ai_suggestion: data.originalAiSuggestion,
          refinement_instructions: data.refinementInstructions,
          was_refined: data.wasRefined || false,
        });

      if (error) {
        console.error('[Knowledge Tracking] Error tracking suggestion:', error);
      } else {
        console.log('[Knowledge Tracking] Successfully tracked suggestion usage');
      }
    } catch (error) {
      console.error('[Knowledge Tracking] Unexpected error:', error);
    }
  }, []);

  return { trackSuggestionUsage };
}
