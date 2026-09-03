/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

// Aircall Everywhere v2 SDK declarations
declare module "aircall-everywhere" {
  export interface AircallWorkspaceSettings {
    user: {
      email: string
      first_name: string
      last_name: string
      company_name: string
    }
    settings?: any
  }

  export default class AircallWorkspace {
    constructor(config: {
      domToLoadWorkspace: string
      onLogin?: (settings: AircallWorkspaceSettings) => void
      onLogout?: () => void
      integrationToLoad?: "zendesk" | "hubspot"
      size?: "big" | "small" | "auto"
      debug?: boolean
    })

    on(event: string, callback: (data: any) => void): void
    send(event: string, data: any, callback?: (success: boolean, response: any) => void): void
    isLoggedIn(callback: (isLoggedIn: boolean) => void): void
    removeListener(event: string, callback: (data: any) => void): void
  }
}

declare const __APP_COMMIT__: string
declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_PROJECT_ID?: string
  readonly VITE_APP_OPENPANEL_CLIENT_ID?: string
  readonly VITE_APP_OPENPANEL_API_URL?: string
  readonly VITE_APP_OPENPANEL_STUB?: string
  /** Alloy Faro receiver URL (default https://telemetry.noddi.co). */
  readonly VITE_APP_FARO_URL?: string
  /** Faro x-api-key from GSM `alloy_faro_app_key` (browser-safe). */
  readonly VITE_APP_FARO_API_KEY?: string
  readonly VITE_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
