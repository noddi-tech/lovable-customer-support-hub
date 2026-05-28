import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MissingField {
  field_id: string;
  field_name: string;
  field_type: string;
  requirement_type: 'required' | 'optional';
  block_stage_progression: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const { application_id, target_stage_id } = await req.json();
    if (!application_id || !target_stage_id) {
      return new Response(JSON.stringify({ error: 'application_id and target_stage_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: app } = await admin
      .from('applications')
      .select('id, organization_id, applicant_id, position_id, job_positions!inner(pipeline_id)')
      .eq('id', application_id)
      .maybeSingle();
    if (!app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pipelineId = (app as any).job_positions.pipeline_id as string;

    // Org membership check
    const { data: membership } = await admin
      .from('organization_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', app.organization_id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve requirements (position-specific overrides org-wide)
    const { data: reqRows } = await admin
      .from('pipeline_stage_field_requirements')
      .select('id, custom_field_id, position_id, requirement_type, block_stage_progression, recruitment_custom_fields!inner(display_name, type_id, recruitment_custom_field_types(type_key))')
      .eq('pipeline_id', pipelineId)
      .eq('stage_id', target_stage_id)
      .or(`position_id.is.null,position_id.eq.${app.position_id}`);

    const merged = new Map<string, any>();
    for (const r of (reqRows as any[]) || []) {
      const existing = merged.get(r.custom_field_id);
      // Position-specific wins
      if (!existing || (r.position_id !== null && existing.position_id === null)) {
        merged.set(r.custom_field_id, r);
      }
    }

    const fieldIds = Array.from(merged.keys());
    let valuesByField = new Map<string, any>();
    if (fieldIds.length > 0) {
      const { data: values } = await admin
        .from('recruitment_applicant_field_values')
        .select('field_id, value, raw_value')
        .eq('applicant_id', app.applicant_id)
        .in('field_id', fieldIds);
      for (const v of (values as any[]) || []) {
        valuesByField.set(v.field_id, v);
      }
    }

    const isEmpty = (v: any) => {
      if (v == null) return true;
      const value = v.value ?? v.raw_value;
      if (value == null) return true;
      if (typeof value === 'string') return value.trim().length === 0;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    };

    const missing_required: MissingField[] = [];
    const missing_optional: MissingField[] = [];

    for (const r of merged.values()) {
      const v = valuesByField.get(r.custom_field_id);
      if (!isEmpty(v)) continue;
      const field: MissingField = {
        field_id: r.custom_field_id,
        field_name: r.recruitment_custom_fields?.display_name || 'felt',
        field_type: r.recruitment_custom_fields?.recruitment_custom_field_types?.type_key || 'text',
        requirement_type: r.requirement_type,
        block_stage_progression: r.block_stage_progression,
      };
      if (r.requirement_type === 'required' && r.block_stage_progression) {
        missing_required.push(field);
      } else {
        missing_optional.push(field);
      }
    }

    // Check admin role for can_override
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();
    const can_override = !!roleRow;

    return new Response(
      JSON.stringify({
        can_progress: missing_required.length === 0,
        missing_required,
        missing_optional,
        can_override,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[validate-stage-progression] error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
