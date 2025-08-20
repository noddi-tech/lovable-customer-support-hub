-- Make voicemails bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'voicemails';

-- Create missing policy for service role uploads (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can manage voicemails'
  ) THEN
    CREATE POLICY "Service role can manage voicemails" 
    ON storage.objects 
    FOR ALL 
    USING (bucket_id = 'voicemails');
  END IF;
END $$;