/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

// Aircall Everywhere v2 SDK declarations
declare module 'aircall-everywhere' {
  export interface AircallWorkspaceSettings {
    user: {
      email: string;
      first_name: string;
      last_name: string;
      company_name: string;
    };
    settings?: any;
  }

  export default class AircallWorkspace {
    constructor(config: {
      domToLoadWorkspace: string;
      onLogin?: (settings: AircallWorkspaceSettings) => void;
      onLogout?: () => void;
      integrationToLoad?: 'zendesk' | 'hubspot';
      size?: 'big' | 'small' | 'auto';
      debug?: boolean;
    });

    on(event: string, callback: (data: any) => void): void;
    send(
      event: string,
      data: any,
      callback?: (success: boolean, response: any) => void
    ): void;
    isLoggedIn(callback: (isLoggedIn: boolean) => void): void;
    removeListener(event: string, callback: (data: any) => void): void;
  }
}
