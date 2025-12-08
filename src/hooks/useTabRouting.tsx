import { useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';

interface UseTabRoutingOptions {
  basePath: string;           // e.g., '/notifications'
  tabs: readonly string[];    // e.g., ['unread', 'mentions', 'calls']
  defaultTab: string;         // e.g., 'unread'
  preserveQueryParams?: boolean;
}

interface TabRoutingResult {
  currentTab: string;
  setTab: (tab: string) => void;
  isTabActive: (tab: string) => boolean;
  getTabPath: (tab: string) => string;
}

/**
 * A reusable hook for URL-synced tab routing.
 * Uses path segments for primary tabs (e.g., /notifications/unread)
 * and preserves query params across tab changes.
 */
export const useTabRouting = ({
  basePath,
  tabs,
  defaultTab,
  preserveQueryParams = true,
}: UseTabRoutingOptions): TabRoutingResult => {
  const params = useParams<{ tab?: string; filter?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get current tab from URL path segment
  const currentTab = useMemo(() => {
    // Try 'tab' param first, then 'filter' param (for interactions)
    const tabFromUrl = params.tab || params.filter;
    
    // Validate the tab is in our allowed list
    if (tabFromUrl && tabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    
    return defaultTab;
  }, [params.tab, params.filter, tabs, defaultTab]);

  // Build path for a specific tab
  const getTabPath = useCallback((tab: string): string => {
    const queryString = preserveQueryParams && searchParams.toString() 
      ? `?${searchParams.toString()}` 
      : '';
    return `${basePath}/${tab}${queryString}`;
  }, [basePath, preserveQueryParams, searchParams]);

  // Navigate to a specific tab
  const setTab = useCallback((tab: string) => {
    const path = getTabPath(tab);
    navigate(path, { replace: false }); // Don't replace to preserve browser history
  }, [navigate, getTabPath]);

  // Check if a specific tab is active
  const isTabActive = useCallback((tab: string): boolean => {
    return currentTab === tab;
  }, [currentTab]);

  return useMemo(() => ({
    currentTab,
    setTab,
    isTabActive,
    getTabPath,
  }), [currentTab, setTab, isTabActive, getTabPath]);
};

/**
 * Hook for status filter routing in interactions.
 * Uses path segments like /interactions/text/open
 */
export const useStatusRouting = () => {
  const params = useParams<{ filter?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentStatus = useMemo(() => {
    return params.filter || 'open';
  }, [params.filter]);

  const setStatus = useCallback((status: string) => {
    // Build new path: /interactions/text/[status]
    const pathParts = location.pathname.split('/');
    // Keep first 3 parts: ['', 'interactions', 'text']
    const basePath = pathParts.slice(0, 3).join('/');
    const newPath = `${basePath}/${status}`;
    
    // Preserve query params
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${newPath}?${queryString}` : newPath;
    
    navigate(fullPath, { replace: false });
  }, [navigate, location.pathname, searchParams]);

  return useMemo(() => ({
    currentStatus,
    setStatus,
  }), [currentStatus, setStatus]);
};
