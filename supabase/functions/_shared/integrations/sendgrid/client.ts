import { createHttpClient, type HttpClient, requireEnv } from "../http.ts"

const VENDOR = "sendgrid"
const BASE_URL = "https://api.sendgrid.com/v3"

export interface SendGridMailPayload {
  personalizations: Array<Record<string, unknown>>
  from: { email: string; name?: string }
  reply_to?: { email: string; name?: string }
  subject?: string
  /**
   * IMPORTANT: never append "; charset=utf-8" to `type` — SendGrid rejects it
   * with a 400. See the email encoding policy.
   */
  content: Array<{ type: string; value: string }>
  headers?: Record<string, string>
  attachments?: Array<Record<string, unknown>>
  custom_args?: Record<string, string>
  [key: string]: unknown
}

export interface SendGridSendResult {
  ok: boolean
  status: number
  /** `X-Message-Id` assigned by SendGrid, when the send succeeded. */
  messageId: string | null
  errorText?: string
}

export interface SendGridClient {
  http: HttpClient
  /** POST /v3/mail/send — does not throw, returns a result object. */
  send(payload: SendGridMailPayload): Promise<SendGridSendResult>
  /** Generic call for settings/webhook endpoints (throws on !ok). */
  call<T = unknown>(
    path: string,
    init?: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
  ): Promise<T>
}

export function createSendGridClient(apiKey?: string): SendGridClient {
  const key = apiKey ?? requireEnv(VENDOR, "SENDGRID_API_KEY")

  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: BASE_URL,
    defaultHeaders: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    timeoutMs: 30_000,
  })

  return {
    http,
    async send(payload) {
      const response = await http.raw("/mail/send", { method: "POST", body: payload })
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          messageId: null,
          errorText: await response.text(),
        }
      }
      return {
        ok: true,
        status: response.status,
        messageId: response.headers.get("x-message-id"),
      }
    },
    call: (path, init) => http.request(path, { method: init?.method ?? "GET", body: init?.body }),
  }
}
