// Helpers for parsing Meta signed_request payloads.
// https://developers.facebook.com/docs/facebook-login/guides/advanced/oidc-token

function base64UrlDecode(input: string): Uint8Array {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToString(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

async function hmacSha256(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function parseMetaSignedRequest(
  signedRequest: string,
  appSecret: string
): Promise<{ user_id: string; algorithm?: string } | null> {
  if (!signedRequest || !signedRequest.includes('.')) return null;
  const [encSig, encPayload] = signedRequest.split('.');
  if (!encSig || !encPayload) return null;
  const expected = await hmacSha256(appSecret, encPayload);
  const provided = base64UrlDecode(encSig);
  if (!constantTimeEqual(expected, provided)) return null;
  try {
    const json = JSON.parse(bytesToString(base64UrlDecode(encPayload)));
    if (!json?.user_id) return null;
    return { user_id: String(json.user_id), algorithm: json.algorithm };
  } catch {
    return null;
  }
}
