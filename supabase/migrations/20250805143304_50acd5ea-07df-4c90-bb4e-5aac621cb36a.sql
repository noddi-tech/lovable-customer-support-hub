-- Add RLS policies to allow users to update and delete messages in their organization conversations
CREATE POLICY "Users can update messages in their organization conversations" 
ON messages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = messages.conversation_id 
  AND conversations.organization_id = get_user_organization_id()
));

CREATE POLICY "Users can delete messages in their organization conversations" 
ON messages 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = messages.conversation_id 
  AND conversations.organization_id = get_user_organization_id()
));