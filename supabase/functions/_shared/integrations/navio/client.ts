import { navioSourceHeaders } from "../../navio-source.ts"
import { createHttpClient, type HttpClient, type RequestOptions } from "../http.ts"

const VENDOR = "navio"

export const NAVIO_API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(
  /\/+$/,
  "",
)

export interface NavioResult<T> {
  ok: boolean
  status: number
  data: T | null
  error?: unknown
}

export interface NavioClient {
  http: HttpClient
  baseUrl: string
  /** Throws `IntegrationError` on a non-2xx response. */
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>
  /** Never throws — returns status + parsed body so proxies can pass it through. */
  call<T = unknown>(path: string, options?: RequestOptions): Promise<NavioResult<T>>
}

/**
 * Client for the Noddi/Navio backend API.
 *
 * Auth is the service token (`NODDI_API_TOKEN`); source identification headers
 * are attached automatically on every call.
 */
export function createNavioClient(token?: string): NavioClient {
  const apiToken = token ?? Deno.env.get("NODDI_API_TOKEN") ?? ""

  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: NAVIO_API_BASE,
    defaultHeaders: {
      Authorization: `Token ${apiToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...navioSourceHeaders(),
    },
    timeoutMs: 30_000,
    retries: 1,
  })

  return {
    http,
    baseUrl: NAVIO_API_BASE,
    request: (path, options) => http.request(path, options),
    async call<T>(path: string, options?: RequestOptions): Promise<NavioResult<T>> {
      const response = await http.raw(path, options)
      const text = await response.text()
      let body: unknown = null
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = { raw: text }
        }
      }
      if (!response.ok) {
        console.error(
          `[navio] ${options?.method ?? "GET"} ${path} -> ${response.status}`,
          text.slice(0, 500),
        )
        return { ok: false, status: response.status, data: null, error: body }
      }
      return { ok: true, status: response.status, data: (body ?? {}) as T }
    },
  }
}
