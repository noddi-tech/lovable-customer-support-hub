/**
 * Shared HTTP foundation for third-party integration clients.
 *
 * Every vendor client under `_shared/integrations/<vendor>/` is built on this
 * helper so base URLs, auth headers, timeouts, retries and error shapes are
 * defined once instead of in every edge function.
 *
 * Rules for vendor clients:
 *  - thin: transport + auth + typed response only
 *  - no Supabase access, no org lookups, no business logic
 *  - secrets are read with `Deno.env.get` inside the client factory
 */

export class IntegrationError extends Error {
  readonly vendor: string;
  readonly status: number;
  readonly body: unknown;

  constructor(vendor: string, status: number, message: string, body?: unknown) {
    super(`[${vendor}] ${message}`);
    this.name = 'IntegrationError';
    this.vendor = vendor;
    this.status = status;
    this.body = body;
  }
}

export interface HttpClientOptions {
  /** Vendor slug used in errors and logs, e.g. "openai". */
  vendor: string;
  /** Base URL without a trailing slash, e.g. "https://api.openai.com/v1". */
  baseUrl: string;
  /** Headers merged into every request (auth, content type, ...). */
  defaultHeaders?: Record<string, string>;
  /** Per-request timeout. Defaults to 30s. */
  timeoutMs?: number;
  /** Retry attempts for network errors and 5xx/429. Defaults to 0. */
  retries?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** JSON-serialized unless `rawBody` is used. */
  body?: unknown;
  /** Send this body as-is (form data, text, ...). */
  rawBody?: BodyInit;
  timeoutMs?: number;
  retries?: number;
}

export interface HttpClient {
  vendor: string;
  baseUrl: string;
  /** Performs the request and parses JSON. Throws `IntegrationError` on !ok. */
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  /** Performs the request and returns the raw `Response` (no throwing). */
  raw(path: string, options?: RequestOptions): Promise<Response>;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: RequestOptions['query'],
): string {
  const url = /^https?:\/\//i.test(path)
    ? new URL(path)
    : new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const defaultTimeout = options.timeoutMs ?? 30_000;
  const defaultRetries = options.retries ?? 0;

  async function raw(path: string, req: RequestOptions = {}): Promise<Response> {
    const url = buildUrl(baseUrl, path, req.query);
    const attempts = (req.retries ?? defaultRetries) + 1;
    const timeoutMs = req.timeoutMs ?? defaultTimeout;

    const headers: Record<string, string> = {
      ...(options.defaultHeaders ?? {}),
      ...(req.headers ?? {}),
    };

    let body: BodyInit | undefined = req.rawBody;
    if (body === undefined && req.body !== undefined) {
      body = JSON.stringify(req.body);
      if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: req.method ?? (body === undefined ? 'GET' : 'POST'),
          headers,
          body,
          signal: controller.signal,
        });
        if (!response.ok && RETRYABLE_STATUS.has(response.status) && attempt < attempts - 1) {
          await sleep(250 * 2 ** attempt);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (attempt === attempts - 1) break;
        await sleep(250 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new IntegrationError(
      options.vendor,
      0,
      lastError instanceof Error ? lastError.message : 'Network request failed',
    );
  }

  async function request<T>(path: string, req: RequestOptions = {}): Promise<T> {
    const response = await raw(path, req);
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      throw new IntegrationError(
        options.vendor,
        response.status,
        `${response.status} ${response.statusText}: ${text.slice(0, 500)}`,
        parsed,
      );
    }
    return parsed as T;
  }

  return { vendor: options.vendor, baseUrl, request, raw };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads a required secret, throwing a consistent error when missing. */
export function requireEnv(vendor: string, name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new IntegrationError(vendor, 0, `Missing ${name} secret`);
  }
  return value;
}
