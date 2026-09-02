import { createHttpClient, type HttpClient } from '../http.ts';

const VENDOR = 'google';

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  id_token?: string;
}

/** Exchanges an OAuth authorization code for tokens. */
export async function exchangeGoogleAuthCode(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const http = createHttpClient({ vendor: VENDOR, baseUrl: 'https://oauth2.googleapis.com' });
  return await http.request<GoogleTokenResponse>('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    rawBody: new URLSearchParams({
      code: args.code,
      client_id: args.clientId,
      client_secret: args.clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
}

/** Refreshes an OAuth access token. */
export async function refreshGoogleAccessToken(args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const http = createHttpClient({ vendor: VENDOR, baseUrl: 'https://oauth2.googleapis.com' });
  return await http.request<GoogleTokenResponse>('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    rawBody: new URLSearchParams({
      refresh_token: args.refreshToken,
      client_id: args.clientId,
      client_secret: args.clientSecret,
      grant_type: 'refresh_token',
    }).toString(),
  });
}

export interface GmailClient {
  http: HttpClient;
  listMessages(query: Record<string, string | number | undefined>): Promise<unknown>;
  getMessage(id: string, format?: 'full' | 'metadata' | 'raw' | 'minimal'): Promise<unknown>;
  getAttachment(messageId: string, attachmentId: string): Promise<{ data: string; size: number }>;
  /** Escape hatch for endpoints without a dedicated wrapper. */
  call<T = unknown>(
    path: string,
    init?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
    },
  ): Promise<T>;
}

/** Gmail REST client bound to a user's OAuth access token. */
export function createGmailClient(accessToken: string, userId = 'me'): GmailClient {
  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: `https://gmail.googleapis.com/gmail/v1/users/${userId}`,
    defaultHeaders: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeoutMs: 60_000,
    retries: 1,
  });

  const call = <T>(
    path: string,
    init?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
    },
  ) => http.request<T>(path, { method: init?.method ?? 'GET', body: init?.body, query: init?.query });

  return {
    http,
    call,
    listMessages: (query) => call('/messages', { query }),
    getMessage: (id, format = 'full') => call(`/messages/${id}`, { query: { format } }),
    getAttachment: (messageId, attachmentId) =>
      call(`/messages/${messageId}/attachments/${attachmentId}`),
  };
}
