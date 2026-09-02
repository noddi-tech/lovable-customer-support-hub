/**
 * Third-party integration clients for edge functions.
 *
 * One folder per vendor, each exposing a thin client: transport, auth and
 * typed responses only. Business logic, Supabase access and org lookups stay
 * in the calling edge function.
 *
 * Prefer importing the specific vendor module (`../_shared/integrations/openai/index.ts`)
 * so functions only pull in what they use.
 */
export { IntegrationError, createHttpClient, requireEnv } from './http.ts';
export type { HttpClient, HttpClientOptions, RequestOptions } from './http.ts';

export { createOpenAIClient } from './openai/index.ts';
export { createSlackClient } from './slack/index.ts';
export { createSendGridClient } from './sendgrid/index.ts';
export { createMetaClient, META_GRAPH_VERSION } from './meta/index.ts';
export { createAircallClient } from './aircall/index.ts';
export { createNavioClient, NAVIO_API_BASE } from './navio/index.ts';
export { createGmailClient, exchangeGoogleAuthCode, refreshGoogleAccessToken } from './google/index.ts';
export { createResendClient } from './resend/index.ts';
export { createHelpScoutClient } from './helpscout/index.ts';
export { getSmsProvider } from './sms-registry.ts';
