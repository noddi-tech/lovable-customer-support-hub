import { renderEmailLayout, htmlToPlainText } from '../_shared/email-layout.ts';
import { BRAND_THEMES } from '../_shared/brand-theme.ts';
import { getCompanyInfo, renderCompanyFooterHtml } from '../_shared/email-company-info.ts';

Deno.serve(async (req) => {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!;
  const { to } = await req.json().catch(() => ({ to: 'anders@noddi.no' }));
  const recipient = to || 'anders@noddi.no';
  const results: unknown[] = [];

  for (const key of ['noddi', 'dekkfix']) {
    const theme = BRAND_THEMES[key];
    const brandName = key === 'noddi' ? 'Noddi Support' : 'Dekkfix Support';
    const info = await getCompanyInfo(key);
    const html = renderEmailLayout({
      bodyHtml: `<p>Hei Anders,</p><p>Test av ny informativ footer for <strong>${theme.label}</strong> — juridisk navn, adresse, org.nr og kontaktinfo hentes fra Noddi-backend og caches i 6 timer.</p>`,
      signatureHtml: `<p style="margin:0;">Hilsen,<br /><strong>Anders Liland</strong><br />${brandName}</p>`,
      footerContent: renderCompanyFooterHtml(info, theme, brandName),
      brandName,
      brandTheme: theme,
      preheader: `Ny footer for ${theme.label}`,
    });

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: 'noreply@noddi.no', name: brandName },
        subject: `Test: ${theme.label} e-post med ny footer`,
        content: [
          { type: 'text/plain', value: htmlToPlainText(html) },
          { type: 'text/html', value: html },
        ],
      }),
    });
    results.push({ brand: key, status: res.status, info, body: res.ok ? 'sent' : await res.text() });
  }

  return new Response(JSON.stringify({ recipient, results }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
});
