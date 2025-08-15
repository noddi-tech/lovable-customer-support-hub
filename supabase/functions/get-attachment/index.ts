import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🖼️ Get-attachment function called:', new Date().toISOString())
  
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

    console.log('📎 Requested attachment:', { attachmentId, messageId })

    if (!attachmentId) {
      return new Response('Attachment ID required', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Query the database for the message and its attachments
    let { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .select('attachments, external_id')
      .eq('id', messageId)
      .single()

    if (messageError) {
      console.error('❌ Error fetching message:', messageError)
      // Try to find by external_id if direct ID lookup fails
      const { data: messageByExtId, error: extError } = await supabaseClient
        .from('messages')
        .select('attachments, external_id')
        .eq('external_id', messageId)
        .single()
      
      if (extError) {
        console.error('❌ Error fetching message by external_id:', extError)
        return new Response('Message not found', { 
          status: 404, 
          headers: corsHeaders 
        })
      }
      message = messageByExtId
    }

    console.log('📧 Found message:', { 
      externalId: message?.external_id, 
      attachmentsCount: Array.isArray(message?.attachments) ? message.attachments.length : 0 
    })

    // Find the specific attachment
    const attachments = Array.isArray(message?.attachments) ? message.attachments : []
    const attachment = attachments.find((att: any) => att.attachmentId === attachmentId)

    if (!attachment) {
      console.warn('📎 Attachment not found in message:', { attachmentId, availableAttachments: attachments.map((a: any) => a.attachmentId) })
      
      // Return a placeholder for missing attachments
      const notFoundSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
          <rect width="300" height="200" fill="#fef2f2" stroke="#fecaca" stroke-width="2" rx="8"/>
          <circle cx="150" cy="80" r="25" fill="#f87171" opacity="0.6"/>
          <text x="150" y="87" text-anchor="middle" fill="white" font-size="24" font-weight="bold">!</text>
          <text x="150" y="130" text-anchor="middle" fill="#dc2626" font-size="14" font-family="Arial, sans-serif">
            Image Not Found
          </text>
          <text x="150" y="150" text-anchor="middle" fill="#7f1d1d" font-size="12" font-family="Arial, sans-serif">
            ID: ${attachmentId.slice(0, 20)}...
          </text>
        </svg>
      `

      return new Response(notFoundSvg, {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      })
    }

    console.log('🎯 Found attachment:', { 
      filename: attachment.filename, 
      mimeType: attachment.mimeType,
      size: attachment.size,
      isInline: attachment.isInline
    })

    // For now, return a better placeholder that shows we found the attachment
    // TODO: Implement actual Gmail API download and storage
    const foundSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e0f2fe;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#bae6fd;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#bg)" stroke="#0ea5e9" stroke-width="2" rx="12"/>
        <circle cx="200" cy="120" r="35" fill="#0ea5e9" opacity="0.8"/>
        <text x="200" y="130" text-anchor="middle" fill="white" font-size="28" font-weight="bold">📷</text>
        <text x="200" y="180" text-anchor="middle" fill="#0369a1" font-size="16" font-family="Arial, sans-serif" font-weight="bold">
          ${attachment.filename || 'Attachment Found'}
        </text>
        <text x="200" y="205" text-anchor="middle" fill="#075985" font-size="13" font-family="Arial, sans-serif">
          ${attachment.mimeType || 'Unknown type'} • ${Math.round((attachment.size || 0) / 1024)}KB
        </text>
        <text x="200" y="230" text-anchor="middle" fill="#0c4a6e" font-size="11" font-family="Arial, sans-serif">
          Gmail attachment loading...
        </text>
        <text x="200" y="250" text-anchor="middle" fill="#64748b" font-size="10" font-family="Arial, sans-serif">
          ID: ${attachmentId.slice(0, 30)}${attachmentId.length > 30 ? '...' : ''}
        </text>
      </svg>
    `

    return new Response(foundSvg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    })

  } catch (error) {
    console.error('❌ Error in get-attachment function:', error)
    
    // Return error placeholder
    const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <rect width="300" height="200" fill="#fef2f2" stroke="#fecaca" stroke-width="2" rx="8"/>
        <circle cx="150" cy="80" r="25" fill="#ef4444"/>
        <text x="150" y="87" text-anchor="middle" fill="white" font-size="20" font-weight="bold">✕</text>
        <text x="150" y="130" text-anchor="middle" fill="#dc2626" font-size="14" font-family="Arial, sans-serif">
          Loading Error
        </text>
        <text x="150" y="150" text-anchor="middle" fill="#7f1d1d" font-size="11" font-family="Arial, sans-serif">
          ${error.message.slice(0, 40)}...
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