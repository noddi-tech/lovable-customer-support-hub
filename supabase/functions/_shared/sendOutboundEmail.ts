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

// Render the special CTA-button placeholder {{cta_button:LABEL:URL_VAR}}.
// Produces email-safe HTML (bgcolor + inline style) that survives Outlook/Gmail
// and round-trips through the rich-text editor (since the placeholder itself
// is plain text in the stored template — the styled <a> is only generated at
// send time).
function renderCtaButtons(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{\{\s*cta_button\s*:\s*([^:}]+?)\s*:\s*([a-z_]+)\s*\}\}/gi,
    (_m, rawLabel: string, urlVar: string) => {
      const label = String(rawLabel).trim();
      const urlKey = String(urlVar).toLowerCase().trim();
      const url = values[urlKey] ?? '';
      const brand = values['brand_color'] || '#111827';
      const safeLabel = label
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const safeUrl = String(url).replace(/"/g, '&quot;');
      const safeBrand = String(brand).replace(/"/g, '&quot;');
      // Outlook needs bgcolor attr + inline background; mso conditional gives
      // VML button for Outlook 2007-2019.
      return [
        `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;">`,
        `<tr><td bgcolor="${safeBrand}" style="background:${safeBrand};border-radius:6px;">`,
        `<a href="${safeUrl}" target="_blank" rel="noopener" `,
        `style="display:inline-block;padding:12px 20px;background:${safeBrand};`,
        `color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;`,
        `font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1;">`,
        safeLabel,
        `</a></td></tr></table>`,
      ].join('');
    },
  );
}

// Substitute {{token}} in a template body. Unknown tokens replaced with ''
// (so recipients never see raw {{var}}). Logs unknown tokens for drift detection.
// Also expands the special {{cta_button:LABEL:URL_VAR}} placeholder first.
//
// `context` is optional but strongly encouraged for drift forensics — pass at
// minimum `{ caller, template_name, organization_id }` so the console.error
// fired for unresolved candidate-form tokens identifies the exact send path.
export function substituteVars(
  template: string,
  values: Record<string, string>,
  context?: { caller?: string; template_name?: string; organization_id?: string; [k: string]: unknown },
): string {
  const withButtons = renderCtaButtons(template, values);

  // Drift alert: if after CTA rendering the body still contains a raw
  // {{cta_button:...}} placeholder OR an unresolved candidate-form variable,
  // surface it in edge logs with enough context to investigate later.
  const ctaLeftover = /\{\{\s*cta_button\s*:[^}]+\}\}/i.test(withButtons);
  const formVarLeftover = /\{\{\s*(form_url|expires_at|brand_color)\s*\}\}/i.test(withButtons);
  if (ctaLeftover || formVarLeftover) {
    console.error('[substituteVars] candidate-form drift: unresolved tokens after CTA pass', {
      cta_button_leftover: ctaLeftover,
      form_var_leftover: formVarLeftover,
      caller: context?.caller ?? 'unknown',
      template_name: context?.template_name ?? null,
      organization_id: context?.organization_id ?? null,
      has_form_url: Object.prototype.hasOwnProperty.call(values, 'form_url'),
      values_keys: Object.keys(values).sort(),
    });
  }

  return withButtons.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, t) => {
    const k = t.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(values, k)) {
      return values[k] ?? '';
    }
    console.debug(`[substituteVars] unknown token: {{${k}}}`, {
      caller: context?.caller ?? 'unknown',
      template_name: context?.template_name ?? null,
    });
    return '';
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
