import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the attachment ID from the URL
    const url = new URL(req.url)
    const attachmentId = url.pathname.split('/').pop()
    const messageId = url.searchParams.get('messageId')

    if (!attachmentId) {
      return new Response('Attachment ID required', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // For now, return a placeholder image since we don't have attachment storage implemented
    // In a real implementation, you would:
    // 1. Query the database for attachment metadata
    // 2. Fetch the attachment from Gmail API or storage
    // 3. Return the actual file content

    const placeholderSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <rect width="300" height="200" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
        <circle cx="150" cy="80" r="20" fill="#9ca3af"/>
        <rect x="120" y="110" width="60" height="40" rx="4" fill="#9ca3af"/>
        <text x="150" y="170" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Arial, sans-serif">
          Image Loading...
        </text>
      </svg>
    `

    return new Response(placeholderSvg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error in get-attachment function:', error)
    
    // Return error placeholder
    const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <rect width="300" height="200" fill="#fef2f2" stroke="#fecaca" stroke-width="2"/>
        <text x="150" y="100" text-anchor="middle" fill="#dc2626" font-size="12" font-family="Arial, sans-serif">
          Image unavailable
        </text>
      </svg>
    `

    return new Response(errorSvg, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml'
      }
    })
  }
})