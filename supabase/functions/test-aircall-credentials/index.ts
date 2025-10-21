const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCredentialsRequest {
  apiId: string;
  apiToken: string;
}

interface AircallCompanyResponse {
  company: {
    id: number;
    name: string;
    available: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiId, apiToken }: TestCredentialsRequest = await req.json();

    if (!apiId || !apiToken) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Missing apiId or apiToken',
          status: 400 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(`${apiId}:${apiToken}`)}`;

    console.log('Testing Aircall credentials...');

    // Make request to Aircall API
    const response = await fetch('https://api.aircall.io/v1/company', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    
    if (response.ok) {
      const data: AircallCompanyResponse = await response.json();
      console.log('Credentials valid, company:', data.company.name);
      
      return new Response(
        JSON.stringify({
          valid: true,
          company: data.company,
          status: status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.error('Aircall API error:', status, await response.text());
      
      return new Response(
        JSON.stringify({
          valid: false,
          error: status === 401 ? 'Invalid credentials' : 'API error',
          status: status,
        }),
        {
          status: status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in test-aircall-credentials function:', error);
    
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message,
        status: 500 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
