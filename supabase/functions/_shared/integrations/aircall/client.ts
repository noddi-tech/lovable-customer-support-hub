import { createHttpClient, type HttpClient } from "../http.ts"

const VENDOR = "aircall"
const BASE_URL = "https://api.aircall.io/v1"

export interface AircallContactPhone {
  label: string
  value: string
}

export interface AircallContact {
  id: number
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone_numbers?: AircallContactPhone[]
  emails?: Array<{ label: string; value: string }>
}

export interface AircallTag {
  id: number
  name: string
  color?: string
}

export interface AircallClient {
  http: HttpClient
  getCompany(): Promise<{ company: { id: number; name: string; available: boolean } }>
  searchContacts(phoneNumber: string): Promise<AircallContact[]>
  createContact(contact: Partial<AircallContact>): Promise<{ contact: AircallContact }>
  updateContact(id: number, contact: Partial<AircallContact>): Promise<{ contact: AircallContact }>
  listTags(): Promise<AircallTag[]>
  tagCall(callId: string | number, tagIds: number[]): Promise<unknown>
  /** Escape hatch for endpoints without a dedicated wrapper. */
  call<T = unknown>(
    path: string,
    init?: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
      body?: unknown
      query?: Record<string, string | number | boolean | undefined>
    },
  ): Promise<T>
}

export function createAircallClient(apiId: string, apiToken: string): AircallClient {
  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: BASE_URL,
    defaultHeaders: {
      Authorization: `Basic ${btoa(`${apiId}:${apiToken}`)}`,
      "Content-Type": "application/json",
    },
    timeoutMs: 30_000,
    retries: 1,
  })

  const call = <T>(
    path: string,
    init?: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
      body?: unknown
      query?: Record<string, string | number | boolean | undefined>
    },
  ) =>
    http.request<T>(path, { method: init?.method ?? "GET", body: init?.body, query: init?.query })

  return {
    http,
    call,
    getCompany: () => call("/company"),
    searchContacts: async (phoneNumber) => {
      const data = await call<{ contacts?: AircallContact[] }>("/contacts/search", {
        query: { phone_number: phoneNumber },
      })
      return data.contacts ?? []
    },
    createContact: (contact) => call("/contacts", { method: "POST", body: contact }),
    updateContact: (id, contact) => call(`/contacts/${id}`, { method: "POST", body: contact }),
    listTags: async () => {
      const data = await call<{ tags?: AircallTag[] }>("/tags", { query: { per_page: 50 } })
      return data.tags ?? []
    },
    tagCall: (callId, tagIds) =>
      call(`/calls/${callId}/tags`, { method: "POST", body: { tags: tagIds } }),
  }
}
