// Lightweight SendGrid send helper used by recruitment email functions.
// IMPORTANT: This is intentionally NOT used by send-reply-email (the support flow).
// Keeping support and recruitment paths separate avoids regressions to the
// 99.9%-uptime customer support pipeline.

interface SendOutboundEmailArgs {
  toEmail: string;
  toName?: string | null;
  fromEmail: string;
  fromName: string;
  subject: string;
  html: string;
  text?: string | null;
  headers?: Record<string, string>;
  replyTo?: { email: string; name?: string };
}

export interface SendOutboundEmailResult {
  ok: boolean;
  status: number;
  messageIdHeader: string;
  errorText?: string;
}

export function buildMessageId(fromEmail: string): string {
  const domain = fromEmail.split('@')[1] || 'mail.local';
  const id = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
  return `<rec-${id}@${domain}>`;
}

export async function sendOutboundEmail(
  args: SendOutboundEmailArgs,
): Promise<SendOutboundEmailResult> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not configured');

  const messageIdHeader = args.headers?.['Message-ID'] || buildMessageId(args.fromEmail);

  const payload: any = {
    personalizations: [{
      to: [args.toName ? { email: args.toEmail, name: args.toName } : { email: args.toEmail }],
    }],
    from: { email: args.fromEmail, name: args.fromName },
    subject: args.subject,
    content: [
      // Memory rule: never include "; charset=utf-8" in content[].type — SendGrid 400.
      { type: 'text/plain', value: args.text || stripHtml(args.html) },
      { type: 'text/html', value: args.html },
    ],
    headers: { ...(args.headers || {}), 'Message-ID': messageIdHeader },
  };

  if (args.replyTo) payload.reply_to = args.replyTo;

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return { ok: false, status: res.status, messageIdHeader, errorText };
  }
  return { ok: true, status: res.status, messageIdHeader };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Substitute {{token}} in a template body. Unknown tokens left as-is.
export function substituteVars(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, t) => {
    const k = t.toLowerCase();
    return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : m;
  });
}

// Build a styled attachments block to append to the email body.
export function buildAttachmentsBlock(
  attachments: Array<{ filename: string; signed_url: string; expires_at: string }>,
): string {
  if (!attachments.length) return '';
  const formatExpiry = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };
  const items = attachments.map((a) => `
    <tr>
      <td style="padding:8px 0;">
        <a href="${a.signed_url}" style="color:#3B82F6; text-decoration:none; font-size:14px;">📎 ${escapeHtml(a.filename)}</a>
        <span style="color:#6B7280; font-size:12px; margin-left:6px;">(utløper ${formatExpiry(a.expires_at)})</span>
      </td>
    </tr>`).join('');
  return `
    <div style="margin-top:24px; padding-top:16px; border-top:1px solid #E5E7EB;">
      <div style="font-size:13px; color:#374151; font-weight:600; margin-bottom:8px;">📎 Vedlegg</div>
      <table style="width:100%; border-collapse:collapse;">${items}</table>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
