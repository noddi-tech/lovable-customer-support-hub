// Messente provider implementation (Omnichannel API).
// Docs: https://messente.com/documentation/omnimessage-api
import type {
  SmsInboundMessage,
  SmsProvider,
  SmsSendArgs,
  SmsSendResult,
  SmsStatus,
  SmsStatusUpdate,
} from './types.ts';

const MESSENTE_STATUS_MAP: Record<string, SmsStatus> = {
  SENT: 'sent',
  DELIVRD: 'delivered',
  FAILED: 'failed',
  REJECTED: 'undelivered',
  EXPIRED: 'undelivered',
  ACCEPTED: 'queued',
  UNKNOWN: 'sending',
};

function getCreds(): { username: string; password: string } {
  const username = Deno.env.get('MESSENTE_API_USERNAME');
  const password = Deno.env.get('MESSENTE_API_PASSWORD');
  if (!username || !password) {
    throw new Error('MESSENTE_API_USERNAME / MESSENTE_API_PASSWORD not configured');
  }
  return { username, password };
}

export function messenteProvider(): SmsProvider {
  return {
    name: 'messente',

    async send(args: SmsSendArgs): Promise<SmsSendResult> {
      const { username, password } = getCreds();
      const auth = btoa(`${username}:${password}`);

      const payload: Record<string, unknown> = {
        to: args.toPhone,
        messages: [
          {
            channel: 'sms',
            sender: args.fromSender,
            text: args.body,
          },
        ],
      };
      if (args.dlrUrl) payload.dlr_url = args.dlrUrl;

      let res: Response;
      try {
        res = await fetch('https://api.messente.com/v1/omnimessage', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        return { ok: false, errorMessage: `Network error: ${(e as Error).message}` };
      }

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // non-json error body
      }

      if (!res.ok) {
        const err = data?.errors?.[0];
        return {
          ok: false,
          errorCode: err?.code ? String(err.code) : String(res.status),
          errorMessage: err?.title || err?.detail || text || `HTTP ${res.status}`,
        };
      }

      const msg = data?.messages?.[0];
      return {
        ok: true,
        providerMessageId: msg?.message_id || data?.omnimessage_id,
      };
    },

    // Messente signs DLR / inbound webhooks via X-Service-Signature (HMAC-SHA256
    // of the raw body using the API password as the secret key).
    // Reference: https://support.messente.com/hc/en-us/articles/360011827299
    // We accept a couple of header name variants defensively.
    async validateInboundSignature(req: Request, body: string): Promise<void> {
      await validateMessenteSignature(req, body);
    },

    async validateStatusSignature(req: Request, body: string): Promise<void> {
      await validateMessenteSignature(req, body);
    },

    parseInbound(body: unknown): SmsInboundMessage {
      const b = body as Record<string, any>;
      const fromPhone = b.from || b.sender || '';
      const toPhone = b.to || b.recipient || '';
      const text = b.text || b.message || '';
      const messageId = b.message_id || b.messageId || b.id || crypto.randomUUID();
      if (!fromPhone || !toPhone || !text) {
        throw new Error('Inbound payload missing required fields (from/to/text)');
      }
      return {
        providerMessageId: String(messageId),
        fromPhone: String(fromPhone),
        toPhone: String(toPhone),
        body: String(text),
        segments: 1,
        receivedAt: new Date().toISOString(),
      };
    },

    parseStatusUpdate(body: unknown): SmsStatusUpdate {
      const b = body as Record<string, any>;
      const messageId = b.message_id || b.messageId || b.id;
      if (!messageId) throw new Error('Status payload missing message_id');
      const rawStatus = String(b.status || 'UNKNOWN').toUpperCase();
      const status = MESSENTE_STATUS_MAP[rawStatus] ?? 'sending';
      return {
        providerMessageId: String(messageId),
        status,
        errorCode: b.err ? String(b.err) : undefined,
        errorMessage: b.error || b.error_message || undefined,
        timestamp: b.timestamp || new Date().toISOString(),
        segments: b.price_info?.parts_count
          ? Number(b.price_info.parts_count)
          : undefined,
      };
    },

    buildDlrUrl(baseAppUrl: string): string {
      return `${baseAppUrl.replace(/\/$/, '')}/functions/v1/sms-status-callback/messente`;
    },
  };
}

async function validateMessenteSignature(req: Request, body: string): Promise<void> {
  const provided =
    req.headers.get('x-service-signature') ||
    req.headers.get('X-Service-Signature') ||
    req.headers.get('x-messente-signature');

  // If Messente is configured WITHOUT signing, we still want to accept (legacy
  // accounts). Treat absence as a soft-pass but log so admins can lock it down.
  if (!provided) {
    console.warn('[messente] inbound webhook missing signature header — accepting (configure signing in dashboard)');
    return;
  }

  const { password } = getCreds();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  );
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (provided.toLowerCase() !== expected.toLowerCase()) {
    throw new Error('Invalid Messente webhook signature');
  }
}
