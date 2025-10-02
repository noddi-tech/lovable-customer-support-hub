/**
 * Browser Detection Utility
 * 
 * Detects browser type and provides recommendations for Aircall compatibility.
 * Aircall officially supports Chrome and Chromium-based browsers.
 */

export type BrowserType = 'chrome' | 'brave' | 'edge' | 'safari' | 'firefox' | 'opera' | 'ie' | 'unknown';

export interface BrowserInfo {
  type: BrowserType;
  name: string;
  isSupported: boolean;
  requiresConfiguration: boolean;
  recommendation: string;
  detectionMethod: 'api' | 'useragent' | 'unknown';
}

/**
 * Detect if running in Brave browser
 */
export const isBrave = async (): Promise<boolean> => {
  // Brave exposes a navigator.brave API
  if ((navigator as any).brave) {
    try {
      return await (navigator as any).brave.isBrave();
    } catch (e) {
      return false;
    }
  }
  return false;
};

/**
 * Detect browser type with detailed information
 */
export const detectBrowser = async (): Promise<BrowserInfo> => {
  const ua = navigator.userAgent;
  
  // Check for Brave first (Chromium-based but needs special handling)
  const isBraveDetected = await isBrave();
  if (isBraveDetected) {
    return {
      type: 'brave',
      name: 'Brave',
      isSupported: true,
      requiresConfiguration: true,
      recommendation: 'Disable Brave Shields for this site to use Aircall',
      detectionMethod: 'api'
    };
  }
  
  // Chrome (must check before Edge since Edge contains "Chrome" in UA)
  if (ua.includes('Chrome') && !ua.includes('Edge') && !ua.includes('Edg')) {
    return {
      type: 'chrome',
      name: 'Google Chrome',
      isSupported: true,
      requiresConfiguration: false,
      recommendation: 'Fully supported',
      detectionMethod: 'useragent'
    };
  }
  
  // Edge (Chromium-based)
  if (ua.includes('Edg')) {
    return {
      type: 'edge',
      name: 'Microsoft Edge',
      isSupported: true,
      requiresConfiguration: false,
      recommendation: 'Supported, but Chrome is recommended if you experience issues',
      detectionMethod: 'useragent'
    };
  }
  
  // Safari
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return {
      type: 'safari',
      name: 'Safari',
      isSupported: false,
      requiresConfiguration: false,
      recommendation: 'Please use Google Chrome for Aircall',
      detectionMethod: 'useragent'
    };
  }
  
  // Firefox
  if (ua.includes('Firefox')) {
    return {
      type: 'firefox',
      name: 'Firefox',
      isSupported: false,
      requiresConfiguration: false,
      recommendation: 'Please use Google Chrome for Aircall',
      detectionMethod: 'useragent'
    };
  }
  
  // Opera
  if (ua.includes('OPR') || ua.includes('Opera')) {
    return {
      type: 'opera',
      name: 'Opera',
      isSupported: false,
      requiresConfiguration: false,
      recommendation: 'Please use Google Chrome for Aircall',
      detectionMethod: 'useragent'
    };
  }
  
  // Internet Explorer
  if (ua.includes('MSIE') || ua.includes('Trident/')) {
    return {
      type: 'ie',
      name: 'Internet Explorer',
      isSupported: false,
      requiresConfiguration: false,
      recommendation: 'Internet Explorer is not supported. Please use Google Chrome',
      detectionMethod: 'useragent'
    };
  }
  
  // Unknown browser
  return {
    type: 'unknown',
    name: 'Unknown Browser',
    isSupported: false,
    requiresConfiguration: false,
    recommendation: 'For best results, please use Google Chrome',
    detectionMethod: 'unknown'
  };
};

/**
 * Get user-friendly browser name
 */
export const getBrowserName = (type: BrowserType): string => {
  const names: Record<BrowserType, string> = {
    chrome: 'Google Chrome',
    brave: 'Brave',
    edge: 'Microsoft Edge',
    safari: 'Safari',
    firefox: 'Firefox',
    opera: 'Opera',
    ie: 'Internet Explorer',
    unknown: 'Unknown Browser'
  };
  return names[type];
};

/**
 * Check if browser is fully supported (no configuration needed)
 */
export const isFullySupported = (type: BrowserType): boolean => {
  return type === 'chrome';
};

/**
 * Check if browser requires configuration but can work
 */
export const requiresConfiguration = (type: BrowserType): boolean => {
  return type === 'brave' || type === 'edge';
};

/**
 * Check if browser is not supported at all
 */
export const isUnsupported = (type: BrowserType): boolean => {
  return ['safari', 'firefox', 'opera', 'ie', 'unknown'].includes(type);
};

/**
 * Get Chrome download URL
 */
export const getChromeDownloadUrl = (): string => {
  return 'https://www.google.com/chrome/';
};

/**
 * Get browser-specific instructions for Aircall
 */
export const getBrowserInstructions = (type: BrowserType): string[] => {
  const instructions: Record<BrowserType, string[]> = {
    chrome: [
      'Chrome is fully supported for Aircall',
      'If you experience issues, try disabling ad blockers for this site'
    ],
    brave: [
      'Click the Brave Lion icon in your address bar',
      'Toggle "Shields" OFF for this site',
      'Reload the page',
      'Alternatively, use Google Chrome'
    ],
    edge: [
      'Edge is supported, but Chrome is recommended',
      'If you experience issues, try Google Chrome instead',
      'Disable any ad blockers or privacy extensions for this site'
    ],
    safari: [
      'Aircall requires Google Chrome',
      'Please download and install Chrome',
      'Safari does not support all required features'
    ],
    firefox: [
      'Aircall requires Google Chrome',
      'Please download and install Chrome',
      'Firefox does not support all required features'
    ],
    opera: [
      'Aircall requires Google Chrome',
      'Please download and install Chrome'
    ],
    ie: [
      'Internet Explorer is not supported',
      'Please download and install Google Chrome'
    ],
    unknown: [
      'Your browser may not be fully supported',
      'For best results, please use Google Chrome'
    ]
  };
  
  return instructions[type] || instructions.unknown;
};
