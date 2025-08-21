import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface ErrorHandlerOptions {
  showToast?: boolean;
  title?: string;
  fallbackMessage?: string;
  component?: string;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      title = 'Error',
      fallbackMessage = 'An unexpected error occurred. Please try again.',
      component
    } = options;

    let errorMessage = fallbackMessage;
    let errorData: any = error;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message || fallbackMessage;
    }

    // Log the error
    logger.error('Application error occurred', errorData, component);

    // Show user-friendly toast notification
    if (showToast) {
      toast({
        title,
        description: errorMessage,
        variant: 'destructive',
      });
    }

    return errorMessage;
  }, [toast]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
};