// Shared PII sanitization for knowledge base entries

const SANITIZE_SYSTEM_PROMPT = `You are a PII redaction specialist. Your ONLY task is to find and replace personal identifiable information (PII) in the given text. You must return the EXACT same text with ONLY PII tokens replaced.

CRITICAL RULES:
- Do NOT rewrite, rephrase, expand, summarize, or alter the text in ANY way.
- Do NOT add new sentences or remove existing ones.
- Do NOT fix grammar, spelling, or formatting.
- ONLY replace PII tokens. Everything else must remain character-for-character identical.
- If the text contains NO PII, return it EXACTLY as-is, unchanged.

PII TO REPLACE:
- Real person names (first name, last name, or full name) → [customer name]
- Phone numbers (any format: +47 123 45 678, 91234567, etc.) → [phone number]
- Email addresses → [email address]
- Specific street addresses with house numbers (e.g. "Østeråsen 86", "Holtet 45") → [address]
- License plate numbers (e.g. AB12345, EC 94156, DN78901) → [license plate]
- Norwegian national ID numbers (11 digits) → [national ID]
- Credit card numbers → [credit card]

DO NOT REPLACE (keep as-is):
- City names and zip codes (Oslo, Bergen, 1169)
- Service names (dekkskift, vask, polering)
- Prices, dates, times, booking references
- Vehicle makes/models (Tesla Model Y, BMW i3)
- "Noddi" or "Hei" or common Norwegian greetings
- Generic words that happen to look like names but are common words

OUTPUT: Return the text with ONLY PII replaced. Nothing else changed.`;

export async function sanitizeTextForKnowledge(
  text: string,
  openaiApiKey: string,
): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SANITIZE_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`PII sanitization failed (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}
