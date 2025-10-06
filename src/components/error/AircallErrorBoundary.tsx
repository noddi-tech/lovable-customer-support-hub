/**
 * Aircall Error Boundary Component (Phase 4)
 * 
 * Catches and handles errors in the Aircall integration without crashing the entire app.
 * Provides recovery options for users.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AircallErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AircallErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ errorInfo });
    
    // Optional: Send to error tracking service
    // trackError('aircall_integration_error', { error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg p-6 space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Phone System Error</AlertTitle>
              <AlertDescription className="mt-2">
                {this.state.error?.message || 'An unexpected error occurred in the Aircall phone system'}
              </AlertDescription>
            </Alert>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-48">
                <div className="font-bold mb-2">Error Details:</div>
                <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <>
                    <div className="font-bold mt-3 mb-2">Component Stack:</div>
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This error occurred in the phone system integration. You can:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Try resetting the phone system (quick fix)</li>
                <li>Reload the entire page (recommended if reset doesn't work)</li>
                <li>Continue working without phone features temporarily</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              If this persists, contact support or check your browser settings.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
