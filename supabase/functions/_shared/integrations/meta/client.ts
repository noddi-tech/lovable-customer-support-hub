import { createHttpClient, type HttpClient } from '../http.ts';

const VENDOR = 'meta';

/** Default Graph API version used across the recruitment/lead integrations. */
export const META_GRAPH_VERSION = 'v19.0';

export interface MetaClient {
  http: HttpClient;
  version: string;
  /** GET a Graph node/edge with the access token attached. */
  get<T = unknown>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T>;
  post<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T>;
  del<T = unknown>(path: string): Promise<T>;
  debugToken(inputToken: string, appToken: string): Promise<unknown>;
}

export function createMetaClient(
  accessToken: string,
  version: string = META_GRAPH_VERSION,
): MetaClient {
  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: `https://graph.facebook.com/${version}`,
    timeoutMs: 30_000,
    retries: 1,
  });

  const withToken = (query?: Record<string, string | number | boolean | undefined>) => ({
    ...(query ?? {}),
    access_token: accessToken,
  });

  return {
    http,
    version,
    get: (path, query) => http.request(path, { method: 'GET', query: withToken(query) }),
    post: (path, body) =>
      http.request(path, {
        method: 'POST',
        query: { access_token: accessToken },
        body: body ?? {},
      }),
    del: (path) => http.request(path, { method: 'DELETE', query: withToken() }),
    debugToken: (inputToken, appToken) =>
      http.request('/debug_token', {
        method: 'GET',
        query: { input_token: inputToken, access_token: appToken },
      }),
  };
}
