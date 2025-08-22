-- Create efficient function to get all counts at once
CREATE OR REPLACE FUNCTION get_all_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}';
    conversations_data jsonb;
    channels_data jsonb;
    notifications_count integer;
    inboxes_data jsonb;
BEGIN
    -- Get conversation counts
    WITH conversation_stats AS (
        SELECT 
            COUNT(*) as all_count,
            COUNT(*) FILTER (WHERE NOT is_read) as unread_count,
            COUNT(*) FILTER (WHERE assigned_to_id IS NOT NULL) as assigned_count,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
            COUNT(*) FILTER (WHERE is_archived) as archived_count
        FROM conversations 
        WHERE organization_id = get_user_organization_id()
            AND (has_permission(auth.uid(), 'view_all_conversations'::app_permission) 
                OR department_id IS NULL 
                OR department_id = get_user_department_id())
    )
    SELECT jsonb_build_object(
        'all', all_count,
        'unread', unread_count,
        'assigned', assigned_count,
        'pending', pending_count,
        'closed', closed_count,
        'archived', archived_count
    ) INTO conversations_data FROM conversation_stats;

    -- Get channel counts
    WITH channel_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE channel = 'email') as email_count,
            COUNT(*) FILTER (WHERE channel = 'facebook') as facebook_count,
            COUNT(*) FILTER (WHERE channel = 'instagram') as instagram_count,
            COUNT(*) FILTER (WHERE channel = 'whatsapp') as whatsapp_count
        FROM conversations 
        WHERE organization_id = get_user_organization_id()
            AND (has_permission(auth.uid(), 'view_all_conversations'::app_permission) 
                OR department_id IS NULL 
                OR department_id = get_user_department_id())
    )
    SELECT jsonb_build_object(
        'email', email_count,
        'facebook', facebook_count,
        'instagram', instagram_count,
        'whatsapp', whatsapp_count
    ) INTO channels_data FROM channel_stats;

    -- Get notification count
    SELECT COUNT(*) INTO notifications_count
    FROM notifications 
    WHERE user_id = auth.uid() AND NOT is_read;

    -- Get inbox data with counts
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'color', color,
            'conversation_count', (
                SELECT COUNT(*) 
                FROM conversations c 
                WHERE c.inbox_id = i.id 
                    AND c.organization_id = get_user_organization_id()
                    AND (has_permission(auth.uid(), 'view_all_conversations'::app_permission) 
                        OR c.department_id IS NULL 
                        OR c.department_id = get_user_department_id())
            ),
            'is_active', is_active
        )
    ) INTO inboxes_data
    FROM inboxes i
    WHERE i.organization_id = get_user_organization_id()
        AND (has_permission(auth.uid(), 'manage_settings'::app_permission) 
            OR i.department_id IS NULL 
            OR i.department_id = get_user_department_id());

    -- Build final result
    result := jsonb_build_object(
        'conversations', conversations_data,
        'channels', channels_data,
        'notifications', notifications_count,
        'inboxes', COALESCE(inboxes_data, '[]'::jsonb)
    );

    RETURN result;
END;
$$;

-- Enable realtime on notifications table
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;