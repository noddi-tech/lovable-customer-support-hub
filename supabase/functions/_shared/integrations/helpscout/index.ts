import { createHttpClient, type HttpClient } from "../http.ts"

const VENDOR = "helpscout"

export interface HelpScoutClient {
  http: HttpClient
  /** Generic Mailbox API 2.0 call, e.g. `/v2/conversations`. */
  call<T = unknown>(
    path: string,
    init?: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
      body?: unknown
      query?: Record<string, string | number | boolean | undefined>
    },
  ): Promise<T>
}

/** Help Scout Mailbox API client bound to an OAuth access token. */
export function createHelpScoutClient(accessToken: string): HelpScoutClient {
  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: "https://api.helpscout.net",
    defaultHeaders: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeoutMs: 60_000,
    retries: 1,
  })

  return {
    http,
    call: (path, init) =>
      http.request(path, { method: init?.method ?? "GET", body: init?.body, query: init?.query }),
  }
}
