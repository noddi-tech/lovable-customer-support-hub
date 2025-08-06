-- Fix RLS policy for notifications to allow system-level inserts
-- First, allow the trigger function to insert notifications
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Also ensure users can insert their own notifications
CREATE POLICY "Users can insert their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());