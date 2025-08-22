import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface NetworkErrorHandlerOptions {
  showToast?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  suppressAnalyticsErrors?: boolean;
}

export const useNetworkErrorHandler = (options: NetworkErrorHandlerOptions = {}) => {
  const { toast } = useToast();
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const {
    showToast = true,
    retryAttempts = 3,
    retryDelay = 1000,
    suppressAnalyticsErrors = true
  } = options;

  const shouldSuppressError = useCallback((error: any): boolean => {
    const message = error?.message?.toLowerCase() || '';
    const url = error?.config?.url?.toLowerCase() || '';
    
    // Suppress analytics errors (blocked by ad blockers)
    if (suppressAnalyticsErrors && (
      message.includes('err_blocked_by_client') ||
      message.includes('network error') ||
      url.includes('rudderstack') ||
      url.includes('analytics') ||
      url.includes('tracking')
    )) {
      return true;
    }
    
    // Suppress common cross-origin iframe errors
    if (message.includes('cross-origin') || 
        message.includes('postmessage') ||
        url.includes('noddi.co')) {
      return true;
    }
    
    return false;
  }, [suppressAnalyticsErrors]);

  const handleNetworkError = useCallback(async <T>(
    operation: () => Promise<T>,
    operationId: string,
    fallback?: T
  ): Promise<T | null> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Clear any existing retry timeout
        const existingTimeout = retryTimeouts.current.get(operationId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          retryTimeouts.current.delete(operationId);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if we should suppress this error
        if (shouldSuppressError(error)) {
          logger.debug('Suppressed network error', { error, operationId }, 'NetworkErrorHandler');
          return fallback || null;
        }
        
        // Log the error
        logger.warn(`Network operation failed (attempt ${attempt}/${retryAttempts})`, {
          error: error.message,
          operationId,
          attempt
        }, 'NetworkErrorHandler');
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < retryAttempts) {
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, retryDelay * attempt);
            retryTimeouts.current.set(operationId, timeout);
          });
        }
      }
    }
    
    // All attempts failed
    if (!shouldSuppressError(lastError)) {
      logger.error(`Network operation failed after ${retryAttempts} attempts`, {
        error: lastError.message,
        operationId
      }, 'NetworkErrorHandler');
      
      if (showToast) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      }
    }
    
    return fallback || null;
  }, [retryAttempts, retryDelay, shouldSuppressError, showToast, toast]);

  const createResilientQuery = useCallback(<T>(
    queryFn: () => Promise<T>,
    queryId: string,
    fallback?: T
  ) => {
    return () => handleNetworkError(queryFn, queryId, fallback);
  }, [handleNetworkError]);

  // Cleanup timeouts on unmount
  const cleanup = useCallback(() => {
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
  }, []);

  return {
    handleNetworkError,
    createResilientQuery,
    cleanup
  };
};