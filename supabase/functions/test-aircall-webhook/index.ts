import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Test webhook called:', req.method, req.url)
    
    // Test calling our main webhook with a sample payload
    const testPayload = {
      "event": "call.created",
      "data": {
        "id": 12345,
        "direction": "inbound",
        "status": "ringing",
        "started_at": Math.floor(Date.now() / 1000),
        "raw_digits": "+4795843336",
        "from": { "phone_number": "+4795843336" },
        "to": { "phone_number": "+46313088248" }
      },
      "timestamp": Math.floor(Date.now() / 1000)
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/call-events-webhook/aircall`
    console.log('Calling webhook URL:', webhookUrl)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify(testPayload)
    })

    const responseText = await response.text()
    console.log('Webhook response:', response.status, responseText)

    return new Response(
      JSON.stringify({
        success: true,
        webhookStatus: response.status,
        webhookResponse: responseText,
        testPayload
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})