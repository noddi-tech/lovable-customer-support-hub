// Shared utilities for widget-ai-chat

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");

export function toOsloTime(utcIso: string): string {
  try {
    const d = new Date(utcIso);
    if (isNaN(d.getTime())) return utcIso;
    return d.toLocaleString('nb-NO', {
      timeZone: 'Europe/Oslo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return utcIso; }
}

export function extractPlateString(p: any): string {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.number || p.license_plate_number || '';
  return '';
}

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RequestBody {
  widgetKey: string;
  messages: AiMessage[];
  visitorPhone?: string;
  visitorEmail?: string;
  language?: string;
  test?: boolean;
  stream?: boolean;
  conversationId?: string;
  isVerified?: boolean;
}

// Simple in-memory rate limiter (per widget key, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

export function isRateLimited(widgetKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(widgetKey);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(widgetKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function saveErrorDetails(supabase: any, conversationId: string | null, errorType: string, details: string) {
  if (!conversationId) return;
  try {
    const { data: existing } = await supabase
      .from('widget_ai_conversations')
      .select('error_details')
      .eq('id', conversationId)
      .single();
    
    let errors: any[] = [];
    if (existing?.error_details) {
      try { errors = JSON.parse(existing.error_details); } catch { errors = []; }
    }
    errors.push({ type: errorType, detail: details, ts: new Date().toISOString() });
    
    await supabase
      .from('widget_ai_conversations')
      .update({ error_details: JSON.stringify(errors) })
      .eq('id', conversationId);
  } catch (e) { console.error('[saveErrorDetails] Failed:', e); }
}
