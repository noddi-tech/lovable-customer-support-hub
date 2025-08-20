-- Create the missing voicemail internal event for the recent call
INSERT INTO internal_events (
    organization_id,
    event_type,
    call_id,
    customer_phone,
    event_data,
    triggered_by_event_id,
    status
)
SELECT 
    c.organization_id,
    'voicemail_left',
    c.id,
    c.customer_phone,
    jsonb_build_object(
        'call_uuid', c.enriched_details->>'call_uuid',
        'duration', c.duration_seconds,
        'recording_url', c.metadata->'originalPayload'->>'voicemail'
    ),
    ce.id,
    'pending'
FROM calls c
JOIN call_events ce ON c.id = ce.call_id
WHERE c.external_id = '3049915377' 
AND ce.event_data->>'webhookEvent' = 'call.voicemail_left'
AND NOT EXISTS (
    SELECT 1 FROM internal_events ie 
    WHERE ie.call_id = c.id AND ie.event_type = 'voicemail_left'
);