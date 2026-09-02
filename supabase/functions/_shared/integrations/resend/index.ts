import { createHttpClient, requireEnv, type HttpClient } from '../http.ts';

const VENDOR = 'resend';

export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  [key: string]: unknown;
}

export interface ResendClient {
  http: HttpClient;
  sendEmail(payload: ResendEmailPayload): Promise<{ id: string }>;
}

export function createResendClient(apiKey?: string): ResendClient {
  const key = apiKey ?? requireEnv(VENDOR, 'RESEND_API_KEY');
  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: 'https://api.resend.com',
    defaultHeaders: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    http,
    sendEmail: (payload) => http.request<{ id: string }>('/emails', { method: 'POST', body: payload }),
  };
}
