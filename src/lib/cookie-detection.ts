/**
 * Cookie Detection for Third-Party Cookie Support
 * 
 * Three-layer detection strategy:
 * 1. Known browser policies (Safari, Firefox, Brave)
 * 2. Feature detection (attempting to set/read test cookie)
 * 3. Fallback to SDK initialization attempt
 */

import { detectBrowser, BrowserType } from './browser-detection';

export interface CookieDetectionResult {
  supported: boolean;
  method: 'browser_policy' | 'feature_test' | 'unknown';
  browserType: BrowserType;
  details?: string;
}

/**
 * Check if browser blocks third-party cookies based on known policies
 */
function checkKnownBrowserPolicies(browserType: BrowserType): boolean | null {
  switch (browserType) {
    case 'safari':
      // Safari blocks third-party cookies by default (ITP)
      return false;
    
    case 'firefox':
      // Firefox with Enhanced Tracking Protection blocks third-party cookies
      return false;
    
    case 'brave':
      // Brave blocks third-party cookies by default
      return false;
    
    case 'chrome':
    case 'edge':
      // Chrome and Edge still allow third-party cookies by default (as of 2025)
      // but may have user/enterprise policy overrides
      return null; // needs feature test
    
    default:
      return null; // unknown, needs feature test
  }
}

/**
 * Attempt to detect third-party cookie support via feature test
 * Tests on same domain (not truly third-party, but a proxy)
 */
async function featureTestCookies(): Promise<boolean> {
  try {
    // Try to set a test cookie
    const testKey = '_aircall_cookie_test';
    const testValue = Date.now().toString();
    
    // Set cookie with SameSite=None and Secure (required for third-party)
    document.cookie = `${testKey}=${testValue}; SameSite=None; Secure; path=/`;
    
    // Try to read it back
    const cookies = document.cookie.split(';').map(c => c.trim());
    const found = cookies.some(c => c.startsWith(`${testKey}=`));
    
    // Clean up
    document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; path=/`;
    
    return found;
  } catch (error) {
    console.warn('Cookie feature test failed:', error);
    return false;
  }
}

/**
 * Detect if third-party cookies are supported
 */
export async function detectThirdPartyCookies(): Promise<CookieDetectionResult> {
  const browserInfo = await detectBrowser();
  
  // Layer 1: Check known browser policies
  const policyResult = checkKnownBrowserPolicies(browserInfo.type);
  
  if (policyResult === false) {
    return {
      supported: false,
      method: 'browser_policy',
      browserType: browserInfo.type,
      details: `${browserInfo.name} blocks third-party cookies by default`
    };
  }
  
  if (policyResult === true) {
    return {
      supported: true,
      method: 'browser_policy',
      browserType: browserInfo.type,
      details: `${browserInfo.name} allows third-party cookies by default`
    };
  }
  
  // Layer 2: Feature test (for browsers without known policy)
  const featureTestResult = await featureTestCookies();
  
  return {
    supported: featureTestResult,
    method: 'feature_test',
    browserType: browserInfo.type,
    details: featureTestResult 
      ? 'Cookies can be set with SameSite=None'
      : 'Cannot set cookies with SameSite=None (likely blocked by user/enterprise policy)'
  };
}

/**
 * Get instructions for enabling third-party cookies for a specific browser
 */
export function getCookieEnableInstructions(browserType: BrowserType): string[] {
  switch (browserType) {
    case 'chrome':
      return [
        'Open Chrome Settings',
        'Go to Privacy and Security → Cookies and other site data',
        'Select "Allow all cookies" or add phone.aircall.io to allowed sites',
        'Restart Chrome and try again'
      ];
    
    case 'edge':
      return [
        'Open Edge Settings',
        'Go to Cookies and site permissions → Manage and delete cookies',
        'Turn off "Block third-party cookies"',
        'Restart Edge and try again'
      ];
    
    case 'firefox':
      return [
        'Open Firefox Settings',
        'Go to Privacy & Security',
        'Set Enhanced Tracking Protection to "Standard"',
        'Restart Firefox and try again'
      ];
    
    case 'brave':
      return [
        'Click the Brave Shields icon in the address bar',
        'Set Shields to "Down" for this site',
        'Or go to Settings → Shields → Allow all cookies',
        'Refresh the page and try again'
      ];
    
    case 'safari':
      return [
        'Safari blocks third-party cookies by default',
        'This cannot be changed for security reasons',
        'Please use Chrome or Edge for phone functionality',
        'Or continue without phone integration'
      ];
    
    default:
      return [
        'Check your browser settings for cookie permissions',
        'Ensure third-party cookies are allowed',
        'Add phone.aircall.io to allowed sites if needed',
        'Restart your browser and try again'
      ];
  }
}
