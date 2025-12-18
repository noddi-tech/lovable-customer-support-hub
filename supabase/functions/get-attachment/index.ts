import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    const url = new URL(req.url)
    
    // Check for storageKey parameter (new method for Supabase Storage)
    const storageKey = url.searchParams.get('key')
    // Check for CID parameter (Content-ID lookup)
    const cidParam = url.searchParams.get('cid')
    const messageIdParam = url.searchParams.get('messageId')
    
    if (storageKey) {
      console.log('📦 Fetching from Supabase Storage:', storageKey)
      
      const { data, error } = await supabaseClient.storage
        .from('message-attachments')
        .download(storageKey)
      
      if (error) {
        console.error('❌ Storage download error:', error)
        return new Response(createNotFoundSvg(storageKey), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
        })
      }
      
      // Determine content type from file extension
      const extension = storageKey.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
      }
      const contentType = mimeTypes[extension || ''] || data.type || 'application/octet-stream'
      
      console.log('✅ Serving from storage:', { storageKey, contentType, size: data.size })
      
      return new Response(data, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }
    
    // Handle CID parameter - lookup attachment by Content-ID
    // Return clear error if CID provided but messageId is missing/empty
    if (cidParam && (!messageIdParam || messageIdParam.trim() === '')) {
      console.warn('⚠️ CID lookup requested but messageId is missing or empty:', { cid: cidParam, messageId: messageIdParam })
      return new Response(createNotFoundSvg('messageId-required'), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
      })
    }
    
    // Ensure messageIdParam is not empty (not just present but actually has content)
    if (cidParam && messageIdParam && messageIdParam.trim() !== '') {
      console.log('🔍 Looking up attachment by CID:', { cid: cidParam, messageId: messageIdParam })
      
      // Query the message to find the attachment by contentId
      let { data: message, error: messageError } = await supabaseClient
        .from('messages')
        .select('attachments')
        .eq('id', messageIdParam)
        .single()
      
      if (messageError) {
        // Try by external_id
        const { data: msgByExt, error: extError } = await supabaseClient
          .from('messages')
          .select('attachments')
          .eq('external_id', messageIdParam)
          .single()
        
        if (extError) {
          console.error('❌ Message not found for CID lookup:', messageIdParam)
          return new Response(createNotFoundSvg(cidParam), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
          })
        }
        message = msgByExt
      }
      
      const attachments = Array.isArray(message?.attachments) ? message.attachments : []
      const normalizedCidSearch = cidParam.replace(/[<>]/g, '').toLowerCase()
      
      const attachment = attachments.find((att: any) => {
        const normalizedCid = att.contentId?.replace(/[<>]/g, '').toLowerCase()
        return normalizedCid === normalizedCidSearch
      })
      
      if (!attachment) {
        console.warn('📎 CID attachment not found:', { 
          cidParam, 
          availableCids: attachments.map((a: any) => a.contentId) 
        })
        return new Response(createNotFoundSvg(cidParam), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
        })
      }
      
      console.log('🎯 Found attachment by CID:', { 
        filename: attachment.filename, 
        storageKey: attachment.storageKey,
        hasData: !!attachment.data
      })
      
      // If attachment has storageKey, fetch from storage
      if (attachment.storageKey) {
        const { data, error } = await supabaseClient.storage
          .from('message-attachments')
          .download(attachment.storageKey)
        
        if (error) {
          console.error('❌ Storage download error for CID attachment:', error)
          return new Response(createUploadFailedSvg(attachment), {
            headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
          })
        }
        
        return new Response(data, {
          headers: {
            ...corsHeaders,
            'Content-Type': attachment.mimeType || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${attachment.filename || 'attachment'}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      
      // If attachment has inline data, serve it
      if (attachment.data) {
        try {
          const base64Data = attachment.data.replace(/-/g, '+').replace(/_/g, '/')
          const binaryData = atob(base64Data)
          const bytes = new Uint8Array(binaryData.length)
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i)
          }
          
          return new Response(bytes, {
            headers: {
              ...corsHeaders,
              'Content-Type': attachment.mimeType || 'application/octet-stream',
              'Content-Disposition': `inline; filename="${attachment.filename || 'attachment'}"`,
              'Cache-Control': 'public, max-age=3600'
            }
          })
        } catch (error) {
          console.error('❌ Error decoding CID attachment data:', error)
        }
      }
      
      // No storageKey and no data - upload failed
      console.warn('⚠️ Attachment has no storageKey or data (upload failed):', attachment.filename)
      return new Response(createUploadFailedSvg(attachment), {
        headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
      })
    }

    // Legacy: Get the attachment ID from the URL path
    const attachmentId = url.pathname.split('/').pop()
    const messageId = url.searchParams.get('messageId')

    console.log('📎 Requested attachment (legacy):', { attachmentId, messageId })

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

    // Find the specific attachment by attachmentId OR contentId
    const attachments = Array.isArray(message?.attachments) ? message.attachments : []
    let attachment = attachments.find((att: any) => att.attachmentId === attachmentId)
    
    // Also try matching by contentId (for CID references)
    if (!attachment) {
      attachment = attachments.find((att: any) => {
        const normalizedCid = att.contentId?.replace(/[<>]/g, '').toLowerCase()
        const normalizedSearch = attachmentId.replace(/[<>]/g, '').toLowerCase()
        return normalizedCid === normalizedSearch
      })
    }

    if (!attachment) {
      console.warn('📎 Attachment not found in message:', { 
        attachmentId, 
        availableAttachments: attachments.map((a: any) => ({ 
          attachmentId: a.attachmentId, 
          contentId: a.contentId,
          storageKey: a.storageKey 
        }))
      })
      
      return new Response(createNotFoundSvg(attachmentId), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' }
      })
    }

    console.log('🎯 Found attachment:', { 
      filename: attachment.filename, 
      mimeType: attachment.mimeType,
      size: attachment.size,
      isInline: attachment.isInline,
      storageKey: attachment.storageKey,
      hasData: !!attachment.data
    })

    // NEW: If attachment has storageKey, fetch from Supabase Storage
    if (attachment.storageKey) {
      console.log('📦 Fetching attachment from storage:', attachment.storageKey)
      
      const { data, error } = await supabaseClient.storage
        .from('message-attachments')
        .download(attachment.storageKey)
      
      if (error) {
        console.error('❌ Storage download error:', error)
        return new Response(createStorageErrorSvg(attachment), {
          headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' }
        })
      }
      
      console.log('✅ Serving from storage:', { 
        filename: attachment.filename,
        size: data.size,
        mimeType: attachment.mimeType 
      })
      
      return new Response(data, {
        headers: {
          ...corsHeaders,
          'Content-Type': attachment.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.filename || 'attachment'}"`,
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

    // Legacy: If we have the attachment data inline, serve it directly
    if (attachment.data) {
      try {
        // Decode base64url data
        const base64Data = attachment.data.replace(/-/g, '+').replace(/_/g, '/')
        const binaryData = atob(base64Data)
        const bytes = new Uint8Array(binaryData.length)
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i)
        }

        console.log('📎 Serving inline attachment data:', { 
          filename: attachment.filename,
          size: bytes.length,
          mimeType: attachment.mimeType 
        })

        return new Response(bytes, {
          headers: {
            ...corsHeaders,
            'Content-Type': attachment.mimeType || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${attachment.filename || 'attachment'}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        })
      } catch (error) {
        console.error('❌ Error decoding attachment data:', error)
      }
    }

    // Fallback: return placeholder if no data available
    return new Response(createStorageErrorSvg(attachment), {
      headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' }
    })

  } catch (error) {
    console.error('❌ Error in get-attachment function:', error)
    
    const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <rect width="300" height="200" fill="#fef2f2" stroke="#fecaca" stroke-width="2" rx="8"/>
        <circle cx="150" cy="80" r="25" fill="#ef4444"/>
        <text x="150" y="87" text-anchor="middle" fill="white" font-size="20" font-weight="bold">✕</text>
        <text x="150" y="130" text-anchor="middle" fill="#dc2626" font-size="14" font-family="Arial, sans-serif">
          Loading Error
        </text>
        <text x="150" y="150" text-anchor="middle" fill="#7f1d1d" font-size="11" font-family="Arial, sans-serif">
          ${error instanceof Error ? error.message.slice(0, 40) : String(error).slice(0, 40)}...
        </text>
      </svg>
    `

    return new Response(errorSvg, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' }
    })
  }
})

function createNotFoundSvg(id: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect width="300" height="200" fill="#fef2f2" stroke="#fecaca" stroke-width="2" rx="8"/>
      <circle cx="150" cy="80" r="25" fill="#f87171" opacity="0.6"/>
      <text x="150" y="87" text-anchor="middle" fill="white" font-size="24" font-weight="bold">!</text>
      <text x="150" y="130" text-anchor="middle" fill="#dc2626" font-size="14" font-family="Arial, sans-serif">
        Image Not Found
      </text>
      <text x="150" y="150" text-anchor="middle" fill="#7f1d1d" font-size="12" font-family="Arial, sans-serif">
        ID: ${id.slice(0, 20)}...
      </text>
    </svg>
  `
}

function createStorageErrorSvg(attachment: any): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#fef3c7;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#fde68a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bg)" stroke="#f59e0b" stroke-width="2" rx="12"/>
      <circle cx="200" cy="120" r="35" fill="#f59e0b" opacity="0.8"/>
      <text x="200" y="130" text-anchor="middle" fill="white" font-size="28" font-weight="bold">📎</text>
      <text x="200" y="180" text-anchor="middle" fill="#92400e" font-size="16" font-family="Arial, sans-serif" font-weight="bold">
        ${attachment.filename || 'Attachment'}
      </text>
      <text x="200" y="205" text-anchor="middle" fill="#78350f" font-size="13" font-family="Arial, sans-serif">
        ${attachment.mimeType || 'Unknown type'} • ${Math.round((attachment.size || 0) / 1024)}KB
      </text>
      <text x="200" y="230" text-anchor="middle" fill="#451a03" font-size="11" font-family="Arial, sans-serif">
        Content not available
      </text>
    </svg>
  `
}

function createUploadFailedSvg(attachment: any): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180">
      <rect width="300" height="180" fill="#fef2f2" stroke="#fecaca" stroke-width="2" rx="8"/>
      <circle cx="150" cy="60" r="25" fill="#ef4444" opacity="0.7"/>
      <text x="150" y="67" text-anchor="middle" fill="white" font-size="20" font-weight="bold">!</text>
      <text x="150" y="105" text-anchor="middle" fill="#dc2626" font-size="13" font-family="Arial, sans-serif" font-weight="bold">
        Image Upload Failed
      </text>
      <text x="150" y="125" text-anchor="middle" fill="#7f1d1d" font-size="11" font-family="Arial, sans-serif">
        ${(attachment.filename || 'Image').slice(0, 30)}
      </text>
      <text x="150" y="145" text-anchor="middle" fill="#991b1b" font-size="10" font-family="Arial, sans-serif">
        ${Math.round((attachment.size || 0) / 1024)}KB • Upload incomplete
      </text>
    </svg>
  `
}
