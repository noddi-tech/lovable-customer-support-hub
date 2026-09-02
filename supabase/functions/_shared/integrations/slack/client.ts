import { createHttpClient, type HttpClient } from '../http.ts';

const VENDOR = 'slack';
const BASE_URL = 'https://slack.com/api';

export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface SlackPostMessageArgs {
  channel: string;
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
  thread_ts?: string;
  unfurl_links?: boolean;
  [key: string]: unknown;
}

export interface SlackClient {
  http: HttpClient;
  postMessage(args: SlackPostMessageArgs): Promise<SlackApiResponse>;
  /** Opens (or reuses) a DM channel with a user and returns its channel id. */
  openConversation(userId: string): Promise<string | null>;
  /** Convenience: DM a user directly. */
  postDirectMessage(
    userId: string,
    args: Omit<SlackPostMessageArgs, 'channel'>,
  ): Promise<SlackApiResponse>;
  lookupUserByEmail(email: string): Promise<{ id: string; name?: string } | null>;
  /** Escape hatch for endpoints without a dedicated wrapper. */
  call<T = SlackApiResponse>(method: string, body?: unknown): Promise<T>;
}

/** Slack tokens are per-workspace, so the caller always passes the bot token. */
export function createSlackClient(botToken: string): SlackClient {
  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: BASE_URL,
    defaultHeaders: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    timeoutMs: 20_000,
    retries: 1,
  });

  const call = <T = SlackApiResponse>(method: string, body?: unknown) =>
    http.request<T>(`/${method}`, { method: 'POST', body: body ?? {} });

  const postMessage = (args: SlackPostMessageArgs) =>
    call<SlackApiResponse>('chat.postMessage', args);

  const openConversation = async (userId: string) => {
    const data = await call<SlackApiResponse & { channel?: { id: string } }>(
      'conversations.open',
      { users: userId },
    );
    return data.ok ? data.channel?.id ?? null : null;
  };

  return {
    http,
    call,
    postMessage,
    openConversation,
    postDirectMessage: async (userId, args) => {
      const channel = await openConversation(userId);
      if (!channel) return { ok: false, error: 'conversations_open_failed' };
      return await postMessage({ ...args, channel });
    },
    lookupUserByEmail: async (email) => {
      const data = await http.request<SlackApiResponse & { user?: { id: string; name?: string } }>(
        '/users.lookupByEmail',
        { method: 'GET', query: { email } },
      );
      return data.ok && data.user ? data.user : null;
    },
  };
}
