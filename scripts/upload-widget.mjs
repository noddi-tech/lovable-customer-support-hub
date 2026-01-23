#!/usr/bin/env node

/**
 * Upload Widget to Supabase Storage
 * 
 * This script uploads the built widget.js bundle to Supabase Storage.
 * It's used by the GitHub Actions workflow to automatically deploy
 * the widget when source code changes.
 * 
 * Required environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const WIDGET_PATH = resolve(process.cwd(), 'dist/widget/widget.js');
const BUCKET_NAME = 'widget';
const FILE_NAME = 'widget.js';

async function main() {
  console.log('🚀 Starting widget upload...');
  
  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - SUPABASE_URL');
    if (!supabaseKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  // Check if widget file exists
  if (!existsSync(WIDGET_PATH)) {
    console.error(`❌ Widget file not found: ${WIDGET_PATH}`);
    console.error('   Run "npm run build:widget" first.');
    process.exit(1);
  }
  
  // Read widget file
  const widgetJs = readFileSync(WIDGET_PATH, 'utf-8');
  console.log(`📦 Widget size: ${(widgetJs.length / 1024).toFixed(2)} KB`);
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`📁 Creating bucket: ${BUCKET_NAME}`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['application/javascript', 'text/javascript'],
    });
    
    if (createError) {
      console.error('❌ Failed to create bucket:', createError.message);
      process.exit(1);
    }
  }
  
  // Upload widget
  console.log(`📤 Uploading to ${BUCKET_NAME}/${FILE_NAME}...`);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(FILE_NAME, widgetJs, {
      contentType: 'application/javascript',
      upsert: true,
      cacheControl: '3600',
    });
  
  if (uploadError) {
    console.error('❌ Upload failed:', uploadError.message);
    process.exit(1);
  }
  
  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(FILE_NAME);
  
  console.log('✅ Widget deployed successfully!');
  console.log(`🔗 URL: ${publicUrl.publicUrl}`);
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
