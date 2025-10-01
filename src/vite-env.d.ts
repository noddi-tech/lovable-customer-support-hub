/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

// Aircall Everywhere SDK declarations
interface AircallPhoneSDK {
  on(event: string, callback: (data: any) => void): Promise<void>;
  send(command: string, data?: any): Promise<void>;
  isLoggedIn?: boolean;
}

interface Window {
  AircallPhone: AircallPhoneSDK;
}
